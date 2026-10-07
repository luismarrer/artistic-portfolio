import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
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
  const batches = []
  const glides = []
  const scrollTrigger = {
    batch(targets, config) { batches.push({ targets, config }) },
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
      const firstCall = calls.length
      let ownedTimelines = []
      let ownedTriggers = []
      let ownedCalls = []
      const context = {
        reverted: false,
        revert() {
          this.reverted = true
          ownedTimelines.forEach((timeline) => timeline.kill())
          ownedTriggers.forEach((trigger) => trigger.kill())
          // A real context also kills the tweens made while it was collecting: that is what stops an endless one.
          ownedCalls.forEach((call) => { call.killed = true })
        },
      }
      contexts.push(context)
      callback()
      ownedTimelines = timelines.slice(firstTimeline)
      ownedTriggers = triggers.slice(firstTrigger)
      ownedCalls = calls.slice(firstCall).filter(({ kind }) => ['fromTo', 'to', 'set'].includes(kind))
      return context
    },
    // Timelines record what is scheduled (`entries`, with the position each tween was placed at) so a test can
    // read the real schedule back; `play` joins `calls` so ordering against `gsap.set` is observable.
    timeline(vars) {
      const timeline = {
        vars,
        entries: [],
        killed: false,
        position: 0,
        set(target, props, at) { this.entries.push({ kind: 'set', target, vars: props, at }); return this },
        to(target, props, at) { this.entries.push({ kind: 'to', target, vars: props, at }); return this },
        fromTo(target, from, props, at) { this.entries.push({ kind: 'fromTo', target, from, vars: props, at }); return this },
        progress(value) {
          if (value === undefined) return this.position
          this.position = value
          return this
        },
        isActive: () => false,
        play() { calls.push({ kind: 'play', timeline: this }); return this },
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
  runInNewContext(`${compiled}\nglobalThis.api = { buildTrailRoute, toSmoothPath, initCtaAndHover, initReveals, initSignatures, initInkTrail };`, context)
  return { api: context.api, boot: context.exports.bootArtisticMotion, calls, contexts, timelines, triggers, batches, glides }
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
      dataset: {}, selectors: {}, style: {}, attributes: {}, focused: [] })
  }
  matches(selector) { return selector === '[data-hero]' && this.hero }
  querySelector(selector) { return this.selectors[selector] ?? null }
  querySelectorAll(selector) { return this.selectors[selector] ?? [] }
  getBoundingClientRect() { return { left: this.offsetLeft, width: this.offsetWidth, top: this.offsetTop, height: this.offsetHeight } }
  getAttribute(name) { return this.attributes[name] ?? this[name] ?? null }
  hasAttribute(name) { return name in this.attributes }
  setAttribute(name, value) { this.attributes[name] = value }
  focus(options) { this.focused.push(options) }
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

// ── One written intro, within budget ────────────────────────────────────────
// A hero as the controller sees it: headline words, signature, CTA and scroll hint.
function heroPage({ variant = 'hero', words = 5, top = 0, writing = true } = {}) {
  const wordElements = Array.from({ length: words }, () => new ElementDouble())
  const hint = new ElementDouble()
  const cta = new ElementDouble({ id: 'start', tagName: 'A', top: 330, width: 224, height: 52 })
  cta.href = '#projects'
  const parts = {
    clip: new ElementDouble(), pen: new ElementDouble(), writePath: new ElementDouble(),
    underline: new ElementDouble(), word: new ElementDouble(),
  }
  parts.clip.attributes.width = '560'
  const signature = new ElementDouble({ top })
  signature.dataset.variant = variant
  Object.assign(signature.selectors, {
    '[data-draw]': [parts.underline], '.signature-clip': parts.clip,
    '.signature-pen': parts.pen, '.signature-word': parts.word,
  })
  // A custom signature may have no writing path for the pen to follow.
  if (writing) signature.selectors['.signature-write-path'] = parts.writePath
  const singles = { '#start': cta, '.js-scroll-hint': hint }
  const lists = { '.js-hero-title span': wordElements, '.js-signature': [signature], '[data-magnetic]': [cta] }
  const document = {
    querySelector: (selector) => singles[selector] ?? null,
    querySelectorAll: (selector) => lists[selector] ?? [],
    getElementById: () => null,
  }
  const runtime = controller(document, { window: { scrollY: 0, innerWidth: 1440, innerHeight: 900 } })
  runtime.api.initSignatures()
  runtime.api.initReveals()
  return { ...runtime, ...parts, wordElements, hint, cta, signature }
}

