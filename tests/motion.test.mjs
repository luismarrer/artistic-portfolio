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
  const contexts = []
  const timelines = []
  const triggers = []
  const glides = []
  const scrollTrigger = {
    batch() {},
    create(config) {
      const trigger = { config, killed: false, kill() { this.killed = true } }
      triggers.push(trigger)
      return trigger
    },
    getAll: () => triggers.filter((trigger) => !trigger.killed),
    refresh: () => calls.push({ kind: 'refresh' }),
  }
  const gsap = {
    registerPlugin() {},
    utils: { toArray: (selector) => document.querySelectorAll(selector) },
    fromTo: (target, from, to) => calls.push({ kind: 'fromTo', target, from, to }),
    set: (target, from) => calls.push({ kind: 'set', target, from }),
    to: (target, to) => calls.push({ kind: 'to', target, to }),
    context(callback) {
      const firstTimeline = timelines.length
      const firstTrigger = triggers.length
      let ownedTimelines = []
      let ownedTriggers = []
      const context = {
        reverted: false,
        revert() {
          this.reverted = true
          ownedTimelines.forEach((timeline) => timeline.kill())
          ownedTriggers.forEach((trigger) => trigger.kill())
        },
      }
      contexts.push(context)
      callback()
      ownedTimelines = timelines.slice(firstTimeline)
      ownedTriggers = triggers.slice(firstTrigger)
      return context
    },
    timeline() {
      const timeline = {
        killed: false,
        position: 0,
        set() { return this },
        to() { return this },
        fromTo() { return this },
        progress(value) {
          if (value === undefined) return this.position
          this.position = value
          return this
        },
        isActive: () => false,
        play() { return this },
        kill() { this.killed = true },
      }
      timelines.push(timeline)
      return timeline
    },
    quickTo() {
      const glide = () => {}
      glide.tween = { killed: false, pause() {}, kill() { this.killed = true } }
      glides.push(glide)
      return glide
    },
  }
  const context = {
    exports: {}, document, HTMLElement: ElementDouble,
    window: { scrollY: 0, innerWidth: 390 },
    AbortController,
    require: (name) => name === 'gsap' ? { gsap } : { ScrollTrigger: scrollTrigger },
    ...overrides,
  }
  runInNewContext(`${compiled}\nglobalThis.api = { buildTrailRoute, toSmoothPath, initCtaAndHover, initReveals };`, context)
  return { api: context.api, boot: context.exports.bootArtisticMotion, calls, contexts, timelines, triggers, glides }
}

class EventTargetDouble {
  events = []
  addEventListener(type, listener, { signal } = {}) {
    if (signal?.aborted || this.events.some((event) => event.type === type && event.listener === listener)) return
    this.events.push({ type, listener, signal })
    signal?.addEventListener('abort', () => this.removeEventListener(type, listener), { once: true })
  }
  removeEventListener(type, listener) {
    this.events = this.events.filter((event) => event.type !== type || event.listener !== listener)
  }
  dispatch(type, properties = {}) {
    const event = {
      type, defaultPrevented: false, ...properties,
      preventDefault() { this.defaultPrevented = true },
      stopPropagation() {},
    }
    for (const { listener } of this.events.filter((entry) => entry.type === type)) listener(event)
    return event
  }
}

