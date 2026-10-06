import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

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