const entryEnd = ({ at, vars }) => at + (vars.duration ?? 0)
const wordWipe = (page) => page.calls.find(({ kind, target }) => kind === 'fromTo' && target === page.wordElements)
const penWrite = (page) => page.timelines[0].entries.find(({ target, vars }) =>
  target === page.pen && vars.motionPath?.path === page.writePath)
// "inset(top right bottom left)" as numbers, to read the wipe geometry back.
const insets = (value) => {
  const [top, right, bottom, left] = value.match(/inset\(([^)]*)\)/)[1].trim().split(/\s+/).map(parseFloat)
  return { top, right, bottom, left }
}

test('hero words are written left to right by a clip wipe, with no flight, spin or scale', () => {
  const wipe = wordWipe(heroPage())
  assert.ok(wipe, 'the headline words animate as one staggered group')
  const motion = /^(?:x|y|z|xPercent|yPercent|scale\w*|rotat\w*|skew\w*)$/
  for (const side of [wipe.from, wipe.to]) {
    assert.deepEqual(Object.keys(side).filter((name) => motion.test(name)), [], 'words never fly, spin or scale')
  }
  const hidden = insets(wipe.from.clipPath)
  const shown = insets(wipe.to.clipPath)
  // inset(top right bottom left): only the right edge travels, so the reveal runs left to right.
  assert.ok(hidden.right >= 100, 'the whole word starts clipped away')
  assert.ok(shown.right <= 0, 'nothing stays clipped on the right once written')
  for (const side of ['top', 'bottom', 'left']) assert.equal(hidden[side], shown[side], `only the right edge moves (${side})`)
  for (const side of ['top', 'right', 'bottom', 'left']) {
    assert.ok(shown[side] < 0, `a negative ${side} inset keeps Mansalva overhangs and descenders unclipped at rest`)
  }
  assert.equal(wipe.from.autoAlpha, 1, 'the clip hides the word, so the .has-motion opacity gate cannot flash it')
  assert.equal(wipe.to.autoAlpha, 1, 'every word ends visible')
  assert.ok(typeof wipe.to.stagger === 'number' && wipe.to.stagger > 0, 'words are written in reading order')
  assert.equal(wipe.to.clearProps, 'clipPath', 'only the clip is removed afterwards, never the opacity that keeps the word shown')
})

test('a long headline tightens its stagger so it is still written by 0.85 s', () => {
  for (const words of [1, 5, 12]) {
    const { to } = wordWipe(heroPage({ words }))
    const end = (to.delay ?? 0) + (words - 1) * to.stagger + to.duration
    assert.ok(end <= 0.85, `${words} words end at ${end.toFixed(2)} s`)
  }
})

test('the 1.25 s intro budget covers words, signature, underline and pen lift; the arrow follows its own pinned timing', () => {
  const page = heroPage()
  const [timeline] = page.timelines
  assert.ok(timeline.entries.length > 0 && timeline.entries.every(({ at }) => typeof at === 'number'),
    'every signature tween sits at an absolute time')
  const { to: words } = wordWipe(page)
  const lastWordStart = (words.delay ?? 0) + (page.wordElements.length - 1) * words.stagger
  const wordsEnd = lastWordStart + words.duration
  const signatureStart = Math.min(...timeline.entries.map(({ at }) => at))
  const signatureEnd = Math.max(...timeline.entries.map(entryEnd))
  // The arrow under the hero is outside this budget: it keeps its production timing, pinned by its own guard test below.
  const end = Math.max(wordsEnd, signatureEnd)
  assert.ok(end <= 1.25, `the intro ends at ${end.toFixed(2)} s`)
  assert.ok(end >= 1.1, `the intro really uses its budget (ends at ${end.toFixed(2)} s)`)
  assert.ok(signatureStart >= lastWordStart && signatureStart < wordsEnd,
    'the signature starts while the last words are still being written')
  const arrow = page.calls.find(({ kind, target }) => kind === 'fromTo' && target === page.hint)
  assert.ok(arrow.to.delay > end, 'the arrow enters after the written intro is over, on its own timing')
})

