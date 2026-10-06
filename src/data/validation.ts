import { readFileSync, realpathSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import type { Project, SiteConfig } from './types.ts'

type RecordValue = Record<string, unknown>
interface Options { publicDirectory?: string }
const defaultPublicDirectory = resolve(process.cwd(), 'public')

function fail(path: string, message: string): never {
  throw new Error(`Invalid content at ${path}: ${message}`)
}
function record(value: unknown, path: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected an object')
  return value as RecordValue
}
function text(value: unknown, path: string, minimum = 1): asserts value is string {
  if (typeof value !== 'string' || value.trim().length < minimum) fail(path, 'expected meaningful text')
}
function list(value: unknown, path: string, nonempty = true): unknown[] {
  if (!Array.isArray(value) || (nonempty && value.length === 0)) fail(path, 'expected an array of content')
  return value
}
function bool(value: unknown, path: string) {
  if (typeof value !== 'boolean') fail(path, 'expected true or false')
}
function positiveInteger(value: unknown, path: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) fail(path, 'expected a positive safe integer')
}
function https(value: unknown, path: string): URL {
  text(value, path)
  let url: URL
  try { url = new URL(value) } catch { return fail(path, 'expected an HTTPS URL') }
  if (url.protocol !== 'https:' || url.username || url.password) fail(path, 'expected HTTPS without credentials')
  return url
}
function link(value: unknown, path: string) {
  text(value, path)
  if (/^(\/(?!\/)|#)/.test(value) && !/[\\\s]/.test(value)) return
  https(value, path)
}

/** Read intrinsic dimensions without a test/build dependency. SVGs use their viewBox. */
function dimensions(bytes: Buffer): [number, number] | undefined {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return
      const marker = bytes[offset + 1]
      if (marker === 0xd9 || marker === 0xda) return
      const length = bytes.readUInt16BE(offset + 2)
      if (length < 2 || offset + length + 2 > bytes.length) return
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)]
      }
      offset += length + 2
    }
  }
  if (bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    const format = bytes.toString('ascii', 12, 16)
    if (format === 'VP8X') return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1]
    if (format === 'VP8 ') return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff]
    if (format === 'VP8L') {
      const bits = bytes.readUInt32LE(21)
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]
    }
  }
  const svg = bytes.toString('utf8')
  const viewBox = svg.match(/<svg\b[^>]*\bviewBox=["']\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i)
  if (viewBox) return [Number(viewBox[1]), Number(viewBox[2])]
}

function image(value: unknown, path: string, directory: string, credited = false) {
  const item = record(value, path)
  text(item.src, `${path}.src`)
  text(item.alt, `${path}.alt`, 8)
  positiveInteger(item.width, `${path}.width`)
  positiveInteger(item.height, `${path}.height`)
  let decoded: string
  try { decoded = decodeURIComponent(item.src) } catch { return fail(`${path}.src`, 'invalid URL encoding') }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\?#]/.test(decoded)
    || decoded.split('/').some((part) => part === '..' || part === '.')) fail(`${path}.src`, 'expected a safe local public asset')
  let asset: string
  let root: string
  try {
    root = realpathSync(directory)
    asset = realpathSync(resolve(root, `.${decoded}`))
    if (!asset.startsWith(`${root}${sep}`) || !statSync(asset).isFile()) throw new Error('not a local file')
  } catch { return fail(`${path}.src`, 'local asset is missing or outside public/') }
  const actual = dimensions(readFileSync(asset))
  if (!actual || actual[0] !== item.width || actual[1] !== item.height) {
    fail(`${path}.dimensions`, 'width/height must match a PNG, JPEG, WebP or SVG asset')
  }
  if (credited) {
    for (const key of ['caption', 'authorName', 'sourceName']) text(item[key], `${path}.${key}`)
    for (const key of ['authorLink', 'sourceLink']) https(item[key], `${path}.${key}`)
    if (!['small', 'medium', 'large'].includes(String(item.size))) fail(`${path}.size`, 'unknown gallery size')
  }
}