class ElementDouble extends EventTargetDouble {
  constructor({ id = '', tagName = 'SECTION', left = 0, top = 0, width = 0, height = 0, hero = false } = {}) {
    super()
    Object.assign(this, { id, tagName, offsetLeft: left, offsetTop: top, offsetWidth: width,
      offsetHeight: height, offsetParent: null, parentElement: null, children: [], hero,
      dataset: {}, selectors: {}, style: {}, attributes: {} })
  }
  matches(selector) { return selector === '[data-hero]' && this.hero }
  querySelector(selector) { return this.selectors[selector] ?? null }
  querySelectorAll(selector) { return this.selectors[selector] ?? [] }
  getBoundingClientRect() { return { left: this.offsetLeft, width: this.offsetWidth, top: this.offsetTop, height: this.offsetHeight } }
  getAttribute(name) { return this.attributes[name] ?? this[name] ?? null }
  setAttribute(name, value) { this.attributes[name] = value }
  getTotalLength() { return 100 }
  getPointAtLength(length) { return { x: 20, y: 100 + length * 14 } }
  replaceChildren(...children) { this.children = children }
  appendChild(child) { this.children.push(child); return child }
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

function deferred() {
  let resolve
  const promise = new Promise((accept) => { resolve = accept })
  return { promise, resolve }
}

function callbackQueue() {
  let nextId = 1
  const pending = new Map()
  const cancelled = []
  return {
    pending, cancelled,
    schedule(callback) {
      const id = nextId++
      pending.set(id, callback)
      return id
    },
    cancel(id) {
      if (pending.has(id)) cancelled.push(pending.get(id))
      pending.delete(id)
    },
    flush() {
      for (const [id, callback] of [...pending]) {
        if (!pending.delete(id)) continue
        callback()
      }
    },
  }
}

function lifecycle({ reduced = false } = {}) {
  const frames = callbackQueue()
  const timers = callbackQueue()
  const fonts = deferred()
  const observers = []
  const document = new EventTargetDouble()
  const window = new EventTargetDouble()
  Object.assign(window, {
    scrollY: 0, innerWidth: 390, innerHeight: 844,
    matchMedia: () => ({ matches: reduced }),
    setTimeout: (callback) => timers.schedule(callback),
    clearTimeout: (id) => timers.cancel(id),
  })
  const classes = new Set()
  document.documentElement = new ElementDouble()
  Object.assign(document.documentElement, {
    clientWidth: 390, clientHeight: 844, scrollHeight: 1600,
    classList: { add: (name) => classes.add(name), contains: (name) => classes.has(name) },
  })
  document.body = new ElementDouble({ height: 1600 })
  document.fonts = { ready: fonts.promise }
  const cta = new ElementDouble({ id: 'start', tagName: 'A', top: 330, width: 224, height: 52 })
  cta.href = '#projects'
  const destination = new ElementDouble({ id: 'projects', top: 460, width: 390, height: 440 })
  const copy = new ElementDouble({ top: 1000, width: 342, height: 200 })
  copy.dataset.reveal = 'copy'
  const word = new ElementDouble()
  const hint = new ElementDouble()
  const signatureWord = new ElementDouble()
  const signaturePath = new ElementDouble()
  const clip = new ElementDouble()
  const signature = new ElementDouble()
  signature.selectors['[data-draw]'] = [signaturePath]
  signature.selectors['.signature-clip'] = clip
  signature.selectors['.signature-word'] = signatureWord
  const root = new ElementDouble()
  const path = new ElementDouble()
  const shadow = new ElementDouble()
  const pen = new ElementDouble()
  Object.assign(root.selectors, {
    svg: new ElementDouble(), '#ink-path': path, '#ink-path-shadow': shadow,
    '#ink-pen': pen, '#ink-splatters': new ElementDouble(),
  })
  const visibleContent = [copy, word, cta, hint, signatureWord]
  const paths = [signaturePath, path, shadow]
  visibleContent.forEach((element) => Object.assign(element.style, { opacity: '0', transform: 'translateY(42px)' }))
  paths.forEach((element) => Object.assign(element.style, { strokeDashoffset: '100', strokeDasharray: '100' }))
  const singles = { '#start': cta, '#ink-trail': root, '#ink-pen': pen }
  const collections = {
    '.js-signature': [signature], '.js-hero-title span': [word], '[data-reveal]': [copy],
    '[data-magnetic]': [cta], '.signature-clip': [clip],
    '.js-signature [data-draw], #ink-path, #ink-path-shadow': paths,
    '[data-reveal], .js-hero-title span, #start, .js-scroll-hint, .js-signature .signature-word': visibleContent,
  }
  document.querySelector = (selector) => singles[selector] ?? null
  document.querySelectorAll = (selector) => collections[selector] ?? []
  document.getElementById = (id) => id === destination.id ? destination : null
  document.createElementNS = () => new ElementDouble()
  const runtime = controller(document, {
    window,
    requestAnimationFrame: (callback) => frames.schedule(callback),
    cancelAnimationFrame: (id) => frames.cancel(id),
    ResizeObserver: class {
      disconnected = false
      constructor(callback) { this.callback = callback; observers.push(this) }
      observe(element) { this.element = element }
      disconnect() { this.disconnected = true }
    },
  })
  runtime.boot()
  return { ...runtime, document, window, frames, timers, fonts, observers, classes,
    cta, visibleContent, paths, clip, pen }
}

test('reduced motion takes the visible static early exit without animations or enhanced CTA handlers', async () => {
  const state = lifecycle({ reduced: true })
  state.document.dispatch('astro:page-load')
  state.frames.flush()
  for (const path of state.paths) {
    assert.equal(path.style.strokeDashoffset, '0')
    assert.equal(path.style.strokeDasharray, 'none')
  }
  assert.equal(state.clip.getAttribute('width'), '560')
  for (const element of state.visibleContent) {
    assert.equal(element.style.opacity, '1')
    assert.equal(element.style.transform, 'none')
  }
  assert.equal(state.pen.style.opacity, '0')
  assert.equal(state.classes.has('has-motion'), false)
  assert.equal(state.calls.length, 0)
  assert.equal(state.contexts.length, 0)
  assert.equal(state.timelines.length, 0)
  assert.equal(state.triggers.length, 0)
  assert.equal(state.observers.length, 0)
  assert.equal(state.cta.events.length, 0, 'the anchor remains native in static mode')
  assert.equal(state.cta.dispatch('click').defaultPrevented, false)
  state.fonts.resolve()
  await state.fonts.promise
  state.window.dispatch('load')
  state.window.dispatch('resize')
  assert.equal(state.timers.pending.size, 0, 'static mode must not queue trail work')
})

test('repeated page loads abort old signals, revert contexts, disconnect observers and retain one handler pair', () => {
  const state = lifecycle()
  state.document.dispatch('astro:page-load')
  state.frames.flush()
  const oldSignal = state.cta.events[0].signal
  const oldTriggers = [...state.triggers]
  const oldTimelines = [...state.timelines]
  state.document.dispatch('astro:page-load')
  state.frames.flush()
  assert.equal(oldSignal.aborted, true)
  assert.equal(state.contexts[0].reverted, true)
  assert.equal(state.observers[0].disconnected, true)
  assert.ok(oldTriggers.every((trigger) => trigger.killed))
  assert.ok(oldTimelines.every((timeline) => timeline.killed))
  assert.equal(state.glides[0].tween.killed, true)
  assert.equal(state.contexts.filter((context) => !context.reverted).length, 1)
  assert.equal(state.observers.filter((observer) => !observer.disconnected).length, 1)
  for (const type of ['click', 'mousemove', 'mouseleave']) {
    assert.equal(state.cta.events.filter((event) => event.type === type).length, 1)
  }
  assert.equal(state.cta.dispatch('click').defaultPrevented, true)
  const scrolls = state.calls.filter((call) => call.to?.scrollTo)
  assert.equal(scrolls.length, 1)
  assert.equal(scrolls[0].to.scrollTo.y, 444)
})

test('a swap cancels queued initialization and rejects the departing page late-font callback', async () => {
  const state = lifecycle()
  state.document.dispatch('astro:page-load')
  assert.equal(state.frames.pending.size, 1)
  state.document.dispatch('astro:before-swap')
  assert.equal(state.frames.pending.size, 0)
  assert.equal(state.frames.cancelled.length, 1)
  state.frames.flush()
  state.frames.cancelled[0]()
  assert.equal(state.contexts.length, 0, 'even an already dequeued stale frame cannot initialize')
  state.fonts.resolve()
  await state.fonts.promise
  assert.equal(state.timers.pending.size, 0)
  assert.equal(state.calls.length, 0)
})

test('swap tears down timers and active resources while permanent handlers can initialize the next page', async () => {
  const state = lifecycle()
  state.document.dispatch('astro:page-load')
  state.frames.flush()
  const signal = state.cta.events[0].signal
  state.window.dispatch('resize')
  assert.equal(state.timers.pending.size, 1)
  state.document.dispatch('astro:before-swap')
  assert.equal(state.timers.pending.size, 0)
  assert.equal(state.timers.cancelled.length, 1)
  assert.equal(signal.aborted, true)
  assert.equal(state.contexts[0].reverted, true)
  assert.equal(state.observers[0].disconnected, true)
  assert.ok(state.triggers.every((trigger) => trigger.killed))
  assert.ok(state.timelines.every((timeline) => timeline.killed))
  assert.equal(state.glides[0].tween.killed, true)
  assert.equal(state.cta.events.length, 0)
  state.window.dispatch('load')
  state.window.dispatch('resize')
  assert.equal(state.timers.pending.size, 0, 'permanent global listeners do not rebuild a swapped-out page')
  const nextFonts = deferred()
  state.document.fonts = { ready: nextFonts.promise }
  state.document.dispatch('astro:page-load')
  state.frames.flush()
  const callsBeforeLateWork = state.calls.length
  state.timers.cancelled[0]()
  state.fonts.resolve()
  await state.fonts.promise
  assert.equal(state.calls.length, callsBeforeLateWork, 'stale work cannot refresh the replacement controller')
  assert.equal(state.timers.pending.size, 0, 'old fonts cannot queue work for the replacement page')
  assert.equal(state.contexts.length, 2)
  assert.equal(state.contexts[1].reverted, false)
  assert.equal(state.observers[1].disconnected, false)
  for (const type of ['click', 'mousemove', 'mouseleave']) {
    assert.equal(state.cta.events.filter((event) => event.type === type).length, 1)
  }
  nextFonts.resolve()
  await nextFonts.promise
  assert.equal(state.timers.pending.size, 1, 'the replacement page fonts still request a valid refresh')
  state.timers.flush()
  assert.equal(state.calls.length, callsBeforeLateWork + 1)
  assert.equal(state.document.events.length, 2, 'processed-script navigation listeners remain permanent')
  assert.equal(state.window.events.length, 2, 'load/resize listeners remain permanent')
})

test('consecutive page-load events coalesce queued frames before initializing one controller', () => {
  const state = lifecycle()
  state.document.dispatch('astro:page-load')
  state.document.dispatch('astro:page-load')
  assert.equal(state.frames.pending.size, 1)
  assert.equal(state.frames.cancelled.length, 1)
  state.frames.flush()
  assert.equal(state.contexts.length, 1)
  assert.equal(state.observers.length, 1)
  state.frames.cancelled[0]()
  assert.equal(state.contexts.length, 1, 'stale frame generation cannot replace the current controller')
})