test('the signature clip starts closed and wipes open in step with the pen along the writing path', () => {
  const page = heroPage()
  const closed = page.calls.find(({ kind, target }) => kind === 'set' && target === page.clip)
  assert.equal(closed?.from.attr?.width, 0, 'motion mode closes the clip before the signature plays')
  assert.ok(page.calls.indexOf(closed) < page.calls.findIndex(({ kind }) => kind === 'play'), 'closed before it plays')
  const wipe = page.timelines[0].entries.find(({ target }) => target === page.clip)
  const pen = penWrite(page)
  assert.ok(wipe && pen, 'the wipe and the pen both run')
  assert.equal(wipe.vars.attr.width, 560)
  assert.equal(wipe.at, pen.at, 'they start together')
  assert.equal(wipe.vars.duration, pen.vars.duration, 'and take the same time')
  assert.ok(wipe.vars.ease, 'the ease is named on the wipe')
  assert.equal(wipe.vars.ease, pen.vars.ease, 'and is the same ease, so they cannot drift apart')
})

test('a signature with nothing to write along keeps its clip as authored, so its word is never left hidden', () => {
  const page = heroPage({ writing: false })
  assert.ok(!page.calls.some(({ target }) => target === page.clip), 'the clip is not closed when nothing would open it')
  assert.ok(!page.timelines[0].entries.some(({ target }) => target === page.clip), 'and no wipe is scheduled')
  assert.equal(page.clip.attributes.width, '560')
  const fades = page.timelines[0].entries.filter(({ target, vars }) => target === page.pen && 'autoAlpha' in vars)
  assert.equal(fades.at(-1).vars.autoAlpha, 0, 'the pen still lifts at the end')
})

test('the signature pen is hidden before it plays, shown only while it writes, and ends hidden', () => {
  for (const variant of ['hero', 'footer']) {
    const page = heroPage({ variant, top: variant === 'hero' ? 0 : 2400 })
    const hidden = page.calls.findIndex(({ kind, target, from }) => kind === 'set' && target === page.pen && from.autoAlpha === 0)
    assert.ok(hidden >= 0, `${variant}: the pen is hidden up front`)
    if (variant === 'footer') page.triggers.find(({ config }) => config.trigger === page.signature).config.onEnter()
    assert.ok(page.calls.findIndex(({ kind }) => kind === 'play') > hidden, `${variant}: hidden before the signature plays`)
    const { entries } = page.timelines[0]
    const fades = entries.filter(({ target, vars }) => target === page.pen && 'autoAlpha' in vars)
    assert.equal(fades[0].vars.autoAlpha, 1, `${variant}: the pen appears when it starts writing`)
    assert.equal(fades[0].at, Math.min(...entries.map(({ at }) => at)), `${variant}: and not before`)
    const last = fades.at(-1)
    assert.equal(last.vars.autoAlpha, 0, `${variant}: the last thing the pen does is lift`)
    assert.ok(!entries.some((entry) => entry.target === page.pen && entry.at > last.at), `${variant}: nothing moves the pen after it lifts`)
    assert.ok(Math.abs(entryEnd(last) - Math.max(...entries.map(entryEnd))) < 1e-9,
      `${variant}: the timeline ends with the pen hidden`)
  }
})

