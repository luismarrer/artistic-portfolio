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

test('the hero retains readable anchor controls and its dark-ink visual contract', () => {
  const html = page('.')
  const hero = html.match(/<section\b[^>]*data-hero[^>]*>([\s\S]*?)<\/section>/)
  assert.ok(hero)
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

// ── Paper and print system ──────────────────────────────────────────────────
// Rendered and built-CSS assertions stay in this module: it owns the one `pnpm build` of the current
// source, and a second building test file would race on `dist`.
const read = (url) => readFileSync(url, 'utf8')
const sourceRoot = new URL('../src/', import.meta.url)
const caseRoutes = projects.map(({ id }) => `/projects/${id}`)

function astroSources(directory = sourceRoot) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(entry.isDirectory() ? `${entry.name}/` : entry.name, directory)
    if (entry.isDirectory()) return astroSources(child)
    return entry.name.endsWith('.astro')
      ? [{ path: child.pathname.slice(sourceRoot.pathname.length), text: read(child) }]
      : []
  })
}

// Everything a visitor's browser applies to a route: linked CSS plus Astro's scoped <style> blocks.
const sheets = new Map()
function stylesheetFor(route) {
  if (!sheets.has(route)) {
    const html = documentFor(route)
    const linked = [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]
      .map(([, href]) => read(new URL(`../dist${href}`, import.meta.url)))
    const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(([, content]) => content)
    sheets.set(route, [...linked, ...inline].join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/@(?:layer|import|charset)\b[^{};]*;/g, ''))
  }
  return sheets.get(route)
}

// Minified-CSS reader: the merged declarations of every rule that lists `selector`, ignoring Astro's scope attribute.
const simplify = (selector) => selector.replace(/\[data-astro-cid-[\w-]+\]/g, '')
  .replace(/::(after|before)\b/g, ':$1') // the minifier prints the single-colon form
  .replace(/\s*([>+~])\s*/g, '$1').replace(/\s+/g, ' ').trim()
function declarations(css, selector) {
  const merged = {}
  const wanted = simplify(selector)
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors.split(',').some((candidate) => simplify(candidate) === wanted)) continue
    for (const declaration of body.split(';')) {
      const colon = declaration.indexOf(':')
      if (colon > 0) merged[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim()
    }
  }
  return merged
}

const classesOf = (tag = '') => (tag.match(/\bclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean)
// The HTML is compressed, so the opening tag of an element sits directly before its first text.
// Only the body counts: case pages repeat their description in <meta> tags.
function tagBefore(html, text) {
  const body = html.slice(html.indexOf('<body'))
  const index = body.indexOf(escape(text))
  assert.ok(index > 0, `the page must render: ${text}`)
  return body.slice(body.lastIndexOf('<', index), index)
}
const squash = (value = '') => value.replace(/\s+/g, '').replace(/(^|[^\d])0\./g, '$1.')
const hex = (value = '') => ({ brown: '#a52a2a', white: '#ffffff' }[value.toLowerCase()] ?? value.toLowerCase())
  .replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, '#$1$1$2$2$3$3')
