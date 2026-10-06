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
