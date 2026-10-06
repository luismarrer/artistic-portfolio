import assert from 'node:assert/strict'
import { getEventListeners } from 'node:events'
import { setImmediate } from 'node:timers/promises'
import { test } from 'node:test'
import { enhanceContactForm, bootContactForm } from '../src/scripts/contact-form.ts'

class ElementDouble extends EventTarget {
  attributes = new Map()
  dataset = {}
  textContent = ''
  hidden = false
  setAttribute(name, value) { this.attributes.set(name, String(value)) }
  getAttribute(name) { return this.attributes.get(name) ?? null }
}

class FormDouble extends ElementDouble {
  valid = true
  validityReports = 0
  resets = 0
  values = { name: 'A visitor', email: 'visitor@example.org', subject: 'Artwork', message: 'A question.' }
  checkValidity() { return this.valid }
  reportValidity() { this.validityReports += 1; return this.valid }
  reset() { this.resets += 1; this.values = {} }
  querySelector(selector) { return selector === 'button[type="submit"]' ? this.button : null }
}

const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const flush = () => setImmediate()
const submit = (form) => {
  const event = new Event('submit', { cancelable: true })
  form.dispatchEvent(event)
  return event
}

function fixture({ mode = 'live', fetch = async () => new Response(null, { status: 200 }) } = {}) {
  const form = new FormDouble()
  const button = new ElementDouble()
  button.textContent = 'Send Message'
  button.disabled = mode === 'demo'
  form.button = button
  form.dataset.contactMode = mode
  if (mode === 'live') form.setAttribute('action', 'https://formspree.io/f/abc123')
  const status = new ElementDouble()
  const requests = []
  const dependencies = {
    fetch: (url, init) => { requests.push({ url, init }); return fetch(url, init) },
    createFormData: (element) => {
      assert.equal(element, form)
      const body = new FormData()
      for (const [key, value] of Object.entries(form.values)) body.append(key, value)
      return body
    },
  }
  const elements = { form, button, status }
  return { ...elements, elements, dependencies, requests,
    enhance: () => enhanceContactForm(elements, dependencies) }
}

test('demo submissions are prevented without creating a request or clearing input', async () => {
  const f = fixture({ mode: 'demo' })
  const dispose = f.enhance()
  assert.equal(submit(f.form).defaultPrevented, true)
  await flush()
  assert.equal(f.requests.length, 0)
  assert.equal(f.form.resets, 0)
  assert.equal(f.button.disabled, true)
  dispose()
})

test('invalid live input uses native validation and never reaches transport', async () => {
  const f = fixture()
  f.form.valid = false
  const dispose = f.enhance()
  submit(f.form)
  await flush()
  assert.equal(f.form.validityReports, 1)
  assert.equal(f.requests.length, 0)
  assert.equal(f.button.disabled, false)
  assert.equal(f.form.resets, 0)
  dispose()
})

test('valid submission locks duplicates and sends configured POST, body and abort signal', async () => {
  const pending = deferred()
  const f = fixture({ fetch: () => pending.promise })
  const dispose = f.enhance()
  submit(f.form)
  submit(f.form)
  assert.equal(f.requests.length, 1)
  const { url, init } = f.requests[0]
  assert.equal(url, 'https://formspree.io/f/abc123')
  assert.equal(init.method, 'POST')
  assert.equal(init.headers.Accept, 'application/json')
  assert.deepEqual(Object.fromEntries(init.body.entries()), f.form.values)
  assert.ok(init.signal instanceof AbortSignal)
  assert.equal(f.form.getAttribute('aria-busy'), 'true')
  assert.equal(f.button.disabled, true)
  assert.match(f.button.textContent, /Sending/)
  assert.equal(f.status.hidden, false)
  assert.equal(f.status.dataset.state, 'pending')
  assert.match(f.status.textContent, /Sending/)
  pending.resolve(new Response(null, { status: 200 }))
  await flush()
  dispose()
})

test('success resets once, announces confirmation and restores the submit control', async () => {
  const f = fixture()
  const dispose = f.enhance()
  submit(f.form)
  await flush()
  assert.equal(f.form.resets, 1)
  assert.deepEqual(f.form.values, {})
  assert.equal(f.status.dataset.state, 'success')
  assert.match(f.status.textContent, /message has been sent/i)
  assert.equal(f.form.getAttribute('aria-busy'), 'false')
  assert.equal(f.button.disabled, false)
  assert.equal(f.button.textContent, 'Send Message')
  dispose()
})

for (const failure of ['provider rejection', 'network rejection']) {
  test(`${failure} retains input, announces an error and allows a clean retry`, async () => {
    const retry = deferred()
    let calls = 0
    const f = fixture({ fetch: () => {
      calls += 1
      if (calls > 1) return retry.promise
      return failure === 'provider rejection'
        ? Promise.resolve(new Response(null, { status: 422 }))
        : Promise.reject(new TypeError('Connection unavailable'))
    } })
    const original = { ...f.form.values }
    const dispose = f.enhance()
    submit(f.form)
    await flush()
    assert.equal(f.status.dataset.state, 'error')
    assert.match(f.status.textContent, /not sent.*try again/i)
    assert.deepEqual(f.form.values, original)
    assert.equal(f.form.resets, 0)
    assert.equal(f.button.disabled, false)
    assert.equal(f.form.getAttribute('aria-busy'), 'false')
    submit(f.form)
    assert.equal(f.requests.length, 2)
    assert.equal(f.status.dataset.state, 'pending')
    assert.doesNotMatch(f.status.textContent, /not sent/i)
    retry.resolve(new Response(null, { status: 200 }))
    await flush()
    assert.equal(f.form.resets, 1)
    assert.equal(f.status.dataset.state, 'success')
    dispose()
  })
}

