import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { test } from 'node:test'
import { site } from '../src/data/site.ts'
import { projects } from '../src/data/projects.ts'

// Build current source: stale dist output must not serve as integration evidence.
const build = spawnSync('pnpm', ['build'], { cwd: new URL('../', import.meta.url), encoding: 'utf8' })
assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`)
const page = (path) => readFileSync(new URL(`../dist/${path}/index.html`, import.meta.url), 'utf8')
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const decode = (text) => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)]
  .map(([, name, value]) => [name, decode(value)]))
const routes = ['/', '/portfolio', '/contact', ...projects.map(({ id }) => `/projects/${id}`)]
const documentFor = (route) => page(route === '/' ? '.' : route.slice(1))
const dist = resolve(new URL('../dist/', import.meta.url).pathname)
const routePath = (path) => path === '/' ? path : path.replace(/\/$/, '')

function htmlRoutes(directory = dist) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return htmlRoutes(path)
    if (entry.name !== 'index.html') return []
    const relative = path.slice(dist.length).replace(/\/index\.html$/, '')
    return [relative || '/']
  })
}

function distFiles(directory = dist) {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(entry.parentPath, entry.name))
}

function localAsset(path) {
  const file = resolve(dist, `.${decodeURIComponent(path)}`)
  assert.ok(file.startsWith(`${dist}${sep}`), `asset must remain inside dist: ${path}`)
  assert.ok(existsSync(file), `built local asset must resolve: ${path}`)
  assert.ok(statSync(file).isFile(), `built local resource must be a file: ${path}`)
  return file
}

test('publishes exactly six current HTML routes with consistent canonical and social metadata', () => {
  assert.deepEqual(htmlRoutes().sort(), [...routes].sort())
  assert.ok(site.socialImage, 'a configurable validated raster default social image is required')
  const canonicalUrls = new Set()
  for (const route of routes) {
    const html = documentFor(route)
    const project = projects.find(({ id }) => route === `/projects/${id}`)
    const expected = project ?? site.pages[route === '/' ? 'home' : route.slice(1)]
    const image = project?.gallery[0] ?? site.socialImage
    const meta = Object.fromEntries([...html.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => {
      const item = attributes(tag)
      return [item.property ?? item.name, item.content]
    }))
    const canonicalTag = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => attributes(tag))
      .filter(({ rel }) => rel === 'canonical')
    assert.equal(canonicalTag.length, 1, `${route} needs one canonical URL`)
    const canonical = new URL(canonicalTag[0].href)
    assert.equal(canonical.origin, new URL(site.publicUrl).origin)
    assert.equal(canonical.href, new URL(route, site.publicUrl).href)
    assert.equal(canonical.search + canonical.hash, '')
    canonicalUrls.add(canonical.href)
    assert.ok(html.includes(`<title>${escape(expected.title)}</title>`))
    assert.equal(meta.description, expected.description)
    assert.equal(meta['og:title'], expected.title)
    assert.equal(meta['og:description'], expected.description)
    assert.equal(meta['og:site_name'], site.name)
    assert.equal(meta['og:url'], canonical.href)
    assert.equal(meta['og:type'], 'website')
    assert.equal(meta['og:image'], new URL(image.src, site.publicUrl).href)
    assert.equal(meta['og:image:alt'], image.alt)
    assert.equal(meta['og:image:width'], String(image.width))
    assert.equal(meta['og:image:height'], String(image.height))
    assert.equal(meta['twitter:card'], 'summary_large_image')
    assert.equal(meta['twitter:title'], expected.title)
    assert.equal(meta['twitter:description'], expected.description)
    assert.equal(meta['twitter:image'], meta['og:image'])
    assert.equal(meta['twitter:image:alt'], image.alt)
    localAsset(new URL(meta['og:image']).pathname)
  }
  assert.equal(canonicalUrls.size, routes.length)
})

test('all rendered local resources and internal navigation destinations exist', () => {
  for (const route of routes) {
    const html = documentFor(route)
    for (const [tag] of html.matchAll(/<(?:a|img|script|link)\b[^>]*>/g)) {
      const { href, src } = attributes(tag)
      const value = href ?? src
      if (!value || (!value.startsWith('/') && !value.startsWith('#'))) continue
      const url = new URL(value, new URL(route, site.publicUrl))
      assert.equal(url.origin, new URL(site.publicUrl).origin)
      if (tag.startsWith('<a')) {
        const destination = routePath(url.pathname)
        assert.ok(routes.includes(destination), `${route} links to missing route ${value}`)
        if (url.hash) {
          const ids = [...documentFor(destination).matchAll(/\bid="([^"]+)"/g)].map(([, id]) => decode(id))
          assert.ok(ids.includes(decodeURIComponent(url.hash.slice(1))), `${route} links to missing fragment ${value}`)
        }
      } else localAsset(url.pathname)
    }
    for (const [, cssPath] of html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)) {
      const css = readFileSync(localAsset(cssPath), 'utf8')
      for (const [, asset] of css.matchAll(/url\(["']?(\/[^)"']+)["']?\)/g)) localAsset(asset)
    }
  }
  const manifest = JSON.parse(readFileSync(localAsset('/site.webmanifest'), 'utf8'))
  for (const { src } of manifest.icons) localAsset(src)
})

test('every published image is referenced by the built site', () => {
  // SVG files are images themselves, so they never count as referrers.
  const textOutputs = distFiles().filter((file) => /\.(?:html|css|js|mjs|json|xml|txt|webmanifest)$/.test(file))
  const referrers = textOutputs.map((file) => readFileSync(file, 'utf8')).join('\n')
  // Markup may percent-encode file names (spaces, for instance), so accept either spelling.
  const isReferenced = (path) => [path, encodeURI(path)].some((spelling) => referrers.includes(spelling))
  const images = resolve(dist, 'images')
  const unreferenced = (existsSync(images) ? distFiles(images) : [])
    .map((file) => file.slice(dist.length).split(sep).join('/'))
    .filter((path) => !isReferenced(path))
    .sort()
  assert.deepEqual(unreferenced, [], 'delete these files from public/images or reference them from a page')
})

test('generated sitemap and robots use the configured origin and only the six HTML routes', () => {
  const index = readFileSync(localAsset('/sitemap-index.xml'), 'utf8')
  const indexLocations = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, value]) => decode(value))
  assert.deepEqual(indexLocations, [new URL('/sitemap-0.xml', site.publicUrl).href])
  const sitemap = readFileSync(localAsset('/sitemap-0.xml'), 'utf8')
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, value]) => decode(value))
  const canonicals = routes.map((route) => attributes(documentFor(route).match(/<link\b[^>]*rel="canonical"[^>]*>/)?.[0] ?? '').href)
  assert.deepEqual(locations.sort(), canonicals.sort())
  const robots = readFileSync(localAsset('/robots.txt'), 'utf8')
  assert.match(robots, /User-agent: \*\nAllow: \/\n/)
  assert.ok(robots.includes(`Sitemap: ${new URL('/sitemap-index.xml', site.publicUrl).href}`))
})

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

test('contact renders a polite inline status and preserves native form semantics', () => {
  const html = page('contact')
  const form = html.match(/<form\b[^>]*id="contact-form"[^>]*>/)?.[0]
  assert.ok(form?.includes('method="POST"'))
  assert.ok(form.includes('data-astro-reload'), 'native fallback must not become a ClientRouter POST')
  assert.ok(!form.includes('novalidate'), 'keep native required/email validation without JavaScript')
  const status = html.match(/<p\b[^>]*id="form-status"[^>]*>([\s\S]*?)<\/p>/)
  assert.ok(status, 'all request outcomes need a stable inline status region')
  assert.ok(status[0].includes('role="status"'))
  assert.ok(status[0].includes('aria-live="polite"'))
  assert.ok(status[0].includes('aria-atomic="true"'))
  assert.equal(status[1].trim(), '', 'do not announce success before a message was sent')
  assert.ok(!/\bhidden\b/.test(status[0]), 'an initially empty live region must remain in the accessibility tree')
  for (const name of ['name', 'email', 'subject', 'message']) {
    assert.ok(html.includes(`name="${name}"`))
    assert.ok(html.includes(`for="${name}"`))
  }
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

test('the homepage selects one real cover before the biography, rather than repeating the catalogue', () => {
  const html = page('.')
  const selection = html.match(/<section\b[^>]*id="projects"[^>]*>([\s\S]*?)<\/section>/)?.[1]
  assert.ok(selection, 'selected work needs the stable projects anchor')
  assert.ok(html.indexOf('id="projects"') < html.indexOf('id="about"'), 'work must precede biography')
  const selected = projects.find(({ featured }) => featured) ?? projects[0]
  const covers = [...selection.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)]
  assert.deepEqual(covers.map(([, src]) => src), [selected.gallery[0].src])
  assert.ok(selection.includes(`href="/projects/${selected.id}"`))
  assert.ok(selection.includes(`href="/portfolio"`), 'selection must lead to the full catalogue')
  assert.ok(selection.includes(escape(selected.title)))
  assert.ok(selection.includes(escape(selected.category)))
  assert.ok(selection.includes(escape(selected.description)))
  assert.ok(covers[0][0].includes('loading="eager"'))
  assert.ok(!selection.includes('data-reveal'), 'the first artwork and its controls must not start hidden')
})

test('catalogue cards display the case covers and keep essential credits outside the case link', () => {
  const html = page('portfolio')
  const entries = [...html.matchAll(/<article\b[^>]*data-project-entry="(\d+)"[^>]*>([\s\S]*?)<\/article>/g)]
  assert.deepEqual(entries.map(([, id]) => Number(id)), projects.map(({ id }) => id))
  for (const [index, [, , body]] of entries.entries()) {
    const project = projects[index]
    const cover = project.gallery[0]
    const caseLink = body.match(/<a\b[^>]*class="[^"]*project-card[^>]*>([\s\S]*?)<\/a>/)
    assert.ok(caseLink)
    assert.ok(caseLink[0].includes(`href="/projects/${project.id}"`))
    assert.ok(caseLink[1].includes(`src="${cover.src}"`))
    assert.ok(caseLink[1].includes(`alt="${escape(cover.alt)}"`))
    assert.ok(caseLink[1].includes(`width="${cover.width}"`))
    assert.ok(caseLink[1].includes(`height="${cover.height}"`))
    assert.ok(caseLink[1].includes(escape(project.title)))
    assert.ok(caseLink[1].includes(escape(project.category)))
    assert.ok(caseLink[1].includes(escape(project.description)))
    assert.ok(!caseLink[1].includes('<a '), 'do not nest creator links inside a clickable case')
    assert.ok(!caseLink[0].includes('data-reveal'), 'case navigation must be immediately available')
    const credit = body.slice(body.indexOf('</a>') + 4)
    assert.ok(credit.includes(escape(cover.authorName)))
    assert.ok(credit.includes(`href="${escape(cover.authorLink)}"`))
    assert.ok(credit.includes(`href="${escape(cover.sourceLink)}"`))
  }
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1)
  assert.ok(!html.includes('Portfolio Page'))
})

test('the compact hero retains readable anchor controls and its dark-ink visual contract', () => {
  const html = page('.')
  const hero = html.match(/<section\b[^>]*data-hero[^>]*>([\s\S]*?)<\/section>/)
  assert.ok(hero)
  assert.ok(!hero[0].includes('min-h-svh'), 'the introduction must not reserve a screen before artwork')
  const cta = hero[1].match(/<a\b[^>]*id="start"[^>]*>/)?.[0]
  assert.ok(cta?.includes(`href="${site.hero.buttonHref}"`), 'keep a native anchor fallback')
  assert.ok(!cta.includes('data-reveal'))
  const cssPaths = [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)].map(([, href]) => href)
  const css = [...cssPaths.map((path) => readFileSync(new URL(`../dist${path}`, import.meta.url), 'utf8')),
    ...[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(([, content]) => content)].join('\n')
  assert.match(css, /--color-ink:\s*#201b20/i)
  assert.match(css, /\.hero-heading[^}]*color:var\(--color-ink\)/)
  assert.ok(!css.includes('.has-motion #start'), 'the CTA must stay visible before motion initialization')
})
