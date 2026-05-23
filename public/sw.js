// MedIntel Service Worker — rural-optimized offline shell
// Strategies:
//   App shell (_next/static, fonts, offline page) → CacheFirst
//   API reads (doctors/online, appointments list) → StaleWhileRevalidate
//   Navigation → NetworkFirst with /offline fallback
//   Everything else → NetworkFirst

const CACHE_VERSION = 'v1'
const SHELL_CACHE   = `medintel-shell-${CACHE_VERSION}`
const API_CACHE     = `medintel-api-${CACHE_VERSION}`

// Only precache truly static, always-200 URLs.
// Auth-protected pages (/, /intake) redirect to login → cache.addAll fails on non-2xx → SW install aborts.
const SHELL_PRECACHE = [
  '/offline',
  '/manifest.json',
]

// On install: precache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_PRECACHE))
  )
  self.skipWaiting()
})

// On activate: delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests (skip third-party: stripe, twilio, etc.)
  if (url.origin !== self.location.origin) return

  // ── Static assets: CacheFirst ─────────────────────────────────────────────
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE))
    return
  }

  // ── Stale-safe API reads: StaleWhileRevalidate ────────────────────────────
  if (
    request.method === 'GET' && (
      url.pathname === '/api/doctors/online' ||
      url.pathname.startsWith('/api/appointments') ||
      url.pathname.startsWith('/api/doctor/queue')
    )
  ) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE))
    return
  }

  // ── Mutations: network only (never cache POST/PATCH/DELETE) ───────────────
  if (request.method !== 'GET') return

  // ── Navigation: NetworkFirst + offline fallback ───────────────────────────
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }

  // ── Everything else: NetworkFirst ─────────────────────────────────────────
  event.respondWith(networkFirst(request, SHELL_CACHE))
})

// ── Strategy helpers ─────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)
  // If cached: return immediately, revalidate in background.
  // If not cached: wait for network. Serve offline sentinel only on network failure (null).
  if (cached) {
    fetchPromise // background refresh, result discarded here
    return cached
  }
  const fresh = await fetchPromise
  return fresh ?? new Response('{"error":"offline"}', {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? new Response('Offline', { status: 503 })
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    return await fetch(request)
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return (await caches.match('/offline')) ?? new Response('Offline', { status: 503 })
  }
}
