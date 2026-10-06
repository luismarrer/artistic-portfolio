interface ContactElements {
  form: HTMLFormElement
  button: HTMLButtonElement
  status: HTMLElement
}

interface ContactDependencies {
  fetch?: typeof globalThis.fetch
  createFormData?: (form: HTMLFormElement) => FormData
}

const enhancers = new WeakMap<HTMLFormElement, () => void>()
const lifecycles = new WeakMap<Document, () => void>()
const errorMessage = 'Your message was not sent. Your entries are still here; please try again.'

/** Enhance a native POST form; importing this module does not access the DOM or send requests. */
export function enhanceContactForm(
  { form, button, status }: ContactElements,
  dependencies: ContactDependencies = {},
): () => void {
  const existing = enhancers.get(form)
  if (existing) return existing

  const send = dependencies.fetch ?? globalThis.fetch
  const createBody = dependencies.createFormData ?? ((form: HTMLFormElement) => new FormData(form))
  const initialLabel = button.textContent
  const initialDisabled = button.disabled
  let active = true
  let pending = false
  let request: AbortController | undefined

  const announce = (state: 'pending' | 'success' | 'error', message: string) => {
    status.hidden = false
    status.dataset.state = state
    status.textContent = message
  }
  const restoreControl = () => {
    button.disabled = initialDisabled
    button.textContent = initialLabel
    form.setAttribute('aria-busy', 'false')
    pending = false
  }

  const onSubmit = async (event: Event) => {
    event.preventDefault()
    if (!active || form.dataset.contactMode !== 'live' || pending) return
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    // Read the explicit attribute: form.action silently falls back to the current page when absent.
    const endpoint = form.getAttribute('action')
    if (!endpoint) {
      announce('error', errorMessage)
      return
    }

    pending = true
    const controller = new AbortController()
    request = controller
    button.disabled = true
    button.textContent = 'Sending…'
    form.setAttribute('aria-busy', 'true')
    announce('pending', 'Sending your message…')

    try {
      const response = await send(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: createBody(form),
        signal: controller.signal,
      })
      if (!active || request !== controller) return
      if (response.ok) {
        form.reset()
        announce('success', 'Thank you — your message has been sent.')
      } else {
        announce('error', errorMessage)
      }
    } catch {
      if (active && request === controller) announce('error', errorMessage)
    } finally {
      if (active && request === controller) {
        request = undefined
        restoreControl()
      }
    }
  }

  const dispose = () => {
    if (!active) return
    active = false
    form.removeEventListener('submit', onSubmit)
    request?.abort()
    request = undefined
    if (pending) restoreControl()
    enhancers.delete(form)
  }
  form.addEventListener('submit', onSubmit)
  enhancers.set(form, dispose)
  return dispose
}

/** Own one form enhancement across Astro swaps, including repeated page-load notifications. */
export function bootContactForm(
  document: Document = globalThis.document,
  dependencies: ContactDependencies = {},
): () => void {
  const existing = lifecycles.get(document)
  if (existing) return existing
  let active = true
  let currentForm: HTMLFormElement | null = null
  let disposeForm: (() => void) | undefined

  const teardown = () => {
    disposeForm?.()
    disposeForm = undefined
    currentForm = null
  }
  const initialize = () => {
    const form = document.getElementById('contact-form') as HTMLFormElement | null
    if (form === currentForm) return
    teardown()
    const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]')
    const status = document.getElementById('form-status')
    if (!form || !button || !status) return
    currentForm = form
    disposeForm = enhanceContactForm({ form, button, status }, dependencies)
  }
  const dispose = () => {
    if (!active) return
    active = false
    teardown()
    document.removeEventListener('astro:page-load', initialize)
    document.removeEventListener('astro:before-swap', teardown)
    lifecycles.delete(document)
  }

  document.addEventListener('astro:page-load', initialize)
  document.addEventListener('astro:before-swap', teardown)
  lifecycles.set(document, dispose)
  initialize()
  return dispose
}