test('the footer signature keeps the hero character, a little slower, and waits to scroll into view', () => {
  const footer = heroPage({ variant: 'footer', top: 2400 })
  assert.equal(footer.calls.some(({ kind }) => kind === 'play'), false, 'below the fold it waits')
  const trigger = footer.triggers.find(({ config }) => config.trigger === footer.signature)
  assert.equal(trigger.config.once, true)
  assert.equal(trigger.config.start, 'top 99%')
  trigger.config.onEnter()
  assert.equal(footer.calls.filter(({ kind }) => kind === 'play').length, 1)
  const [footerWrite, heroWrite] = [footer, heroPage()].map(penWrite)
  assert.ok(footerWrite.vars.duration >= 0.6 && footerWrite.vars.duration <= 0.8, 'about 0.7 s')
  assert.ok(footerWrite.vars.duration > heroWrite.vars.duration)
  assert.equal(footerWrite.vars.ease, heroWrite.vars.ease, 'the same character')
})

test('the only endless tween is the arrow bounce, and everything else stays finite', () => {
  const page = heroPage()
  // Every tween the controller schedules, with the target it moves: direct tweens, then each timeline and its entries.
  const withTarget = (target, sides) => sides.filter(Boolean).map((vars) => ({ target, vars }))
  const tweens = [
    ...page.calls.flatMap(({ target, from, to }) => withTarget(target, [from, to])),
    ...page.timelines.flatMap(({ vars, entries }) => [
      ...withTarget(undefined, [vars]),
      ...entries.flatMap(({ target, from, vars: props }) => withTarget(target, [from, props])),
    ]),
  ]
  assert.ok(tweens.length > 10, 'the intro schedules real tweens')
  const endless = ({ vars }) => vars.repeat < 0 || vars.repeat === Infinity
  const loops = tweens.filter(endless)
  assert.equal(loops.length, 1, 'exactly one tween never ends')
  assert.equal(loops[0].target, page.hint, 'and it is the arrow bounce')
  assert.equal(loops[0].vars.yoyo, true)
  for (const tween of tweens.filter(({ target }) => target !== page.hint)) {
    assert.ok(!endless(tween), 'no other tween repeats forever')
    assert.notEqual(tween.vars.yoyo, true, 'no other tween bounces back and forth')
  }
})

// Owner-pinned design rule (AGENTS.md): the arrow under the hero keeps its production animation. Do not weaken,
// invert or delete this test to fit a redesign; only the owner can lift the rule.
test('the scroll hint enters and bounces exactly as on production', () => {
  // The vars are built inside the vm realm: a JSON round trip lets deepEqual compare every key, not only the ones named.
  const plain = (vars) => JSON.parse(JSON.stringify(vars))
  const page = heroPage()
  const arrow = page.calls.filter(({ target }) => target === page.hint)
  assert.equal(arrow.length, 2, 'an entrance and a bounce, and nothing else moves the arrow')
  const [entrance, bounce] = arrow
  assert.equal(entrance.kind, 'fromTo', 'the entrance is created first, as on production')
  assert.deepEqual(plain(entrance.from), { autoAlpha: 0, y: -6 })
  assert.deepEqual(plain(entrance.to), { autoAlpha: 1, y: 0, duration: 0.6, delay: 1.4 })
  assert.equal(bounce.kind, 'to')
  assert.deepEqual(plain(bounce.to), { y: 8, duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.8 })

  // Teardown: both tweens belong to the controller's gsap context, so reverting it is what stops the endless bounce.
  const state = lifecycle()
  const bounces = () => state.calls.filter(({ target, to }) => target === state.hint && to?.repeat < 0)
  const running = () => bounces().filter((call) => !call.killed)
  state.document.dispatch('astro:page-load')
  state.frames.flush()
  assert.equal(running().length, 1, 'one bounce runs once the page has loaded')
  state.document.dispatch('astro:before-swap')
  assert.equal(bounces().length, 1)
  assert.equal(running().length, 0, 'leaving the page stops the endless bounce')
  state.document.dispatch('astro:page-load')
  state.frames.flush()
  assert.equal(bounces().length, 2, 'coming back starts a new bounce')
  assert.equal(running().length, 1, 'exactly one runs: none is left running on the node that was swapped out')
  state.document.dispatch('astro:page-load')
  state.frames.flush()
  assert.equal(bounces().length, 3)
  assert.equal(running().length, 1, 'a repeated page load stops the old bounce before it starts its own')

  // Reduced motion never moves the arrow: it is simply there, visible and still.
  const still = lifecycle({ reduced: true })
  still.document.dispatch('astro:page-load')
  still.frames.flush()
  assert.ok(!still.calls.some(({ target }) => target === still.hint), 'no tween ever runs on the arrow')
  assert.equal(still.hint.style.opacity, '1')
  assert.equal(still.hint.style.transform, 'none')
})

