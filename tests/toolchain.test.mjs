import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

test('pins the verified package manager and a test-compatible Node runtime', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(manifest.packageManager, 'pnpm@11.5.2')
  assert.equal(manifest.engines.node, '>=24')
  assert.equal(manifest.scripts.test, 'node --test tests/*.test.mjs')
})

test('CI declares read-only permissions and the same frozen-install/current-source checks', () => {
  const workflow = readFileSync(new URL('../.github/workflows/quality.yml', import.meta.url), 'utf8')
  for (const required of ['pull_request:', 'push:', 'contents: read', 'persist-credentials: false',
    'actions/checkout@v7', 'pnpm/action-setup@v6', 'actions/setup-node@v7', "node-version: '24'",
    'cache: pnpm', 'cache-dependency-path: pnpm-lock.yaml', 'pnpm install --frozen-lockfile', 'pnpm test']) {
    assert.ok(workflow.includes(required), `CI must declare ${required}`)
  }
  assert.ok(workflow.indexOf('pnpm/action-setup@v6') < workflow.indexOf('actions/setup-node@v7'),
    'pnpm must exist before setup-node queries the package store for caching')
  assert.ok(workflow.indexOf('pnpm install --frozen-lockfile') < workflow.indexOf('run: pnpm test'))
})

test('every component under src/components is imported by another source file', () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const filesUnder = (directory) => readdirSync(join(root, directory), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
  const sources = filesUnder('src').map((file) => [file, readFileSync(file, 'utf8')])
  // Specifiers end with `/<Component>.astro` and a closing quote, whatever alias or relative prefix they use.
  // Matching is by file name, so two components sharing a name in different folders would mask each other.
  const isImported = (component) => {
    const name = basename(component)
    return sources.some(([file, text]) => file !== component
      && [`/${name}"`, `/${name}'`].some((specifier) => text.includes(specifier)))
  }
  const orphans = filesUnder('src/components')
    .filter((file) => file.endsWith('.astro') && !isImported(file))
    .map((file) => relative(root, file))
    .sort()
  assert.deepEqual(orphans, [], 'delete these components or import them from another source file')
})
