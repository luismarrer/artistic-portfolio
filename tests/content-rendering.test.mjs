import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { site } from '../src/data/site.ts'
import { projects } from '../src/data/projects.ts'

// Build current source: stale dist output must not serve as integration evidence.
const build = spawnSync('pnpm', ['build'], { cwd: new URL('../', import.meta.url), encoding: 'utf8' })
assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`)
const page = (path) => readFileSync(new URL(`../dist/${path}/index.html`, import.meta.url), 'utf8')
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

test('renders configured identity, biography, navigation and page language', () => {
  const html = page('.')
  assert.ok(html.includes(`<html lang="${site.lang}">`))
  assert.ok(html.includes(escape(site.name)))
  assert.ok(html.includes(escape(site.about.heading)))
  assert.ok(html.includes(escape(site.about.paragraphs[0])))
  if (!site.about.stats?.length) assert.ok(!html.includes('data-count='), 'empty optional statistics must not render')
  for (const stat of site.about.stats ?? []) assert.ok(html.includes(`data-count="${stat.value}"`))
  for (const link of site.navigation) assert.ok(html.includes(`href="${link.href}"`))
  assert.ok(html.includes(escape(site.footer.description)))
  assert.ok(html.includes(escape(site.socials[0].name)))
})

test('renders validated project summaries on their existing numeric routes', () => {
  for (const project of projects) {
    const html = page(`projects/${project.id}`)
    assert.ok(html.includes(escape(project.title)))
    assert.ok(html.includes(escape(project.description)))
  }
})

test('renders the configured contact mode without a fallback owner destination', () => {
  const html = page('contact')
  assert.ok(html.includes(`data-contact-mode="${site.contact.mode}"`))
  if (site.contact.mode === 'demo') {
    assert.ok(html.includes(escape(site.contact.demoMessage)))
    assert.ok(html.includes('<fieldset disabled'))
    assert.ok(!html.includes('action="https://formspree.io'))
  } else {
    assert.ok(html.includes(`action="${escape(site.contact.endpoint)}"`))
    assert.ok(!html.includes('<fieldset disabled'))
  }
  assert.ok(!html.includes('mpwynwav'))
})

test('each case renders only its own credited gallery with an intrinsic-size cover', () => {
  const renderedGalleries = []
  for (const project of projects) {
    const html = page(`projects/${project.id}`)
    const images = [...html.matchAll(/<img\b[^>]*>/g)]
      .map(([tag]) => ({ tag, src: tag.match(/\bsrc="([^"]+)"/)?.[1] }))
      .filter(({ src }) => src?.startsWith('/images/project-page/'))
    assert.deepEqual(images.map(({ src }) => src), project.gallery.map(({ src }) => src),
      `${project.title} must not substitute a shared fallback gallery`)
    const captions = [...html.matchAll(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/g)]
    assert.equal(captions.length, project.gallery.length)
    assert.ok(html.includes('data-project-cover'), 'the first artwork must be the case cover')
    for (const [index, image] of project.gallery.entries()) {
      assert.ok(images[index].tag.includes(`width="${image.width}"`))
      assert.ok(images[index].tag.includes(`height="${image.height}"`))
      assert.ok(images[index].tag.includes(`alt="${escape(image.alt)}"`))
      assert.ok(captions[index][1].includes(escape(image.caption)))
      assert.ok(captions[index][1].includes(escape(image.authorName)))
      assert.ok(captions[index][1].includes(`href="${escape(image.authorLink)}"`))
      assert.ok(captions[index][1].includes(`href="${escape(image.sourceLink)}"`))
      assert.ok(captions[index][1].includes(escape(image.sourceName)))
      assert.ok(!/\b(hidden|opacity-0|group-hover:opacity)/.test(captions[index][0]),
        'captions and attribution cannot depend on hover')
    }
    assert.ok(images[0].tag.includes('loading="eager"'), 'the case cover must not be lazy-loaded')
    renderedGalleries.push(images.map(({ src }) => src).join('|'))
  }
  assert.equal(new Set(renderedGalleries).size, projects.length)
  assert.ok(projects[0].gallery.length >= 3, 'the reference case needs three relevant images')
})

test('case notes describe curation truthfully and provide complete onward navigation', () => {
  for (const [index, project] of projects.entries()) {
    const html = page(`projects/${project.id}`)
    assert.equal(typeof project.disclosure, 'string', 'disclosure belongs in the configurable project source')
    assert.ok(html.includes(escape(project.disclosure)), 'configured disclosure must render visibly')
    assert.ok(html.includes('Curated reference collection'), 'current demo framing must be visible')
    for (const copy of Object.values(project.editorial)) assert.ok(html.includes(escape(copy)))
    assert.ok(html.includes('Selection process'))
    assert.ok(html.includes('Presentation outcome'))
    const navigation = html.match(/<nav\b[^>]*aria-label="Project navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
    assert.ok(navigation, 'case navigation must have an accessible landmark label')
    for (const href of ['/', '/portfolio', '/contact']) assert.ok(navigation.includes(`href="${href}"`))
    const nextProject = projects[(index + 1) % projects.length]
    assert.ok(navigation.includes(`href="/projects/${nextProject.id}"`))
    assert.ok(navigation.includes(escape(nextProject.title)))
    assert.ok(navigation.includes('rel="next"'))
  }
})

test('the catalogue no longer appends an unrelated fallback artwork collection', () => {
  const html = page('portfolio')
  assert.ok(!html.includes('istockphoto-473012660'))
  assert.ok(!html.includes('photo-1507238691740'))
  assert.ok(!html.includes('See all my work'))
})