test('secondary reveals are short fades with a small rise, never lateral or rotated', () => {
  const reveals = ['title', 'copy', 'left', 'right'].map((type, index) => {
    // Wide blocks with room on both sides: the old left/right entrances would have slid in from the margins.
    const el = new ElementDouble({ left: 200, top: 400 + index * 300, width: 700, height: 200 })
    el.dataset.reveal = type
    return el
  })
  const document = {
    querySelector: () => null,
    querySelectorAll: (selector) => selector === '[data-reveal]' ? reveals : [],
  }
  const { api, calls } = controller(document, { window: { scrollY: 0, innerWidth: 1440, innerHeight: 900 } })
  api.initReveals()
  for (const el of reveals) {
    const { from, to } = calls.find(({ target }) => target === el)
    const name = el.dataset.reveal
    assert.equal(from.autoAlpha, 0)
    assert.equal(to.autoAlpha, 1)
    assert.equal(from.x, 0, `${name}: no lateral entrance`)
    assert.equal(to.x, 0)
    assert.equal(from.rotate, 0, `${name}: no tilt`)
    assert.equal(to.rotate, 0)
    assert.ok(from.y > 0 && from.y <= 12, `${name}: a small rise (${from.y}px)`)
    assert.equal(to.y, 0)
    assert.ok(to.duration >= 0.4 && to.duration <= 0.6, `${name}: short (${to.duration}s)`)
    assert.equal(to.ease, 'power2.out')
    assert.equal(to.scrollTrigger.start, 'top 90%')
  }
})

test('cards rise a few pixels with a short stagger and are never hidden', () => {
  const cards = [new ElementDouble(), new ElementDouble(), new ElementDouble()]
  cards.forEach((card) => { card.dataset.reveal = 'card' })
  const document = {
    querySelector: () => null,
    querySelectorAll: (selector) => selector === '[data-reveal]' || selector === "[data-reveal='card']" ? cards : [],
  }
  const { api, calls, batches } = controller(document)
  api.initReveals()
  const start = calls.find(({ kind, target }) => kind === 'set' && target === cards)
  assert.ok(start.from.y > 0 && start.from.y <= 12, 'a rise of at most 12px')
  for (const name of ['rotate', 'rotation', 'x', 'autoAlpha', 'opacity']) {
    assert.ok(!(name in start.from), `cards never start with ${name}`)
  }
  assert.equal(batches.length, 1)
  batches[0].config.onEnter(cards)
  const settle = calls.find(({ kind, target }) => kind === 'to' && target === cards)
  assert.equal(settle.to.y, 0)
  assert.ok(!('rotate' in settle.to), 'no tilt on the way back either')
  assert.ok(settle.to.duration >= 0.4 && settle.to.duration <= 0.6)
  assert.ok(settle.to.stagger >= 0.04 && settle.to.stagger <= 0.08, 'about 0.06 s')
})

test('the CTA is simply present, pulls gently toward the pointer and returns without elastic motion', () => {
  const page = heroPage()
  assert.ok(!page.calls.some(({ target }) => target === page.cta), 'no entrance: the primary action never waits for the intro')
  page.api.initCtaAndHover(new AbortController().signal)
  page.cta.dispatch('mousemove', { clientX: 212, clientY: 356 }) // 100px right of the centre, level with it
  const pull = page.calls.findLast(({ kind, target }) => kind === 'to' && target === page.cta)
  assert.ok(Math.abs(pull.to.x - 12) < 1e-9, `a 0.12 pull, got ${pull.to.x}`)
  page.cta.dispatch('mouseleave')
  const settle = page.calls.findLast(({ kind, target }) => kind === 'to' && target === page.cta)
  assert.equal(settle.to.x, 0)
  assert.equal(settle.to.y, 0)
  assert.equal(settle.to.ease, 'power3.out')
  assert.ok(settle.to.duration >= 0.4 && settle.to.duration <= 0.5)
})

