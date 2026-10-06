import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

// Execute the actual controller with deterministic DOM/GSAP doubles, not source-text assertions.
const source = readFileSync(new URL('../src/scripts/artistic-motion.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText

function controller(document, overrides = {}) {
  const calls = []
  const gsap = {
    registerPlugin() {},
    utils: { toArray: (selector) => document.querySelectorAll(selector) },
    fromTo: (target, from, to) => calls.push({ target, from, to }),
    set: (target, from) => calls.push({ target, from }),
    to() {},
  }
  const context = {
    exports: {}, document, HTMLElement: ElementDouble,
    window: { scrollY: 0, innerWidth: 390 },
    require: (name) => name === 'gsap' ? { gsap } : { ScrollTrigger: { batch() {} } },
    ...overrides,
  }
  runInNewContext(`${compiled}\nglobalThis.api = { buildTrailRoute, toSmoothPath, initCtaAndHover, initReveals };`, context)
  return { api: context.api, calls }
}

class ElementDouble {
  constructor({ id = '', tagName = 'SECTION', left = 0, top = 0, width = 0, height = 0, hero = false } = {}) {
    Object.assign(this, { id, tagName, offsetLeft: left, offsetTop: top, offsetWidth: width,
      offsetHeight: height, offsetParent: null, parentElement: null, children: [], hero,
      dataset: {}, selectors: {}, events: [] })
  }
  matches(selector) { return selector === '[data-hero]' && this.hero }
  querySelector(selector) { return this.selectors[selector] ?? null }
  querySelectorAll(selector) { return this.selectors[selector] ?? [] }
  getBoundingClientRect() { return { width: this.offsetWidth, top: this.offsetTop } }
  getAttribute(name) { return this[name] ?? null }
  addEventListener(type, listener) { this.events.push({ type, listener }) }
}

test('the magnetic CTA owns one pointer pair, rather than two competing animations', () => {
  const cta = new ElementDouble()
  const document = {
    querySelector: (selector) => selector === '#start' ? cta : null,
    querySelectorAll: (selector) => selector === '[data-magnetic]' ? [cta] : [],
  }
  controller(document).api.initCtaAndHover(new AbortController().signal)
  assert.equal(cta.events.filter(({ type }) => type === 'click').length, 1)
  assert.equal(cta.events.filter(({ type }) => type === 'mousemove').length, 1)
  assert.equal(cta.events.filter(({ type }) => type === 'mouseleave').length, 1)
})

test('the CTA keeps native navigation when its configured destination is not a page anchor', () => {
  const cta = new ElementDouble()
  cta.href = '/portfolio'
  const destination = new ElementDouble()
  const document = {
    querySelector: (selector) => selector === '#start' ? cta : selector === '#projects' ? destination : null,
    querySelectorAll: () => [],
  }
  controller(document).api.initCtaAndHover(new AbortController().signal)
  let prevented = false
  cta.events.find(({ type }) => type === 'click').listener({
    preventDefault() { prevented = true }, stopPropagation() {},
  })
  assert.equal(prevented, false, 'configuring a route must not be hijacked into scrolling to projects')
})

test('CTA, cards and wrappers containing links are never initialized invisibly', () => {
  const cta = new ElementDouble()
  const card = new ElementDouble()
  card.dataset.reveal = 'card'
  const wrapper = new ElementDouble()
  wrapper.selectors['a, button, input, select, textarea'] = card
  wrapper.dataset.reveal = 'copy'
  const document = {
    querySelector: (selector) => selector === '#start' ? cta : null,
    querySelectorAll: (selector) => selector === '[data-reveal]' ? [card, wrapper]
      : selector === "[data-reveal='card']" ? [card] : [],
  }
  const { api, calls } = controller(document)
  api.initReveals()
  for (const { target, from } of calls) {
    const targets = Array.isArray(target) ? target : [target]
    if (targets.some((el) => [cta, card, wrapper].includes(el))) {
      assert.notEqual(from.autoAlpha, 0, 'an essential control must not become visibility:hidden')
    }
  }
})

test('narrow full-width copy reveals do not extend the document sideways before scrolling', () => {
  const copy = new ElementDouble({ left: 24, top: 1100, width: 342, height: 200 })
  copy.dataset.reveal = 'right'
  const document = {
    querySelector: () => null,
    querySelectorAll: (selector) => selector === '[data-reveal]' ? [copy] : [],
  }
  const { api, calls } = controller(document)
  api.initReveals()
  const animation = calls.find(({ target }) => target === copy)
  assert.ok(animation)
  assert.equal(animation.from.x, 0, 'full-width copy has no safe horizontal translation room')
  assert.equal(animation.from.rotate, 0, 'rotation must not create lateral overflow either')
})

test('hero exit follows the actual adjacent work layout, not the later biography', () => {
  const hero = new ElementDouble({ width: 390, height: 460, hero: true })
  const selection = new ElementDouble({ id: 'projects', top: 460, width: 390, height: 440 })
  const grid = new ElementDouble({ left: 24, top: 550, width: 342, height: 300 })
  const card = new ElementDouble({ left: 24, top: 550, width: 342, height: 300 })
  card.parentElement = grid
  const art = new ElementDouble({ left: 24, top: 550, width: 342, height: 200 })
  art.selectors['svg, img'] = art
  card.selectors['.project-artwork'] = art
  selection.selectors['.project-card'] = [card]
  selection.selectors['[data-trail-content]'] = grid
  selection.selectors['.grid'] = grid
  const about = new ElementDouble({ id: 'about', top: 1000, width: 390, height: 500 })
  const biography = new ElementDouble({ left: 70, top: 1100, width: 250, height: 300 })
  about.selectors.article = biography
  const main = new ElementDouble()
  main.children = [hero, selection, about]
  const cta = new ElementDouble({ left: 83, top: 330, width: 224, height: 52 })
  const document = {
    querySelector: (selector) => ({ main, '#start': cta, '#about article': biography })[selector] ?? null,
    createRange: () => ({ selectNodeContents() {}, getBoundingClientRect: () => ({ width: 0 }) }),
  }
  const { api } = controller(document)
  const layout = { width: 390, height: 1600, vw: 390, vh: 844, gutter: 24, mobile: true }
  const exit = () => Array.from(api.buildTrailRoute(layout)).filter(({ y }) => y <= hero.offsetHeight)
    .map(({ x, y }) => [x, y])
  const before = JSON.stringify(exit())
  biography.offsetLeft = 140
  assert.equal(JSON.stringify(exit()), before, 'moving the later biography must not move the opening stroke')
  assert.ok(exit().length >= 3)
  assert.ok(exit().every(([, y]) => y < art.offsetTop), 'opening stroke finishes before the artwork begins')
})

function sampleCurve(path) {
  const numbers = path.match(/-?\d+(?:\.\d+)?/g).map(Number)
  let [x0, y0] = numbers.splice(0, 2)
  const points = []
  for (let index = 0; index < numbers.length; index += 6) {
    const [x1, y1, x2, y2, x3, y3] = numbers.slice(index, index + 6)
    for (let step = 0; step <= 40; step++) {
      const t = step / 40
      const u = 1 - t
      points.push({
        x: u ** 3 * x0 + 3 * u ** 2 * t * x1 + 3 * u * t ** 2 * x2 + t ** 3 * x3,
        y: u ** 3 * y0 + 3 * u ** 2 * t * y1 + 3 * u * t ** 2 * y2 + t ** 3 * y3,
      })
    }
    x0 = x3
    y0 = y3
  }
  return points
}

test('catalogue ink reaches the outer grid margin before the first artwork, including its curved sweep', () => {
  const intro = new ElementDouble({ width: 1440, height: 250 })
  const catalogue = new ElementDouble({ id: 'projects', top: 250, width: 1440, height: 500 })
  const grid = new ElementDouble({ left: 144, top: 274, width: 1152, height: 450 })
  const artwork = []
  const cards = [144, 538, 932].map((left) => {
    const card = new ElementDouble({ left, top: 274, width: 364, height: 400 })
    card.parentElement = new ElementDouble({ left, top: 274, width: 364, height: 450 })
    const art = new ElementDouble({ left, top: 274, width: 364, height: 250 })
    art.selectors['svg, img'] = art
    card.selectors['.project-artwork'] = art
    artwork.push(art)
    return card
  })
  catalogue.selectors['.project-card'] = cards
  catalogue.selectors['[data-trail-content]'] = grid
  const main = new ElementDouble()
  main.children = [intro, catalogue]
  const document = { querySelector: (selector) => selector === 'main' ? main : null }
  const { api } = controller(document)
  const points = sampleCurve(api.toSmoothPath(api.buildTrailRoute({
    width: 1440, height: 800, vw: 1440, vh: 900, gutter: 48, mobile: false,
  })))
  for (const art of artwork) {
    assert.ok(!points.some(({ x, y }) => x > art.offsetLeft + 3 && x < art.offsetLeft + art.offsetWidth - 3
      && y > art.offsetTop + 3 && y < art.offsetTop + art.offsetHeight - 3),
    'sampled cubic ink must not cross a case cover after the catalogue heading moved outside its section')
  }
})