export function validateSite(value: unknown, options: Options = {}): SiteConfig {
  const site = record(value, 'site')
  const directory = options.publicDirectory ?? defaultPublicDirectory
  for (const key of ['name', 'description', 'lang']) text(site[key], `site.${key}`)
  if (!/^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(String(site.lang))) fail('site.lang', 'expected a language tag')
  const publicUrl = https(site.publicUrl, 'site.publicUrl')
  if (publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash) fail('site.publicUrl', 'expected a public origin, without path/query/hash')
  image(site.logo, 'site.logo', directory)
  const signature = record(site.signature, 'site.signature')
  text(signature.label, 'site.signature.label')
  bool(signature.useDemoArtwork, 'site.signature.useDemoArtwork')
  const hero = record(site.hero, 'site.hero')
  for (const key of ['title', 'buttonLabel']) text(hero[key], `site.hero.${key}`)
  link(hero.buttonHref, 'site.hero.buttonHref')
  list(site.navigation, 'site.navigation').forEach((entry, index) => {
    const item = record(entry, `site.navigation[${index}]`)
    text(item.label, `site.navigation[${index}].label`)
    link(item.href, `site.navigation[${index}].href`)
  })
  list(site.socials, 'site.socials', false).forEach((entry, index) => {
    const item = record(entry, `site.socials[${index}]`)
    for (const key of ['name', 'icon']) text(item[key], `site.socials[${index}].${key}`)
    https(item.url, `site.socials[${index}].url`)
  })
  const footer = record(site.footer, 'site.footer')
  for (const key of ['description', 'linksTitle', 'rights']) text(footer[key], `site.footer.${key}`)
  const about = record(site.about, 'site.about')
  for (const key of ['title', 'description', 'heading', 'skillsTitle']) text(about[key], `site.about.${key}`)
  image(about.image, 'site.about.image', directory)
  for (const key of ['paragraphs', 'skills']) {
    list(about[key], `site.about.${key}`).forEach((entry, index) => text(entry, `site.about.${key}[${index}]`))
  }
  if (about.stats !== undefined) list(about.stats, 'site.about.stats', false).forEach((entry, index) => {
    const stat = record(entry, `site.about.stats[${index}]`)
    if (typeof stat.value !== 'number' || !Number.isFinite(stat.value) || stat.value < 0) fail('site.about.stats', 'values must be finite and nonnegative')
    text(stat.label, `site.about.stats[${index}].label`)
    if (typeof stat.suffix !== 'string') fail('site.about.stats', 'suffix must be text')
  })
  const pages = record(site.pages, 'site.pages')
  for (const key of ['home', 'portfolio', 'contact']) {
    const page = record(pages[key], `site.pages.${key}`)
    for (const field of ['title', 'description']) text(page[field], `site.pages.${key}.${field}`)
  }
  const contact = record(site.contact, 'site.contact')
  for (const key of ['title', 'subtitle', 'demoMessage']) text(contact[key], `site.contact.${key}`)
  if (contact.mode === 'live') {
    const endpoint = https(contact.endpoint, 'site.contact.endpoint')
    if (endpoint.hostname !== 'formspree.io' || endpoint.port || endpoint.search || endpoint.hash
      || !/^\/f\/[a-zA-Z0-9]+$/.test(endpoint.pathname)) fail('site.contact.endpoint', 'expected an explicit Formspree /f/ID endpoint')
  } else if (contact.mode !== 'demo') fail('site.contact.mode', 'expected demo or live')
  else if (contact.endpoint !== undefined) fail('site.contact.endpoint', 'remove the endpoint in demo mode')
  return site as unknown as SiteConfig
}

export function validateProjects(value: unknown, options: Options = {}): Project[] {
  const projects = list(value, 'projects')
  const ids = new Set<number>()
  projects.forEach((entry, index) => {
    const path = `projects[${index}]`
    const project = record(entry, path)
    positiveInteger(project.id, `${path}.id`)
    if (ids.has(Number(project.id))) fail(`${path}.id`, 'duplicate project identifier')
    ids.add(Number(project.id))
    for (const key of ['title', 'category', 'description', 'disclosure']) text(project[key], `${path}.${key}`)
    if (!['Reportage', 'Connected', 'Grown'].includes(String(project.image))) fail(`${path}.image`, 'unknown illustration key')
    bool(project.featured, `${path}.featured`)
    list(project.gallery, `${path}.gallery`).forEach((entry, mediaIndex) => {
      image(entry, `${path}.gallery[${mediaIndex}]`, options.publicDirectory ?? defaultPublicDirectory, true)
    })
    const editorial = record(project.editorial, `${path}.editorial`)
    for (const key of ['context', 'process', 'outcome']) text(editorial[key], `${path}.editorial.${key}`)
  })
  return projects as Project[]
}

/** The animated Musea pen path only matches the original wordmark. */
export function signatureBranding(site: SiteConfig) {
  return {
    label: site.name !== 'Musea Art' && site.signature.label === 'Musea' ? site.name : site.signature.label,
    useDemoArtwork: site.signature.useDemoArtwork && site.name === 'Musea Art' && site.signature.label === 'Musea',
  }
}