test('activating the CTA moves focus to its target at once, before a sub-second scroll', () => {
  const cta = new ElementDouble({ id: 'start' })
  cta.href = '#projects'
  const destination = new ElementDouble({ id: 'projects', top: 460, width: 390, height: 440 })
  const document = {
    querySelector: (selector) => selector === '#start' ? cta : null,
    querySelectorAll: () => [],
    getElementById: (id) => id === 'projects' ? destination : null,
  }
  const { api, calls } = controller(document)
  let scrollsWhenFocused
  destination.focus = (options) => {
    destination.focused.push(options)
    scrollsWhenFocused = calls.filter(({ to }) => to?.scrollTo).length
  }
  api.initCtaAndHover(new AbortController().signal)
  assert.equal(cta.dispatch('click').defaultPrevented, true)
  // Options are built inside the vm realm, so compare their fields rather than the (cross-realm) object.
  assert.equal(destination.focused.length, 1, 'focus moves exactly once')
  assert.equal(destination.focused[0].preventScroll, true, 'moving focus must not jump the page ahead of the animated scroll')
  assert.equal(scrollsWhenFocused, 0, 'focus never waits for the scroll animation')
  const scroll = calls.find(({ to }) => to?.scrollTo)
  assert.equal(scroll.to.scrollTo.y, 444)
  assert.ok(scroll.to.duration <= 1, `the scroll takes ${scroll.to.duration}s`)
  assert.equal(destination.attributes.tabindex, '-1', 'a target that cannot take focus yet becomes a programmatic focus target')
  destination.attributes.tabindex = '0'
  cta.dispatch('click')
  assert.equal(destination.attributes.tabindex, '0', 'an existing tabindex is never overwritten')
})

// A hero plus selected work, and the ink overlay the trail is drawn into.
function trailPage(width) {
  const height = 1800
  const hero = new ElementDouble({ width, height: 460, hero: true })
  const cta = new ElementDouble({ left: width / 2 - 112, top: 330, width: 224, height: 52 })
  const selection = new ElementDouble({ id: 'projects', top: 460, width, height: 440 })
  const margin = width < 640 ? 24 : 144
  const grid = new ElementDouble({ left: margin, top: 550, width: width - margin * 2, height: 300 })
  const card = new ElementDouble({ left: margin, top: 550, width: grid.offsetWidth, height: 300 })
  card.parentElement = grid
  const art = new ElementDouble({ left: margin, top: 550, width: grid.offsetWidth, height: 200 })
  art.selectors['svg, img'] = art
  card.selectors['.project-artwork'] = art
  selection.selectors['.project-card'] = [card]
  selection.selectors['[data-trail-content]'] = grid
  const main = new ElementDouble()
  main.children = [hero, selection]
  const path = new ElementDouble()
  const splatters = new ElementDouble()
  const root = new ElementDouble()
  Object.assign(root.selectors, {
    svg: new ElementDouble(), '#ink-path': path, '#ink-path-shadow': new ElementDouble(),
    '#ink-pen': new ElementDouble(), '#ink-splatters': splatters,
  })
  const document = {
    querySelector: (selector) => ({ main, '#start': cta, '#ink-trail': root })[selector] ?? null,
    createRange: () => ({ selectNodeContents() {}, getBoundingClientRect: () => ({ width: 0 }) }),
    createElementNS: () => new ElementDouble(),
    documentElement: { clientWidth: width, clientHeight: 900, scrollHeight: height },
    body: { offsetHeight: height },
  }
  const runtime = controller(document, { window: { scrollY: 0, innerWidth: width, innerHeight: 900 } })
  const layout = { width, height, vw: width, vh: 900, gutter: Math.min(48, Math.max(20, width * 0.04)), mobile: width < 640 }
  return { ...runtime, path, splatters, layout }
}

