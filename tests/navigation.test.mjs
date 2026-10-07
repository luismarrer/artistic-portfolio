import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isCurrentPage } from '../src/data/navigation.ts'

test('a destination is current when it is the page being viewed, with or without a trailing slash', () => {
  assert.equal(isCurrentPage('/portfolio', '/portfolio'), true)
  assert.equal(isCurrentPage('/portfolio', '/portfolio/'), true, 'a static build emits directory-style paths')
  assert.equal(isCurrentPage('/portfolio/', '/portfolio'), true, 'a configured trailing slash does not matter either')
  assert.equal(isCurrentPage('/contact', '/contact/'), true)
  assert.equal(isCurrentPage('/', '/'), true, 'the root stays the root once the slash is trimmed')
})

test('another page, a case page or a longer path is not the current page', () => {
  assert.equal(isCurrentPage('/portfolio', '/contact'), false)
  assert.equal(isCurrentPage('/portfolio', '/portfolio/extra'), false, 'a prefix is not the page')
  assert.equal(isCurrentPage('/portfolio', '/projects/1'), false)
  assert.equal(isCurrentPage('/', '/portfolio'), false)
  assert.equal(isCurrentPage('/contact', '/'), false)
})

test('a section, a query, another origin or a protocol-relative URL never claims to be the current page', () => {
  assert.equal(isCurrentPage('/#about', '/'), false, 'a section of the home page is not a page')
  assert.equal(isCurrentPage('#about', '/'), false)
  assert.equal(isCurrentPage('/portfolio#top', '/portfolio'), false)
  assert.equal(isCurrentPage('/portfolio?sort=new', '/portfolio'), false)
  assert.equal(isCurrentPage('https://example.org/portfolio', '/portfolio'), false)
  assert.equal(isCurrentPage('//example.org/portfolio', '/portfolio'), false)
  assert.equal(isCurrentPage('//', '/'), false, 'a bare protocol-relative URL trims to the root but is not the home page')
  assert.equal(isCurrentPage('///', '/'), false)
})
