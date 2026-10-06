import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { validateSite, validateProjects, signatureBranding } from '../src/data/validation.ts'
import { site } from '../src/data/site.ts'
import { projects } from '../src/data/projects.ts'

const publicDirectory = mkdtempSync(join(tmpdir(), 'portfolio-content-'))
mkdirSync(join(publicDirectory, 'images'))
writeFileSync(join(publicDirectory, 'images', 'sample.png'), Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1cAAAAASUVORK5CYII=', 'base64'))
after(() => rmSync(publicDirectory, { recursive: true, force: true }))
const options = { publicDirectory }
const image = {
  src: '/images/sample.png', alt: 'A small monochrome image', width: 1, height: 1,
  caption: 'Test image', authorName: 'Test creator', authorLink: 'https://example.org/creator',
  sourceName: 'Test collection', sourceLink: 'https://example.org/image', size: 'small',
}
const project = {
  id: 1, title: 'Test case', category: 'Curated demo',
  description: 'A test collection, not an artist commission.', featured: true,
  disclosure: 'Curated reference collection — test demo attribution.',
  gallery: [image], editorial: { context: 'Test context', process: 'Test curation', outcome: 'Test result' },
}
const validSite = () => {
  const copy = structuredClone(site)
  copy.logo = { src: image.src, alt: 'Test identity mark', width: 1, height: 1 }
  copy.about.image = { ...copy.logo, alt: 'Sample portrait placeholder' }
  copy.socialImage = { ...copy.logo, alt: 'Sample social preview artwork' }
  return copy
}
const changeProject = (mutate) => {
  const copy = structuredClone(project)
  mutate(copy)
  return [copy]
}

test('validates shipped content and preserves the existing numeric routes', () => {
  assert.deepEqual(projects.map(({ id }) => id), [1, 2, 3])
  assert.doesNotThrow(() => validateSite(site))
  assert.doesNotThrow(() => validateProjects(projects))
  if (site.contact.mode === 'demo') assert.equal(site.contact.endpoint, undefined)
  assert.ok(projects.every(({ category }) => /demo/i.test(category)))
  assert.equal(new Set(projects.map(({ gallery }) => gallery[0].src)).size, 3)
  assert.ok(projects[0].gallery.length >= 3)
})

test('accepts validated site data, optional stats and custom branding', () => {
  const input = validSite()
  input.name = 'Ana Rivera Studio'
  delete input.about.stats
  const result = validateSite(input, options)
  assert.equal(result.name, input.name)
  assert.equal(signatureBranding(result).useDemoArtwork, false)
  assert.equal(signatureBranding(result).label, input.name)
  assert.equal(signatureBranding(site).useDemoArtwork, true)
})

test('rejects missing identity, copy and malformed language', () => {
  for (const mutate of [
    (s) => { s.name = '' },
    (s) => { s.hero.title = '' },
    (s) => { s.about.paragraphs = [] },
    (s) => { s.lang = 'not a language' },
  ]) {
    const input = validSite()
    mutate(input)
    assert.throws(() => validateSite(input, options), /content/i)
  }
})

test('requires configured selection and catalogue copy', () => {
  assert.throws(() => validateSite({ ...validSite(), portfolio: undefined }, options), /portfolio/)
})

test('requires a validated local raster social preview with descriptive alternative text', () => {
  for (const socialImage of [undefined, { ...image, src: '/images/missing.png' },
    { ...image, width: 20 }, { ...image, alt: 'image' }]) {
    assert.throws(() => validateSite({ ...validSite(), socialImage }, options), /socialImage/)
  }
  writeFileSync(join(publicDirectory, 'images', 'vector.png'), '<svg viewBox="0 0 1 1"></svg>')
  assert.throws(() => validateSite({ ...validSite(), socialImage: { ...image, src: '/images/vector.png' } }, options), /socialImage/)
  assert.deepEqual(validateSite(validSite(), options).socialImage, validSite().socialImage)
})

test('requires a root HTTPS public URL, rejecting credentials and query strings', () => {
  for (const publicUrl of ['javascript:alert(1)', 'http://example.org', 'https://user:pass@example.org',
    'https://example.org/subpath', 'https://example.org?query=1', 'https://example.org/#hash']) {
    assert.throws(() => validateSite({ ...validSite(), publicUrl }, options), /publicUrl/)
  }
  assert.equal(validateSite({ ...validSite(), publicUrl: 'https://artist.example/' }, options).publicUrl,
    'https://artist.example/')
})

test('rejects unsafe navigation and social destinations', () => {
  const input = validSite()
  input.navigation[0].href = '//untrusted.example'
  assert.throws(() => validateSite(input, options), /href/)
  input.navigation[0].href = '/portfolio'
  input.socials[0].url = 'javascript:alert(1)'
  assert.throws(() => validateSite(input, options), /url/)
})

test('accepts explicit live Formspree configuration but rejects ambiguous destinations', () => {
  const input = validSite()
  input.contact = { ...input.contact, mode: 'live', endpoint: 'https://formspree.io/f/abc123' }
  assert.equal(validateSite(input, options).contact.mode, 'live')
  for (const endpoint of [undefined, '', 'https://evil.example/f/abc123',
    'https://formspree.io.evil.example/f/abc123', 'https://formspree.io/f/TU_ID',
    'https://formspree.io/f/abc123?query=1', 'http://formspree.io/f/abc123']) {
    assert.throws(() => validateSite({ ...input, contact: { ...input.contact, endpoint } }, options), /endpoint/)
  }
  assert.throws(() => validateSite({ ...input, contact: { ...input.contact, mode: 'demo' } }, options), /endpoint/)
})

test('accepts a complete project and rejects empty collections', () => {
  assert.deepEqual(validateProjects([project], options), [project])
  assert.throws(() => validateProjects([], options), /projects/)
})

test('uses the first validated gallery image as cover without an unrelated illustration key', () => {
  const input = changeProject((p) => { delete p.image })
  assert.doesNotThrow(() => validateProjects(input, options))
  assert.equal(validateProjects(input, options)[0].gallery[0].src, image.src)
})

test('rejects duplicate, nonnumeric and incompatible project identifiers', () => {
  assert.throws(() => validateProjects([project, structuredClone(project)], options), /id/)
  for (const id of [0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateProjects(changeProject((p) => { p.id = id }), options), /id/)
  }
})

test('rejects a missing summary or unlabelled featured flag', () => {
  for (const mutate of [(p) => { p.description = '' },
    (p) => { p.featured = 'yes' }]) {
    assert.throws(() => validateProjects(changeProject(mutate), options), /content/i)
  }
})

test('rejects empty galleries and missing editorial sections', () => {
  assert.throws(() => validateProjects(changeProject((p) => { p.gallery = [] }), options), /gallery/)
  assert.throws(() => validateProjects(changeProject((p) => { p.editorial.process = '' }), options), /process/)
})

test('rejects absent, meaningless, invalid or dimension-mismatched media metadata', () => {
  for (const mutate of [
    (m) => { m.alt = '' }, (m) => { m.alt = 'image' }, (m) => { m.width = 0 },
    (m) => { m.height = -1 }, (m) => { m.width = 10 }, (m) => { m.size = 'huge' },
    (m) => { m.caption = '' }, (m) => { m.authorName = '' },
    (m) => { m.sourceLink = 'javascript:alert(1)' },
  ]) {
    assert.throws(() => validateProjects(changeProject((p) => mutate(p.gallery[0])), options), /content/i)
  }
})

test('accepts an optional focal point for cropped covers; absent stays valid', () => {
  assert.equal(validateProjects([project], options)[0].gallery[0].focalPoint, undefined)
  for (const focalPoint of ['50% 20%', '0% 0%', '100% 100%', '12.5% 87.25%', '50% 0%', '10.0% 90.50%']) {
    const [validated] = validateProjects(changeProject((p) => { p.gallery[0].focalPoint = focalPoint }), options)
    assert.equal(validated.gallery[0].focalPoint, focalPoint)
  }
})

test('rejects focal points that are keywords, other units, out of range or carry extra tokens', () => {
  for (const focalPoint of ['center', 'top left', '50%', '120% 10%', '10% 100.5%', '-5% 10%', '+5% 10%',
    '10px 10px', '50% 20px', '50 20', '50% 20% 5%', '50%  20%', ' 50% 20%', '50% 20% ', '50%\t20%', '50%,20%',
    '.5% 20%', '5.% 20%', '1e1% 10%', '', ' ', 50, null, true, {}, ['50% 20%']]) {
    assert.throws(() => validateProjects(changeProject((p) => { p.gallery[0].focalPoint = focalPoint }), options),
      /focalPoint/, `must reject ${JSON.stringify(focalPoint)}`)
  }
})

test('the third cover keeps the ghost head inside its 4:3 crop', () => {
  const cover = projects.find(({ id }) => id === 3).gallery[0]
  assert.ok(cover.focalPoint, 'this near-square illustration needs a focal point to survive a 4:3 crop')
  // object-position y places the crop window: its top sits at y% of the rows a 4:3 crop discards.
  const hiddenRows = cover.height - cover.width * 3 / 4
  const windowTop = Number(cover.focalPoint.split(' ')[1].slice(0, -1)) / 100 * hiddenRows
  // First inked row of halloween-9862664_1280.png, measured from its alpha channel: the head nearly touches the top edge.
  const headTop = 20
  assert.ok(windowTop <= headTop, `the crop starts at row ${windowTop.toFixed(0)} but the head begins at row ${headTop}`)
})

test('rejects missing local files, directory assets, traversal and remote image URLs', () => {
  for (const src of ['/images/missing.png', '/images', '/../outside.png', '/images/%2e%2e/sample.png',
    '/images/sample.png?cache=1', '//remote.example/image.png', 'https://example.org/image.png']) {
    assert.throws(() => validateProjects(changeProject((p) => { p.gallery[0].src = src }), options), /src/)
  }
})

test('checks biography and logo assets too, and rejects invalid stats', () => {
  const input = validSite()
  input.logo.src = '/missing.png'
  assert.throws(() => validateSite(input, options), /src/)
  input.logo.src = image.src
  input.about.image.width = 20
  assert.throws(() => validateSite(input, options), /dimensions/)
  input.about.image.width = 1
  input.about.stats = [{ value: -1, suffix: '+', label: 'Projects' }]
  assert.throws(() => validateSite(input, options), /stats/)
})

test('requires project disclosure so original work can replace the demo without false framing', () => {
  assert.throws(() => validateProjects(changeProject((p) => { delete p.disclosure }), options), /disclosure/)
  assert.throws(() => validateProjects(changeProject((p) => { p.disclosure = ' ' }), options), /disclosure/)
  const original = changeProject((p) => { p.disclosure = 'Original personal work by the portfolio owner.' })
  assert.equal(validateProjects(original, options)[0].disclosure, original[0].disclosure)
})
