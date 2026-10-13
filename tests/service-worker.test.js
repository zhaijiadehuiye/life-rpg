// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

function worker() {
  const scope = 'https://example.test/life-rpg/'
  const prefix = `life-os:${scope}:`
  const handlers = {}
  const cache = { addAll: vi.fn(async () => {}), match: vi.fn(async () => undefined) }
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => [`${prefix}old`, `${prefix}test`, 'another-app', 'life-os:https://example.test/other/:old']),
    delete: vi.fn(async () => true),
  }
  const fetch = vi.fn(async () => { throw new Error('offline') })
  const self = {
    registration: { scope }, clients: { claim: vi.fn(async () => {}) },
    skipWaiting: vi.fn(async () => {}), addEventListener: (type, handler) => { handlers[type] = handler },
  }
  const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
    .replace('__BUILD_ID__', 'test')
    .replace(/\/\* __PRECACHE__ \*\/ \[[^\n]*\]/, JSON.stringify(['./', './assets/app.js', './personal-historian/', './personal-historian/index.html', './personal-historian/app.js']))
  runInNewContext(source, { self, caches, fetch, URL, Set })
  return { scope, prefix, handlers, cache, caches, fetch }
}

describe('scoped offline application shell', () => {
  it('precaches both modules before first historian visit', async () => {
    const w = worker()
    let complete
    w.handlers.install({ waitUntil: (promise) => { complete = promise } })
    await complete
    expect(w.cache.addAll.mock.calls[0][0]).toContain('./personal-historian/index.html')
    expect(w.cache.addAll.mock.calls[0][0]).toContain('./assets/app.js')
  })
  it('cleans only earlier Life OS caches in this scope', async () => {
    const w = worker()
    let complete
    w.handlers.activate({ waitUntil: (promise) => { complete = promise } })
    await complete
    expect(w.caches.delete.mock.calls).toEqual([[`${w.prefix}old`]])
  })
  it('serves historian offline from its exact cached resource under the Pages subpath', async () => {
    const w = worker()
    w.cache.match.mockResolvedValue('historian-script')
    let response
    w.handlers.fetch({ request: { method: 'GET', url: `${w.scope}personal-historian/app.js?v=6` }, respondWith: (promise) => { response = promise } })
    expect(await response).toBe('historian-script')
    expect(w.cache.match).toHaveBeenCalledWith(`${w.scope}personal-historian/app.js`)
    expect(w.fetch).not.toHaveBeenCalled()
  })
  it('resolves HashRouter navigation to the cached root document', async () => {
    const w = worker()
    w.cache.match.mockResolvedValue('root-html')
    let response
    w.handlers.fetch({ request: { method: 'GET', url: `${w.scope}#/historian` }, respondWith: (promise) => { response = promise } })
    expect(await response).toBe('root-html')
    expect(w.cache.match).toHaveBeenCalledWith(w.scope)
  })
  it('does not turn a missing script into HTML', async () => {
    const w = worker()
    let response
    w.handlers.fetch({ request: { method: 'GET', url: `${w.scope}personal-historian/app.js` }, respondWith: (promise) => { response = promise } })
    await expect(response).rejects.toThrow('offline')
    expect(w.cache.match).toHaveBeenCalledTimes(1)
  })
  it('does not intercept other apps, user backups or writes', () => {
    const w = worker()
    const respondWith = vi.fn()
    for (const [method, url] of [['GET', 'https://example.test/other/'], ['GET', `${w.scope}private-backup.json`], ['POST', `${w.scope}personal-historian/app.js`]]) {
      w.handlers.fetch({ request: { method, url }, respondWith })
    }
    expect(respondWith).not.toHaveBeenCalled()
  })
})