test('a missing live action cannot fall back to sending at the current page URL', async () => {
  const f = fixture()
  f.form.attributes.delete('action')
  const dispose = f.enhance()
  submit(f.form)
  await flush()
  assert.equal(f.requests.length, 0)
  assert.equal(f.form.resets, 0)
  assert.equal(f.status.dataset.state, 'error')
  dispose()
})

for (const completion of ['resolve', 'reject']) {
  test(`disposing aborts and ignores a late ${completion} from noncooperative transport`, async () => {
    const pending = deferred()
    const f = fixture({ fetch: () => pending.promise })
    const dispose = f.enhance()
    submit(f.form)
    const signal = f.requests[0].init.signal
    dispose()
    dispose()
    assert.equal(signal.aborted, true)
    assert.equal(getEventListeners(f.form, 'submit').length, 0)
    const state = { text: f.status.textContent, state: f.status.dataset.state,
      buttonText: f.button.textContent, disabled: f.button.disabled, busy: f.form.getAttribute('aria-busy') }
    if (completion === 'resolve') pending.resolve(new Response(null, { status: 200 }))
    else pending.reject(new Error('Too late'))
    await flush()
    assert.deepEqual({ text: f.status.textContent, state: f.status.dataset.state,
      buttonText: f.button.textContent, disabled: f.button.disabled, busy: f.form.getAttribute('aria-busy') }, state)
    assert.equal(f.form.resets, 0)
    submit(f.form)
    assert.equal(f.requests.length, 1)
  })
}

test('enhancement is idempotent and a disposed form can be enhanced again', async () => {
  const f = fixture()
  const dispose = f.enhance()
  assert.equal(f.enhance(), dispose)
  assert.equal(getEventListeners(f.form, 'submit').length, 1)
  submit(f.form)
  await flush()
  assert.equal(f.requests.length, 1)
  dispose()
  f.form.values = { message: 'A second question.' }
  const nextDispose = f.enhance()
  assert.notEqual(nextDispose, dispose)
  submit(f.form)
  await flush()
  assert.equal(f.requests.length, 2)
  nextDispose()
})

test('page-load is idempotent, before-swap disposes, and returning installs one fresh controller', async () => {
  const f = fixture()
  const document = new EventTarget()
  let current = f
  document.getElementById = (id) => id === 'contact-form' ? current?.form : id === 'form-status' ? current?.status : null
  const dispose = bootContactForm(document, f.dependencies)
  assert.equal(bootContactForm(document, f.dependencies), dispose)
  document.dispatchEvent(new Event('astro:page-load'))
  document.dispatchEvent(new Event('astro:page-load'))
  assert.equal(getEventListeners(f.form, 'submit').length, 1)
  submit(f.form)
  await flush()
  assert.equal(f.requests.length, 1)
  document.dispatchEvent(new Event('astro:before-swap'))
  assert.equal(getEventListeners(f.form, 'submit').length, 0)
  current = null
  document.dispatchEvent(new Event('astro:page-load'))
  current = f
  document.dispatchEvent(new Event('astro:page-load'))
  assert.equal(getEventListeners(f.form, 'submit').length, 1)
  submit(f.form)
  await flush()
  assert.equal(f.requests.length, 2)
  dispose()
  assert.equal(getEventListeners(document, 'astro:page-load').length, 0)
  assert.equal(getEventListeners(document, 'astro:before-swap').length, 0)
  assert.equal(getEventListeners(f.form, 'submit').length, 0)
})

test('a swap during submission aborts the old request without letting its result overwrite a new request', async () => {
  const first = deferred()
  const second = deferred()
  let requests = 0
  const f = fixture({ fetch: () => (++requests === 1 ? first.promise : second.promise) })
  const document = new EventTarget()
  document.getElementById = (id) => id === 'contact-form' ? f.form : id === 'form-status' ? f.status : null
  const dispose = bootContactForm(document, f.dependencies)
  submit(f.form)
  const oldSignal = f.requests[0].init.signal
  document.dispatchEvent(new Event('astro:before-swap'))
  assert.equal(oldSignal.aborted, true)
  document.dispatchEvent(new Event('astro:page-load'))
  submit(f.form)
  assert.equal(f.requests.length, 2)
  first.resolve(new Response(null, { status: 200 }))
  await flush()
  assert.equal(f.form.resets, 0)
  assert.equal(f.status.dataset.state, 'pending')
  assert.equal(f.button.disabled, true)
  assert.equal(f.form.getAttribute('aria-busy'), 'true')
  second.resolve(new Response(null, { status: 200 }))
  await flush()
  assert.equal(f.form.resets, 1)
  assert.equal(f.status.dataset.state, 'success')
  dispose()
})

test('calling a previous lifecycle disposer twice cannot deregister its replacement', () => {
  const document = new EventTarget()
  document.getElementById = () => null
  const oldDispose = bootContactForm(document)
  oldDispose()
  const newDispose = bootContactForm(document)
  oldDispose()
  assert.equal(bootContactForm(document), newDispose)
  assert.equal(getEventListeners(document, 'astro:page-load').length, 1)
  newDispose()
})

test('booting a page without contact elements is safe and does not require transport', () => {
  const document = new EventTarget()
  document.getElementById = () => null
  const dispose = bootContactForm(document, { fetch: () => assert.fail('No contact means no request') })
  document.dispatchEvent(new Event('astro:page-load'))
  document.dispatchEvent(new Event('astro:before-swap'))
  dispose()
})