const luminance = (color) => {
  const [r, g, b] = color.slice(1).match(/../g).map((part) => {
    const channel = parseInt(part, 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}
function topLevelItems(value = '') {
  const items = []
  let depth = 0
  let current = ''
  for (const character of value) {
    if (character === '(') depth++
    if (character === ')') depth--
    if (character === ',' && depth === 0) { items.push(current.trim()); current = '' } else current += character
  }
  return [...items, current.trim()].filter(Boolean)
}

// The :root tokens a visitor receives, with a reader for colour tokens that must resolve to a plain hex value.
function rootTokens() {
  const tokens = declarations(stylesheetFor('/'), ':root')
  const color = (name) => {
    assert.ok(tokens[name], `${name} must be a :root token`)
    const value = hex(tokens[name])
    assert.match(value, /^#[0-9a-f]{6}$/, `${name} must resolve to a plain colour, not ${tokens[name]}`)
    return value
  }
  return { tokens, color }
}

test('design tokens: paper, print and type scales are declared once in :root and shared', () => {
  const { tokens, color } = rootTokens()
  for (const name of ['--color-paper', '--color-peach', '--color-ink', '--color-muted', '--color-accent',
    '--color-accent-hover', '--color-on-accent', '--color-surface', '--color-rule']) color(name)
  // The grid line is the accent red at 20%, and must reach the browser as that translucent colour:
  // a minifier once rewrote a derived colour-mix() into a solid fallback.
  const gridLine = hex(tokens['--color-grid-line']).match(/^#([0-9a-f]{6})([0-9a-f]{2})$/)
  assert.ok(gridLine, `--color-grid-line must be a translucent colour, not ${tokens['--color-grid-line']}`)
  assert.ok(Math.abs(parseInt(gridLine[2], 16) / 255 - 0.2) < 0.01, 'the grid line is faint (20% alpha)')
  assert.equal(`#${gridLine[1]}`, color('--color-accent'), 'the grid line is the accent red')
  assert.equal(squash(tokens['--grid-size']), '35px', 'hero and grid tail must share one tile size')
  assert.ok(topLevelItems(tokens['--shadow-print']).length >= 2, 'a tight contact shadow plus a soft lift')
  assert.equal(squash(tokens['--radius-print']), '2px')
  assert.equal(squash(tokens['--print-mount']), 'clamp(6px,.9vw,12px)')
  assert.equal(squash(tokens['--text-body']), '1.125rem')
  assert.equal(squash(tokens['--leading-body']), '1.6')
  assert.equal(squash(tokens['--text-small']), '1rem')
  assert.equal(squash(tokens['--text-label']), '.9375rem')
  assert.equal(squash(tokens['--measure']), '64ch')
})

test('palette pairs used for text and field borders keep WCAG AA contrast on paper and surface', () => {
  const { color } = rootTokens()
  const pairs = [
    ['--color-ink', '--color-paper', 7],
    ['--color-muted', '--color-paper', 4.5],
    ['--color-muted', '--color-surface', 4.5],
    ['--color-accent', '--color-paper', 4.5],
    ['--color-on-accent', '--color-accent', 4.5],
    ['--color-on-accent', '--color-accent-hover', 4.5],
    ['--color-rule', '--color-paper', 3],
    ['--color-rule', '--color-surface', 3],
  ]
  for (const [foreground, background, minimum] of pairs) {
    const ratio = contrast(color(foreground), color(background))
    assert.ok(ratio >= minimum, `${foreground} on ${background} is ${ratio.toFixed(2)}:1, needs ${minimum}:1`)
  }
})

test('every route sits on the same paper: no hard-coded page fills or Tailwind gray palette', () => {
  for (const { path, text } of astroSources()) {
    assert.ok(!/\bbg-(?:white|black|gray-\d+|slate-\d+)\b|\bbg-\[#(?:fe|ff)eaca\]/i.test(text),
      `${path} paints its own fill instead of inheriting paper`)
    assert.ok(!/\b(?:text|border|decoration|ring|divide)-(?:gray|slate|zinc|neutral|stone)-\d+\b|\btext-(?:white|black)\b/.test(text),
      `${path} uses the Tailwind gray palette instead of the ink and muted tokens`)
    assert.ok(!/background(?:-color)?:\s*(?:white|#fff(?:fff)?)\b/i.test(text), `${path} styles a white fill`)
    if (!path.startsWith('components/svgs/')) {
      assert.ok(!/#(?:b22222|a52a2a|6b1520|201b20|feeaca|ffeaca)\b/i.test(text),
        `${path} hard-codes a palette value that has a token`)
    }
  }
  for (const route of routes) {
    const html = documentFor(route)
    for (const [, value] of html.matchAll(/\bclass="([^"]*)"/g)) {
      assert.ok(!/\bbg-(?:white|\[#(?:fe|ff)eaca\])/i.test(value), `${route} renders a hard-coded fill: ${value}`)
    }
    assert.ok(!/<body\b[^>]*class="[^"]*\b(?:bg-white|text-gray-900)\b/.test(html), `${route} body must use the paper token`)
  }
  const body = declarations(stylesheetFor('/'), 'body')
  assert.equal(body['background-color'] ?? body.background, 'var(--color-paper)')
  assert.equal(body.color, 'var(--color-ink)')
})

test('the hero grid continues behind the first work as an inert layer that fades out', () => {
  const html = documentFor('/')
  const css = stylesheetFor('/')
  const hero = html.match(/<section\b[^>]*data-hero[^>]*>/)?.[0]
  assert.ok(hero)
  assert.ok(!classesOf(hero).includes('overflow-hidden'), 'the grid tail extends below the hero, so it cannot clip vertically')
  assert.ok(classesOf(hero).includes('overflow-x-clip'), 'horizontal overflow stays contained')
  const wash = declarations(css, '.grid-background')
  assert.match(wash['background-image'], /var\(--color-paper\)(?: 100%)?\)$/, 'the wash must end exactly in paper at the hero bottom')
  assert.ok(!/inset/.test(wash['box-shadow'] ?? ''), 'no inset shadow may draw an edge at the hero bottom')
  assert.match(wash['background-position'], /^0 100%,\s*0 100%/, 'rows are anchored to the bottom so the tail continues in phase')
  const tail = declarations(css, '.grid-background::after')
  assert.equal(tail.content, '""', 'a pseudo-element without generated content never renders')
  assert.equal(tail.position, 'absolute', 'out of flow: the hero layout box that the ink trail measures cannot change')
  assert.equal(tail['pointer-events'], 'none')
  assert.equal(tail.top, '100%', 'the tail starts exactly where the hero ends')
  assert.match(tail.height, /^clamp\(8rem,\s*20vw,\s*16rem\)$/)
  assert.ok((tail.left === '0' && tail.right === '0') || tail['inset-inline'] === '0',
    'the tail is pinned to both hero edges and never wider')
  assert.match(tail['mask-image'] ?? tail['-webkit-mask-image'] ?? '', /linear-gradient\(/, 'a vertical mask fades the grid out')
  const heroSource = read(new URL('../src/components/sections/Hero.astro', import.meta.url))
  assert.ok(/(?<!-webkit-)mask-image/.test(heroSource) && heroSource.includes('-webkit-mask-image'),
    'declare both mask-image and -webkit-mask-image in source')
  const projectsTag = html.match(/<section\b[^>]*id="projects"[^>]*>/)?.[0]
  assert.ok(projectsTag && !/\bbg-/.test(projectsTag), '#projects must not paint a fill')
  const section = declarations(css, '.portfolio-section')
  assert.ok(!Object.keys(section).some((property) => property.startsWith('background')),
    '#projects must stay transparent so the grid shows through')
  const selection = declarations(css, '.portfolio-selection')
  assert.equal(selection.position, 'relative')
  assert.ok(Number(selection['z-index']) >= 1, 'the featured print and its text paint above the grid tail')
  assert.ok(Number(selection['z-index']) < Number(declarations(css, '.ink-trail')['z-index']), 'the ink trail stays above')
})

// Owner-pinned design rule (AGENTS.md): on entry the hero grid covers the visitor's whole screen, as the production
// site always has. Do not weaken, invert or delete this test to fit a redesign; only the owner can lift the rule.
test('on entry the hero grid fills the whole screen, top to bottom and edge to edge', () => {
  const html = documentFor('/')
  const css = stylesheetFor('/')
  const hero = html.match(/<section\b[^>]*data-hero[^>]*>/)?.[0]
  assert.ok(hero)
  const heroClasses = classesOf(hero)
  assert.ok(heroClasses.includes('grid-background'), 'the hero itself paints the grid')
  assert.ok(heroClasses.includes('min-h-svh'), 'the hero is at least one full screen tall, never just its content')
  assert.equal(declarations(css, '.min-h-svh')['min-height'], '100svh')
  assert.ok(!heroClasses.some((name) => /^(?:max-[wh]-|h-|container$|m[trblxyse]?-)/.test(name)),
    `nothing may cap, offset or narrow the hero: ${heroClasses.join(' ')}`)
  const heroRule = declarations(css, '.hero')
  assert.ok(!Object.keys(heroRule).some((property) => /^(?:max-|height$|min-height$|margin)/.test(property)),
    'the hero rule may not override the full-screen height or add margins')
  // Nothing in flow sits above the grid: the header floats over it and the hero opens <main>.
  assert.match(html, /<main\b[^>]*>\s*<section\b[^>]*data-hero/)
  assert.ok(classesOf(html.match(/<header\b[^>]*>/)?.[0]).includes('absolute'), 'the header floats over the grid')
})

// Part of the owner-pinned arrow rule (AGENTS.md): the 8px bounce keeps the room it has on the production site.
test('the scroll hint sits in the hero at bottom-6, the same room as on production', () => {
  const html = documentFor('/')
  const wrapper = html.match(/<div\b[^>]*>(?=\s*<svg\b[^>]*\bjs-scroll-hint\b)/)?.[0]
  assert.ok(wrapper, 'the hero renders the scroll hint arrow inside its own wrapper')
  const classes = classesOf(wrapper)
  assert.ok(classes.includes('absolute'), 'the wrapper is positioned against the bottom of the hero')
  assert.ok(classes.includes('bottom-6'), 'production room for the 8px bounce')
})

test('artwork is mounted as a print on the home, catalogue and case pages', () => {
  const css = stylesheetFor('/')
  const print = declarations(css, '.print')
  assert.equal(print.padding, 'var(--print-mount)')
  assert.equal(print['border-radius'], 'var(--radius-print)')
  assert.equal(print['box-shadow'], 'var(--shadow-print)')
  assert.equal(print['background-color'] ?? print.background, 'var(--color-surface)')
  assert.equal(declarations(css, '.print>img').display, 'block')
  for (const route of ['/', '/portfolio', ...caseRoutes]) {
    const html = documentFor(route)
    const artwork = [...html.matchAll(/(<div\b[^>]*>)?(<img\b[^>]*\bsrc="\/images\/[^"]*"[^>]*>)/g)]
    assert.ok(artwork.length > 0, `${route} renders artwork`)
    for (const [, wrapper, image] of artwork) {
      assert.ok(classesOf(image).includes('print') || classesOf(wrapper).includes('print'),
        `${route} artwork must sit in a mounted print: ${image}`)
      assert.ok(!classesOf(image).some((name) => name.startsWith('rounded')), `${route} artwork has web-card corners`)
    }
  }
  const home = documentFor('/')
  const portrait = home.match(new RegExp(`<img\\b[^>]*src="${site.about.image.src}"[^>]*>`))?.[0]
  assert.ok(portrait)
  assert.ok(classesOf(portrait).includes('print'), 'the portrait is a mounted print too')
  assert.ok(classesOf(portrait).includes('-rotate-3'), 'the portrait keeps its slight static tilt')
  assert.ok(!/style="[^"]*border/.test(portrait), 'the mount comes from the print, not an inline border')
  for (const route of ['/', '/portfolio']) {
    for (const [, wrapper] of documentFor(route).matchAll(/(<div\b[^>]*>)<img\b[^>]*\bsrc="\/images\/project-page\//g)) {
      assert.ok(classesOf(wrapper).includes('project-artwork'), 'catalogue covers keep the .project-artwork hook')
    }
  }
})

test('catalogue and featured covers are a stable 4:3, while gallery artwork keeps its natural ratio', () => {
  for (const route of ['/', '/portfolio']) {
    const cover = declarations(stylesheetFor(route), '.project-artwork img')
    assert.match(cover['aspect-ratio'] ?? '', /^4\s*\/\s*3$/, `${route} covers need a 4:3 ratio`)
    assert.equal(cover['object-fit'], 'cover')
    assert.match(cover['object-position'] ?? '', /^var\(--focal,\s*(?:center|50%(?: 50%)?)\)$/,
      `${route} crops around the cover focal point, centered by default`)
    assert.equal(cover.display, 'block')
  }
  for (const route of caseRoutes) {
    for (const [tag] of documentFor(route).matchAll(/<img\b[^>]*\bsrc="\/images\/project-page\/[^"]*"[^>]*>/g)) {
      const classes = classesOf(tag)
      assert.ok(classes.includes('h-auto') && classes.includes('w-full'), `${route} gallery image needs its natural height: ${tag}`)
      assert.ok(!classes.some((name) => /^(?:object-|aspect-)/.test(name)), `${route} must not crop gallery artwork: ${tag}`)
    }
  }
})

test('a cover focal point reaches CSS as --focal on cropped covers only', () => {
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const featured = projects.find(({ featured }) => featured) ?? projects[0]
  assert.ok(projects.some(({ gallery }) => gallery[0].focalPoint), 'the demo data must exercise a focal point')
  for (const [route, shown] of [['/portfolio', projects], ['/', [featured]]]) {
    const html = documentFor(route)
    for (const { gallery: [cover] } of shown) {
      const tag = html.match(new RegExp(`<img\\b[^>]*\\bsrc="${escapeRegExp(cover.src)}"[^>]*>`))?.[0]
      assert.ok(tag, `${route} renders the cover ${cover.src}`)
      const style = tag.match(/\bstyle="([^"]*)"/)?.[1]
      if (cover.focalPoint) {
        assert.equal(squash(style), squash(`--focal: ${cover.focalPoint}`), `${route} cover must carry its focal point`)
      } else {
        assert.equal(style, undefined, `${route} cover without a focal point must stay untouched: ${tag}`)
      }
    }
  }
  // Case galleries are never cropped, so even a cover with a focal point renders its gallery image untouched.
  for (const route of caseRoutes) {
    for (const [tag] of documentFor(route).matchAll(/<img\b[^>]*\bsrc="\/images\/project-page\/[^"]*"[^>]*>/g)) {
      assert.ok(!tag.includes('--focal') && !/\bstyle=/.test(tag), `${route} gallery image must not carry a focal point: ${tag}`)
    }
  }
})

test('type scale: body copy, small copy, captions and sentence-case labels use the documented tokens', () => {
  const css = stylesheetFor('/')
  const copy = declarations(css, '.copy')
  assert.equal(copy['font-size'], 'var(--text-body)')
  assert.equal(copy['line-height'], 'var(--leading-body)')
  assert.equal(copy['max-width'], 'var(--measure)')
  const small = declarations(css, '.copy-small')
  assert.equal(small['font-size'], 'var(--text-small)')
  assert.equal(small['line-height'], 'var(--leading-body)')
  assert.equal(small['max-width'], 'var(--measure)')
  const caption = declarations(css, '.caption')
  assert.equal(caption['font-size'], 'var(--text-label)')
  assert.equal(caption.color, 'var(--color-muted)')
  const label = declarations(css, '.label')
  assert.equal(label['font-size'], 'var(--text-label)')
  assert.equal(label['font-weight'], '600')
  assert.equal(label.color, 'var(--color-muted)')
  assert.ok(['normal', '0', '0px', undefined].includes(label['letter-spacing']), 'labels use normal tracking')
  assert.ok([undefined, 'none'].includes(label['text-transform']), 'labels are sentence case')

  const home = documentFor('/')
  for (const paragraph of [...site.about.paragraphs, site.about.description, site.portfolio.selectedDescription]) {
    assert.ok(classesOf(tagBefore(home, paragraph)).includes('copy'), `body copy needs .copy: ${paragraph}`)
  }
  const featured = projects.find(({ featured }) => featured) ?? projects[0]
  assert.ok(classesOf(tagBefore(home, featured.description)).includes('copy'), 'the featured summary is body copy')
  assert.ok(classesOf(tagBefore(home, site.footer.description)).includes('copy-small'))
  assert.ok(classesOf(tagBefore(home, featured.category)).includes('label'))
  const portfolio = documentFor('/portfolio')
  assert.ok(classesOf(tagBefore(portfolio, site.portfolio.catalogueDescription)).includes('copy'))
  for (const project of projects) {
    assert.ok(classesOf(tagBefore(portfolio, project.description)).includes('copy-small'), 'card summaries use the small scale')
    assert.ok(classesOf(tagBefore(portfolio, project.category)).includes('label'))
  }
  const creditSize = declarations(stylesheetFor('/portfolio'), '.cover-credit')['font-size']
  assert.ok([undefined, 'var(--text-label)'].includes(creditSize), 'a scoped rule must not shrink credits below the label size')
  assert.ok(classesOf(portfolio.match(/<p\b[^>]*class="[^"]*\bcover-credit\b[^"]*"[^>]*>/)?.[0]).includes('caption'))
  assert.ok(classesOf(tagBefore(documentFor('/contact'), site.contact.subtitle)).includes('copy'))
  for (const route of caseRoutes) {
    const html = documentFor(route)
    const project = projects.find(({ id }) => route === `/projects/${id}`)
    assert.ok(classesOf(tagBefore(html, project.category)).includes('label'), 'the case eyebrow is a sentence-case label')
    assert.ok(classesOf(tagBefore(html, project.description)).includes('copy'))
    assert.ok(classesOf(tagBefore(html, project.disclosure)).includes('copy-small'))
    for (const note of Object.values(project.editorial)) assert.ok(classesOf(tagBefore(html, note)).includes('copy'))
    assert.ok(classesOf(html.match(/<p\b[^>]*class="([^"]*)"[^>]*>By <a\b/)?.[0]).includes('caption'), 'credits keep a readable size')
  }
  for (const { path, text } of astroSources()) {
    assert.ok(!/\buppercase\b|\btracking-(?:wide|wider|widest)\b|\btext-xs\b/.test(text), `${path} must not use all-caps labels or tiny type`)
  }
  assert.ok(home.includes('text-[clamp(2.75rem,7.5vw,4.5rem)]'), 'the hero h1 keeps the documented fluid size')
})

test('Mansalva headings never rely on synthetic bold', () => {
  const heading = declarations(stylesheetFor('/'), 'h1')
  assert.match(heading['font-family'], /Mansalva/)
  assert.equal(heading['font-weight'], '400', 'only the Regular face ships')
  for (const route of routes) {
    for (const [tag] of documentFor(route).matchAll(/<h[12]\b[^>]*>/g)) {
      assert.ok(!classesOf(tag).some((name) => /^font-(?:medium|semibold|bold|extrabold|black)$/.test(name)),
        `${route} heading asks for a weight Mansalva does not have: ${tag}`)
    }
  }
})

test('the footer sits on paper, closed by a drawn decorative rule instead of a grey border', () => {
  for (const route of routes) {
    const html = documentFor(route)
    const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)
    assert.ok(footer, `${route} needs a footer`)
    const opening = footer[0].match(/^<footer\b[^>]*>/)[0]
    assert.ok(!/\bbg-/.test(opening), `${route} footer must not paint a fill`)
    assert.ok(!/\bborder-(?:t\b|gray)|<hr\b/.test(footer[0]), `${route} footer still draws a grey border`)
    const rule = footer[1].match(/<svg\b[^>]*>/)?.[0]
    assert.ok(rule && footer[1].indexOf(rule) < footer[1].indexOf('<section'), `${route} footer opens with a drawn rule`)
    assert.ok(rule.includes('aria-hidden="true"') && rule.includes('focusable="false"') && rule.includes('preserveAspectRatio="none"'))
    assert.ok(classesOf(rule).includes('w-full') && classesOf(rule).some((name) => /^h-(?:2|2\.5|3)$/.test(name)),
      'the rule spans the content width and is about 8-12px tall')
    assert.ok(footer[1].includes('signature-block'), 'the footer keeps its signature')
    assert.ok(footer[1].includes(escape(site.footer.description)))
    assert.ok(html.includes('</footer></main>'), 'the footer stays the last direct child of main')
  }
})

test('contact fields sit on the surface with rule borders and a visible accent focus ring', () => {
  const html = documentFor('/contact')
  for (const name of ['name', 'email', 'subject', 'message']) {
    const field = html.match(new RegExp(`<(?:input|textarea)\\b[^>]*\\bid="${name}"[^>]*>`))?.[0]
    assert.ok(field, `#${name} must render`)
    assert.ok(classesOf(field).includes('field'), `#${name} uses the shared field style`)
    assert.ok(!/\boutline-none\b|\bfocus:ring|\bborder-gray|\brounded-lg\b/.test(field), `#${name} suppresses its own focus ring`)
  }
  const css = stylesheetFor('/contact')
  const field = declarations(css, '.field')
  assert.equal(field['background-color'] ?? field.background, 'var(--color-surface)')
  assert.match(field.border ?? '', /^1px solid var\(--color-rule\)$/)
  assert.match(field['border-radius'] ?? '', /^(?:\.25rem|0\.25rem|4px|var\(--radius-print\))$/, 'a small radius')
  for (const target of ['a', 'button', 'input', 'select', 'textarea']) {
    const focus = declarations(css, `${target}:focus-visible`)
    assert.equal(focus.outline, '3px solid var(--color-accent)', `${target}:focus-visible must show an accent outline`)
  }
})

test('artwork and cards use no hover motion', () => {
  for (const route of ['/', '/portfolio', ...caseRoutes]) {
    const html = documentFor(route)
    assert.ok(!/\b(?:group-)?hover:-?(?:rotate|scale)/.test(html), `${route} rotates or scales an element on hover`)
    for (const [, wrapper = '', image] of html.matchAll(/(<div\b[^>]*>)?(<img\b[^>]*\bsrc="\/images\/[^"]*"[^>]*>)/g)) {
      assert.ok(!/\bhover:|\btransition-transform\b/.test(wrapper + image), `${route} artwork reacts to hover: ${wrapper}${image}`)
    }
    const css = stylesheetFor(route)
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (/:hover/.test(selectors) && /project-|\.print|artwork/.test(selectors)) {
        assert.ok(!/transform|scale|rotate|translate/.test(body), `${route} hover rule moves artwork: ${selectors}`)
      }
    }
  }
})

// ── Motion hooks in the built output ────────────────────────────────────────
// Every innermost rule of the built CSS with a selector that mentions `needle`: just those selectors (split at
// top-level commas) and the rule body. The minifier merges rules that share declarations, so only the selectors
// that mention the hook may be judged against it.
function rulesMentioning(css, needle) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(([, selectors, body]) => ({
      selectors: topLevelItems(selectors).map(simplify).filter((selector) => selector.includes(needle)),
      body,
    }))
    .filter(({ selectors }) => selectors.length > 0)
}

test('the signature pen is hidden by default and no stylesheet shows it again', () => {
  const css = stylesheetFor('/')
  const rules = rulesMentioning(css, 'signature-pen')
  assert.ok(rules.length > 0, 'the pen needs a rule that hides it')
  for (const { selectors, body } of rules) {
    assert.ok(selectors.every((selector) => !selector.includes('has-motion')),
      `hiding the pen cannot depend on motion being enabled: ${selectors.join(', ')}`)
    assert.match(body, /(?:^|;)opacity:\s*0(?:;|$)/, `a rule on the pen may only hide it, never show it: ${body}`)
  }
  assert.equal(declarations(css, '.js-signature .signature-pen').opacity, '0',
    'without JavaScript, or with reduced motion, the pen is not drawn at the signature origin')
})

test('hero words are gated by opacity only, so clearing the wipe never hides them again', () => {
  for (const { body } of rulesMentioning(stylesheetFor('/'), 'js-hero-title')) {
    assert.ok(!/clip-path/.test(body), 'a clip-path rule on the words would return when GSAP clears the inline wipe')
  }
})

test('the start button can hand focus to the work section without a ring around a container', () => {
  for (const route of ['/', '/portfolio']) {
    const tag = documentFor(route).match(/<section\b[^>]*id="projects"[^>]*>/)?.[0]
    assert.ok(tag, `${route} renders #projects`)
    assert.equal(attributes(tag).tabindex, '-1', `${route}: #projects must be a programmatic focus target`)
  }
  const suppress = rulesMentioning(stylesheetFor('/'), 'tabindex').filter(({ body }) => /outline:\s*none/.test(body))
  assert.ok(suppress.length > 0, 'a programmatic focus target is a container: it draws no outline of its own')
  for (const { selectors } of suppress) {
    for (const selector of selectors) {
      const excluded = (selector.match(/:not\(([^)]*)\)/)?.[1] ?? '').split(',').map((name) => name.trim())
      for (const control of ['a', 'button', 'input', 'select', 'textarea']) {
        assert.ok(excluded.includes(control), `real controls keep their focus ring (${control}): ${selector}`)
      }
    }
  }
})

// ── Motion that answers navigation: cover morph and drawn annotation ─────────
// Astro compiles `transition:name` into a scope attribute on the element plus one inline rule that names it:
//   <div data-astro-transition-scope="astro-<hash>-<n>"> … [data-astro-transition-scope="astro-<hash>-<n>"] { view-transition-name: <name>; }
// so a name is read back by joining the two. The attribute alone never carries it.
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function namedElements(html) {
  const declared = new Map([...html.matchAll(/\[data-astro-transition-scope="([^"]+)"\]\s*\{\s*view-transition-name:\s*([^;}\s]+)/g)]
    .map(([, scope, name]) => [scope, name]))
  return [...html.matchAll(/<\w+\b[^>]*\bdata-astro-transition-scope="([^"]+)"[^>]*>/g)]
    .map(([tag, scope]) => ({ tag, scope, name: declared.get(scope) }))
}

// The opening tag of the mounted print that wraps a cover image, or undefined when that cover is not rendered.
const coverPrint = (html, cover) =>
  html.match(new RegExp(`(<div\\b[^>]*>)<img\\b[^>]*\\bsrc="${escapeRegExp(cover.src)}"[^>]*></div>`))?.[1]

// The inner text of every `@media` block whose query mentions `needle`, with nested braces balanced.
function mediaBodies(css, needle) {
  const bodies = []
  for (const match of css.matchAll(/@media[^{]*\{/g)) {
    if (!match[0].includes(needle)) continue
    const start = match.index + match[0].length
    let depth = 1
    let end = start
    while (depth > 0 && end < css.length) {
      const character = css[end++]
      if (character === '{') depth++
      else if (character === '}') depth--
    }
    bodies.push(css.slice(start, end - 1))
  }
  return bodies
}

const seconds = (value = '') => (value.endsWith('ms') ? parseFloat(value) / 1000 : parseFloat(value))
// A deceleration leaves fast and arrives slowly: both control points sit above the diagonal.
function decelerates(easing) {
  if (easing === 'ease-out') return true
  const curve = easing.match(/^cubic-bezier\(([^)]*)\)$/)?.[1].split(',').map(Number)
  if (curve?.length !== 4) return false
  const [x1, y1, x2, y2] = curve
  return y1 > x1 && y2 > x2
}
// Resolve `var(--token)` against the :root tokens a visitor receives.
const resolveTokens = (value = '') => value.replace(/var\((--[\w-]+)\)/g, (match, name) => rootTokens().tokens[name] ?? match)

test('each cover print has one view-transition name, shared by its catalogue card, the home selection and its case page', () => {
  const featured = projects.find(({ featured }) => featured) ?? projects[0]
  const owners = new Map()
  for (const project of projects) {
    const cover = project.gallery[0]
    const found = {}
    for (const route of ['/portfolio', `/projects/${project.id}`, ...(project === featured ? ['/'] : [])]) {
      const html = documentFor(route)
      const print = coverPrint(html, cover)
      assert.ok(print, `${route} renders the ${project.title} cover inside a wrapper`)
      assert.ok(classesOf(print).includes('print'), `${route}: the name sits on the mounted print, so the mount travels with the image`)
      const scope = attributes(print)['data-astro-transition-scope']
      assert.ok(scope, `${route}: the ${project.title} cover print is a view-transition element`)
      found[route] = namedElements(html).find((element) => element.scope === scope)?.name
      assert.ok(found[route], `${route}: the scope ${scope} resolves to a view-transition-name`)
    }
    const [name, ...others] = Object.values(found)
    assert.ok(others.every((other) => other === name), `${project.title} must keep one name across pages: ${JSON.stringify(found)}`)
    assert.ok(!owners.has(name), `${project.title} reuses ${name}, already the name of project ${owners.get(name)}`)
    owners.set(name, project.id)
  }
})

test('view-transition names are unique on every page, and only cover prints take part in the morph', () => {
  const expected = { '/': 1, '/portfolio': projects.length, '/contact': 0, ...Object.fromEntries(caseRoutes.map((route) => [route, 1])) }
  for (const route of routes) {
    const named = namedElements(documentFor(route))
    assert.equal(named.length, expected[route], `${route} should name ${expected[route]} element(s), not ${named.length}`)
    assert.ok(named.every(({ name }) => name), `${route}: every scope needs a view-transition-name rule`)
    assert.equal(new Set(named.map(({ name }) => name)).size, named.length, `${route} repeats a view-transition name`)
    for (const { tag } of named) assert.ok(classesOf(tag).includes('print'), `${route}: only mounted prints are named: ${tag}`)
  }
})

test('the case cover morphs in from its card instead of running its own entrance, while other prints still settle', () => {
  for (const route of caseRoutes) {
    const project = projects.find(({ id }) => route === `/projects/${id}`)
    // The footer signature is a <figure> too: only the gallery section counts.
    const gallery = documentFor(route).match(/<section\b[^>]*\bdata-project-gallery\b[^>]*>([\s\S]*?)<\/section>/)?.[1]
    assert.ok(gallery, `${route} renders its gallery`)
    const figures = [...gallery.matchAll(/<figure\b[^>]*>/g)].map(([tag]) => tag)
    assert.equal(figures.length, project.gallery.length)
    const [cover, ...rest] = figures
    assert.ok(cover.includes('data-project-cover'), `${route}: the first figure is the case cover`)
    assert.ok(!cover.includes('data-reveal'), `${route}: an entrance would offset the cover while it morphs: ${cover}`)
    for (const tag of rest) {
      assert.ok(!tag.includes('data-project-cover'))
      assert.equal(attributes(tag)['data-reveal'], 'card', `${route}: the other gallery prints keep their calm settle`)
    }
  }
})

test('the cover morph shares one view-transition class, fits both snapshots to the moving group and settles calmly', () => {
  for (const route of ['/', '/portfolio', ...caseRoutes]) {
    // transition:animate="initial" keeps the browser's own morph. The router's default fade is 180 ms, which would
    // finish long before the group does and leave the new snapshot alone for the rest of the move.
    assert.ok(!/::view-transition-(?:old|new)\(project-cover-/.test(documentFor(route)), `${route}: a per-name fade overrides the shared timing`)
    const css = stylesheetFor(route)
    const carriers = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , body]) => /(?:^|;)view-transition-class:\s*project-cover\s*(?:;|$)/.test(body))
      .flatMap(([, selectors]) => topLevelItems(selectors).map(simplify))
    assert.ok(carriers.includes('.project-artwork'), `${route}: the card and selection prints share the class`)
    assert.ok(carriers.includes('[data-project-cover]>.print'), `${route}: the case cover print shares it too`)
    // A 4:3 card and a natural-ratio case cover differ in shape: both snapshots fill the group and crop, never stretch.
    for (const image of ['old', 'new']) {
      const snapshot = declarations(css, `::view-transition-${image}(*.project-cover)`)
      assert.equal(snapshot.height, '100%', `${route}: the ${image} snapshot fills the group`)
      assert.equal(snapshot['object-fit'], 'cover', `${route}: the ${image} snapshot crops instead of stretching`)
    }
    const group = declarations(css, '::view-transition-group(*.project-cover)')
    const duration = seconds(group['animation-duration'])
    assert.ok(duration >= 0.4 && duration <= 0.45, `${route}: the group takes a calm .4 to .45 s, not ${group['animation-duration']}`)
    assert.ok(decelerates(resolveTokens(group['animation-timing-function'])), `${route}: the group decelerates into place`)
  }
})

test('reduced motion removes every page-transition animation on every route, and the drawn annotation with it', () => {
  for (const route of routes) {
    const reduced = mediaBodies(stylesheetFor(route), 'prefers-reduced-motion').join('\n')
    for (const part of ['group', 'old', 'new']) {
      const rule = declarations(reduced, `::view-transition-${part}(*)`)
      assert.equal(rule.animation?.replace(/\s+/g, ''), 'none!important', `${route}: ::view-transition-${part}(*) must not animate`)
    }
    // The annotation is a transition, so the blanket zero-duration rule on every pseudo-element makes it instant.
    const blanket = rulesMentioning(reduced, ':after').find(({ body }) => /(?:^|;)transition-duration:\s*\.01ms\s*!important/.test(body))
    assert.ok(blanket, `${route}: ::after must lose its transition duration under reduced motion`)
  }
})

test('.annotate rests as a straight underline and is drawn as a hand-made stroke on hover and keyboard focus', () => {
  const css = stylesheetFor('/')
  const text = declarations(css, '.annotate')
  assert.match(text['text-decoration'] ?? text['text-decoration-line'] ?? '', /\bunderline\b/, 'a conventional underline stays at rest')
  assert.ok(text['text-underline-offset'], 'the underline sits clear of the text')
  assert.equal(text.position, 'relative', 'the stroke is positioned against the label')
  assert.match(text.transition ?? '', /text-decoration-color/, 'the straight underline fades out instead of snapping off')

  const stroke = declarations(css, '.annotate::after')
  assert.equal(stroke.content, '""', 'a pseudo-element without generated content never renders')
  assert.equal(stroke.position, 'absolute', 'out of flow: the stroke cannot shift layout')
  assert.equal(stroke['pointer-events'], 'none')
  assert.ok(stroke['inset-inline'] === '0' || (stroke.left === '0' && stroke.right === '0'),
    'the stroke stays inside the label box, so it cannot add horizontal overflow')
  assert.match(stroke['clip-path'] ?? '', /^inset\(0(?:px)? 100% 0(?:px)? 0(?:px)?\)$/, 'closed at rest: drawing means opening it left to right')
  assert.ok(['currentcolor', 'var(--color-accent)'].includes((stroke['background-color'] ?? stroke.background ?? '').toLowerCase()),
    'the stroke takes its colour from CSS')
  const mask = resolveTokens(stroke['mask-image'])
  const shape = mask.match(/^url\(["']?(data:image\/svg\+xml,.*?)["']?\)$/)?.[1]
  assert.ok(shape, `the stroke shape is an inline SVG mask, not ${mask}`)
  assert.ok(!/#[0-9a-f]{3,8}\b|%23[0-9a-f]{3,8}|\b(?:rgb|hsl)a?\(/i.test(decodeURIComponent(shape)), 'no colour is baked into the mask')
  assert.ok(stroke['-webkit-mask-image'], 'older Chromium and Safari read the prefixed mask')

  const draw = /clip-path\s+([\d.]+m?s)\s+(.+)$/.exec(stroke.transition ?? '')
  assert.ok(draw, `the stroke is drawn by a clip-path transition, not ${stroke.transition}`)
  assert.ok(seconds(draw[1]) >= 0.35 && seconds(draw[1]) <= 0.4, `drawing takes about .35 to .4 s, not ${draw[1]}`)
  assert.ok(decelerates(resolveTokens(draw[2])), 'the stroke decelerates as it is drawn')
  assert.equal(stroke.animation, undefined, 'no keyframes: reduced motion zeroes transitions')
  assert.equal(stroke['transition-delay'], undefined, 'a delay would survive the reduced-motion zero duration')
  assert.equal(text['transition-delay'], undefined, 'neither would a delay on the underline fade')

  const rules = rulesMentioning(css, '.annotate')
  const selectorsOf = (matching) => matching.flatMap(({ selectors }) => selectors).join(' ')
  const drawn = rules.filter(({ body }) => /(?:^|;)clip-path:\s*inset\(0(?:px)?\)\s*(?:;|$)/.test(body))
  // The minifier writes `transparent` as #0000.
  const faded = rules.filter(({ body }) => /(?:^|;)text-decoration-color:\s*(?:transparent|#0{4}|#0{8})\s*(?:;|$)/.test(body))
  for (const state of [':hover', ':focus-visible']) {
    assert.ok(selectorsOf(drawn).includes(state), `the stroke is drawn on ${state}`)
    assert.ok(selectorsOf(faded).includes(state), `the straight underline fades out on ${state}`)
  }
  assert.ok(/aria-current/.test(selectorsOf(drawn)), 'aria-current can force the stroke on for the current destination')

  const quiet = declarations(css, '.annotate-quiet')
  assert.equal(quiet['text-decoration'] ?? quiet['text-decoration-line'], 'none', 'the navigation variant has no resting underline')
})

test('scoped link styles never override the layered annotation, and credits keep a plain underline', () => {
  for (const [route, selector] of [['/portfolio', '.case-link'], ['/', '.catalogue-link a']]) {
    const own = Object.keys(declarations(stylesheetFor(route), selector))
    assert.deepEqual(own.filter((property) => /^text-(?:decoration|underline)/.test(property)), [],
      `${selector} is unlayered, so any decoration it sets would beat the layered .annotate states`)
  }
  assert.match(declarations(stylesheetFor('/portfolio'), '.cover-credit a')['text-decoration'] ?? '', /\bunderline\b/)
})

test('standalone text links carry the annotation, credits stay plain, and decorative arrows are gone', () => {
  const caseLabel = new RegExp(`<span\\b([^>]*)>${escapeRegExp(escape(site.portfolio.caseLinkLabel))}</span>`, 'g')
  for (const [route, count] of [['/', 1], ['/portfolio', projects.length]]) {
    const labels = [...documentFor(route).matchAll(caseLabel)]
    assert.equal(labels.length, count, `${route}: each card ends in a bare "${site.portfolio.caseLinkLabel}" label`)
    for (const [, tag] of labels) assert.ok(classesOf(tag).includes('annotate'), `${route}: the label draws on hover`)
  }
  const home = documentFor('/')
  const explore = tagBefore(home, site.portfolio.catalogueLinkLabel)
  assert.ok(explore.startsWith('<span') && classesOf(explore).includes('annotate'), 'the catalogue link label draws on hover')
  assert.ok(home.includes(`${escape(site.portfolio.catalogueLinkLabel)}</span></a>`), 'the label is the whole link text: no arrow')

  for (const route of routes) {
    const html = documentFor(route)
    const navigation = html.match(/<nav\b[^>]*aria-label="Main navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
    const links = [...(navigation ?? '').matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)]
    assert.equal(links.length, site.navigation.length, `${route}: the header keeps its destinations`)
    for (const [, inner] of links) {
      const classes = classesOf(inner.match(/<span\b[^>]*>/)?.[0])
      assert.ok(classes.includes('annotate') && classes.includes('annotate-quiet'), `${route}: header links use the quiet variant`)
    }
    for (const [credit] of html.matchAll(/<p\b[^>]*\bcover-credit\b[^>]*>[\s\S]*?<\/p>/g)) assert.ok(!credit.includes('annotate'), `${route}: credits stay plain`)
    for (const [caption] of html.matchAll(/<figcaption\b[\s\S]*?<\/figcaption>/g)) assert.ok(!caption.includes('annotate'), `${route}: captions stay plain`)
    // Arrows survive only where they encode direction, hidden from assistive technology.
    const bare = html.replace(/<span\b[^>]*\baria-hidden="true"[^>]*>[←→]<\/span>/g, '')
    assert.ok(!/[←→]/.test(bare), `${route} still has an arrow glyph that is read as text`)
  }
  for (const route of caseRoutes) {
    const html = documentFor(route)
    const navigation = html.match(/<nav\b[^>]*aria-label="Project navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
    assert.ok(navigation.includes('<span aria-hidden="true">←</span>'), `${route}: "Back" keeps its direction arrow, hidden from screen readers`)
    assert.ok(navigation.includes('<span aria-hidden="true">→</span>'), `${route}: "Next" keeps its direction arrow, hidden from screen readers`)
    const links = [...navigation.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)]
    assert.equal(links.length, 4, `${route}: back, next, home and contact`)
    for (const [, inner] of links) assert.ok(/<span\b[^>]*class="[^"]*\bannotate\b/.test(inner), `${route}: every project link draws on hover`)
    assert.ok(!/class="[^"]*\bunderline\b/.test(navigation), `${route}: the annotation owns the resting underline`)
  }
})

// ── Navigation semantics: skip link, current page and the brand ─────────────
const bodyOf = (html) => html.slice(html.indexOf('<body'))

// What Tab reaches, in document order. Nothing focusable follows <main>, so the scan stops there and never reads the
// minified analytics script. A disabled control, a hidden input and tabindex="-1" are not tab stops.
function tabStops(html) {
  const body = bodyOf(html)
  return [...body.slice(0, body.indexOf('</main>')).matchAll(/<([a-z][\w-]*)\b[^>]*>/gi)]
    .filter(([tag, name]) => {
      const item = attributes(tag)
      if (item.tabindex !== undefined) return Number(item.tabindex) >= 0
      if (/\sdisabled[\s/>]/.test(tag.replace(/"[^"]*"/g, '""')) || item.type === 'hidden') return false
      return name === 'a' ? item.href !== undefined : ['button', 'input', 'select', 'textarea', 'summary'].includes(name)
    })
    .map(([tag]) => tag)
}

// The declarations that keep a box out of the viewport or clip it away: the ways to hide a link without leaving the tab order.
const movedAway = (rule) => /translate[XY]?\(\s*-|translate\(\s*[^,)]+,\s*-/.test(rule.transform ?? '')
  || ['top', 'left', 'inset', 'margin-top', 'margin-left'].some((property) => /^-/.test(rule[property] ?? ''))
  || !['none', undefined].includes(rule['clip-path']) || ![undefined, 'auto'].includes(rule.clip)
const pixels = (value = '') => (value.endsWith('rem') ? parseFloat(value) * 16 : value.endsWith('px') ? parseFloat(value) : NaN)

test('the skip link is the first tab stop on every route and leads to the focusable main landmark', () => {
  for (const route of routes) {
    const html = documentFor(route)
    const body = bodyOf(html)
    const [first] = tabStops(html)
    assert.ok(first, `${route} has tab stops`)
    assert.equal(attributes(first).href, '#main', `${route}: the first tab stop must be the skip link, not ${first}`)
    assert.ok(classesOf(first).includes('skip-link'), `${route}: the skip link carries the .skip-link role: ${first}`)
    const start = body.indexOf(first)
    assert.equal(body.slice(start + first.length, body.indexOf('</a>', start)), 'Skip to content', `${route}: the link says where it goes`)
    assert.ok(start < body.indexOf('<header'), `${route}: the skip link comes before the header it lets a visitor skip`)

    const mains = [...html.matchAll(/<main\b[^>]*>/g)].map(([tag]) => attributes(tag))
    assert.equal(mains.length, 1, `${route} has one main landmark`)
    assert.equal(mains[0].id, 'main', `${route}: the skip link needs a target`)
    assert.equal(mains[0].tabindex, '-1', `${route}: main takes focus when the link is followed, in every browser`)
    assert.equal([...html.matchAll(/\bid="main"/g)].length, 1, `${route}: #main must be unique`)
  }
})

test('the skip link rests out of the viewport yet in the tab order, and shows at once as a legible 44px target on focus', () => {
  const { color } = rootTokens()
  const headerTag = documentFor('/').match(/<header\b[^>]*>/)?.[0]
  const headerLayer = Number(classesOf(headerTag).find((name) => /^z-\d+$/.test(name))?.slice(2))
  assert.ok(headerLayer > 0, 'the header declares its stacking layer')
  for (const route of routes) {
    assert.ok(Object.keys(declarations(stylesheetFor(route), '.skip-link')).length > 0, `${route} ships the .skip-link rule`)
  }

  const css = stylesheetFor('/')
  const resting = declarations(css, '.skip-link')
  const focused = { ...resting, ...declarations(css, '.skip-link:focus') }
  for (const [name, state] of [['at rest', resting], ['on focus', focused]]) {
    // display: none and visibility: hidden both take a link out of the tab order, so neither may hide it.
    assert.notEqual(state.display, 'none', `${name}: display:none would remove the link from the tab order`)
    assert.notEqual(state.visibility, 'hidden', `${name}: visibility:hidden would remove the link from the tab order`)
    assert.equal(state.transition, undefined, `${name}: focus never waits for an animation`)
    assert.equal(state.animation, undefined, `${name}: focus never waits for an animation`)
  }
  assert.ok(['fixed', 'absolute'].includes(resting.position), 'out of flow, so showing the link cannot shift the layout')
  assert.ok(movedAway(resting), 'at rest the link sits outside the viewport')
  assert.ok(!movedAway(focused), 'focus brings the link into view')

  assert.ok(pixels(resting['min-height']) >= 44 && pixels(resting['min-width']) >= 44, 'the target is at least 44 x 44 px')
  assert.ok(Number(resting['z-index']) > headerLayer, 'the link shows above the header')
  assert.ok(Number(resting['z-index']) > Number(declarations(css, '.ink-trail')['z-index']), 'and above the ink trail')
  const tokenOf = (value = '') => value.match(/^var\((--[\w-]+)\)$/)?.[1]
  const [ink, fill] = [tokenOf(resting.color), tokenOf(resting['background-color'] ?? resting.background)]
  assert.ok(ink && fill, `the link is painted with palette tokens, not ${resting.color} on ${resting['background-color']}`)
  assert.ok(contrast(color(ink), color(fill)) >= 7, 'the label reads at the ink-on-paper contrast')

  // The accent ring is the global a:focus-visible rule: nothing on the link may switch it off.
  assert.equal(declarations(css, 'a:focus-visible').outline, '3px solid var(--color-accent)')
  for (const selector of ['.skip-link', '.skip-link:focus', '.skip-link:focus-visible']) {
    const state = declarations(css, selector)
    assert.ok(!/^(?:none|0)\b/.test(state.outline ?? ''), `${selector} keeps the focus ring`)
    assert.notEqual(state['outline-style'], 'none', `${selector} keeps the focus ring`)
  }
})

test('the header marks only the page being viewed with aria-current="page", never a section or a case page', () => {
  assert.ok(site.navigation.some(({ href }) => routes.includes(href)), 'the shipped navigation links to at least one page')
  for (const route of routes) {
    const html = documentFor(route)
    const navigation = html.match(/<nav\b[^>]*aria-label="Main navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
    assert.ok(navigation, `${route} renders the main navigation`)
    const links = [...navigation.matchAll(/<a\b[^>]*>/g)].map(([tag]) => attributes(tag))
    assert.deepEqual(links.map(({ href }) => href), site.navigation.map(({ href }) => href), `${route}: the header keeps its destinations in order`)
    for (const link of links) {
      // A destination is the current page only when it is exactly this route: "/#about" is a section of "/", not a page.
      assert.equal(link['aria-current'], link.href === route ? 'page' : undefined, `${route}: aria-current on ${link.href}`)
    }
    for (const [, value] of html.matchAll(/\baria-current="([^"]*)"/g)) {
      assert.equal(value, 'page', `${route}: aria-current is "page" or absent, never "${value}"`)
    }
  }
})

// Whether a compound selector such as `.annotate[aria-current=page]:after` describes the element opened by `tag`.
// Only what the built CSS uses is understood: classes, attributes and a trailing pseudo-element. Anything else is no match.
function compoundMatches(compound, tag) {
  const base = compound.replace(/::?(?:after|before)$/, '')
  if (base.includes(':')) return false
  const attributeValues = attributes(tag)
  const classes = classesOf(tag)
  const parts = [...base.matchAll(/\.([\w-]+)|\[([\w-]+)(?:=([^\]]*))?\]|^([a-z][\w-]*)/g)]
  return parts.length > 0 && parts.every(([, className, attribute, value, element]) => {
    if (className) return classes.includes(className)
    if (attribute) return value === undefined ? attribute in attributeValues : attributeValues[attribute] === value.replace(/^["']|["']$/g, '')
    return tag.startsWith(`<${element}`)
  })
}
// A descendant selector reaches the label (its last compound) from the link (every compound before it).
const selectorMatches = (selector, anchor, label) => {
  if (/[>+~]/.test(selector)) return false
  const [subject, ...ancestors] = selector.split(' ').reverse()
  return compoundMatches(subject, label) && ancestors.every((ancestor) => compoundMatches(ancestor, anchor))
}

test('the drawn annotation rule for the current page matches the markup that carries aria-current', () => {
  let checked = 0
  for (const route of routes) {
    const navigation = documentFor(route).match(/<nav\b[^>]*aria-label="Main navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? ''
    for (const [, anchor, inner] of navigation.matchAll(/(<a\b[^>]*\baria-current="page"[^>]*>)([\s\S]*?)<\/a>/g)) {
      const label = inner.match(/<span\b[^>]*>/)?.[0]
      assert.ok(label && classesOf(label).includes('annotate'), `${route}: the current link keeps its .annotate label: ${inner}`)
      const drawn = rulesMentioning(stylesheetFor(route), 'aria-current')
        .filter(({ body }) => /(?:^|;)clip-path:\s*inset\(0(?:px)?\)\s*(?:;|$)/.test(body))
        .flatMap(({ selectors }) => selectors)
      assert.ok(drawn.some((selector) => selectorMatches(selector, anchor, label)),
        `${route}: no rule that draws the stroke matches ${anchor}${label}; the rules are: ${drawn.join(' | ')}`)
      checked++
    }
  }
  assert.ok(checked >= 2, `Portfolio and Contact each show the current page (${checked} checked)`)
})

test('the brand is a name, not a heading: the header holds none and every page opens its outline with its h1', () => {
  const css = stylesheetFor('/')
  for (const route of routes) {
    const html = documentFor(route)
    // The site header precedes <main>; the selection block's own <header> sits inside it.
    const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)
    assert.ok(header && html.indexOf(header[0]) < html.indexOf('<main'), `${route} opens with the site header`)
    assert.deepEqual([...header[1].matchAll(/<h[1-6]\b/g)].map(([tag]) => tag), [], `${route}: the header introduces no heading`)

    const home = header[1].match(/<a\b[^>]*\bhref="\/"[^>]*>([\s\S]*?)<\/a>/)
    assert.ok(home, `${route}: the brand still links home`)
    assert.equal(attributes(home[0])['aria-label'], `${site.name} home`, `${route}: the accessible name keeps the brand text`)
    assert.equal(attributes(home[1].match(/<img\b[^>]*>/)?.[0] ?? '').alt, '', `${route}: the logo stays decorative`)
    const brand = home[1].match(new RegExp(`<(\\w+)\\b[^>]*>${escapeRegExp(escape(site.name))}</\\1>`))
    assert.ok(brand, `${route}: the brand text sits in its own element`)
    assert.ok(!/^h[1-6]$/.test(brand[1]), `${route}: the brand is a <${brand[1]}>, not a heading`)
    assert.ok(classesOf(brand[0]).includes('text-2xl'), `${route}: the brand keeps its size and line height`)
    // The face of a heading without being one: some class on it sets Mansalva, and only its Regular weight ships.
    const faces = classesOf(brand[0]).map((name) => declarations(css, `.${name}`)).filter((rule) => /Mansalva/.test(rule['font-family'] ?? ''))
    assert.ok(faces.length > 0, `${route}: the brand is written in Mansalva`)
    assert.ok(faces.every((rule) => rule['font-weight'] === '400'), `${route}: the brand never asks for a weight Mansalva lacks`)

    const levels = [...bodyOf(html).matchAll(/<h([1-6])\b/g)].map(([, level]) => Number(level))
    assert.equal(levels[0], 1, `${route}: the first heading is the page h1, not the brand`)
    assert.equal(levels.filter((level) => level === 1).length, 1, `${route}: one h1 per page`)
  }
})
