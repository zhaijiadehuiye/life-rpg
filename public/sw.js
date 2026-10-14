// Only static resources are cached; user data stays in its existing stores.
const CACHE_PREFIX = `life-os:${self.registration.scope}:`
const CACHE_NAME = `${CACHE_PREFIX}__BUILD_ID__`
const APP_SHELL = /* __PRECACHE__ */ ['./', './personal-historian/index.html', './personal-historian/styles.css', './personal-historian/app.js', './personal-historian/favicon.svg']
const STATIC_URLS = new Set(APP_SHELL.map((path) => new URL(path, self.registration.scope).href))

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then((cache) => cache.addAll(APP_SHELL))
    .then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  // Leave other applications, subpath installations and personal databases alone.
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key))))
    .then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  url.search = ''
  url.hash = ''
  if (!STATIC_URLS.has(url.href)) return
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(url.href)
    if (cached) return cached
    // Missing JS/CSS must never be replaced with React HTML.
    return fetch(event.request)
  }))
})