test('ink blots sit exactly on the stroke: one per turn, sized to the line, revealed as the pen passes', () => {
  for (const width of [1440, 390]) {
    const { api, path, splatters, layout, timelines } = trailPage(width)
    api.initInkTrail()
    const turns = api.buildTrailRoute(layout).filter(({ blot }) => blot)
    assert.ok(turns.length >= 2, `${width}px: the route has turns to mark`)
    const blots = splatters.children
    assert.equal(blots.length, turns.length, `${width}px: exactly one blot per marked turn`)
    const stroke = Number(path.attributes['stroke-width'])
    const curve = sampleCurve(path.attributes.d)
    blots.forEach((blot, index) => {
      const gap = Math.min(...curve.map(({ x, y }) => Math.hypot(x - Number(blot.attributes.cx), y - Number(blot.attributes.cy))))
      assert.ok(gap < 0.1, `${width}px: blot ${index} floats ${gap.toFixed(2)}px off the stroke`)
      const radius = Number(blot.attributes.r)
      assert.ok(radius >= stroke * 0.9 && radius <= stroke * 1.2, `${width}px: radius ${radius} against a ${stroke}px line`)
      assert.equal(blot.style.fill, 'var(--color-accent)', 'accent ink, from the token')
      assert.equal(blot.attributes.opacity, '0', 'a blot starts hidden')
    })
    const reveals = timelines.at(-1).entries.filter(({ target }) => blots.includes(target))
    assert.equal(reveals.length, blots.length, 'each blot is revealed once, by the pen')
    for (const { vars } of reveals) assert.ok(Math.abs(vars.opacity - 0.7) <= 0.05, `revealed at ink opacity, got ${vars.opacity}`)
  }
})

test('the legacy sketch animation and its orphan component are gone', () => {
  assert.doesNotMatch(source, /initSketch|\.firma\b|Combined-Shape/)
  assert.doesNotMatch(readFileSync(new URL('../src/global.css', import.meta.url), 'utf8'), /\.firma\b/)
  assert.equal(existsSync(new URL('../src/components/svgs/Drawing.astro', import.meta.url)), false)
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
  const signaturePen = new ElementDouble()
  const writePath = new ElementDouble()
  const clip = new ElementDouble()
  const signature = new ElementDouble()
  signature.selectors['[data-draw]'] = [signaturePath]
  signature.selectors['.signature-clip'] = clip
  signature.selectors['.signature-word'] = signatureWord
  signature.selectors['.signature-write-path'] = writePath
  signature.selectors['.signature-pen'] = signaturePen
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
  // Nothing but JavaScript hides the pen in this state: an unstyled pen is fully visible.
  signaturePen.style.opacity = '1'
  const singles = { '#start': cta, '#ink-trail': root, '#ink-pen': pen, '.js-scroll-hint': hint }
  const collections = {
    '.js-signature': [signature], '.js-hero-title span': [word], '[data-reveal]': [copy],
    '[data-magnetic]': [cta], '.signature-clip': [clip], '.js-signature .signature-pen': [signaturePen],
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
    cta, destination, hint, visibleContent, paths, clip, pen, signaturePen }
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
    assert.ok([undefined, '', 'none'].includes(element.style.clipPath), 'a finished headline is never left clipped')
  }
  // The arrow under the hero is owner-pinned (AGENTS.md): with reduced motion it is visible and still, and nothing moves it.
  assert.equal(state.hint.style.opacity, '1', 'the arrow stays visible')
  assert.equal(state.hint.style.transform, 'none', 'and still')
  assert.ok(!state.calls.some(({ target }) => target === state.hint), 'no tween ever runs on the arrow')
  assert.equal(state.pen.style.opacity, '0')
  assert.equal(state.signaturePen.style.opacity, '0', 'the signature pen is a motion-only prop: static mode must not show it')
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
