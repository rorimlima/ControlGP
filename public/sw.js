// ============================================================
// Control GP — Service Worker v4.0
// Estratégia: Cache-First (static) | Network-First (API/auth)
// | Stale-While-Revalidate (outros) | Offline Fallback
// ============================================================

const CACHE_VERSION = 'v4';
const STATIC_CACHE  = `cgp-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `cgp-dynamic-${CACHE_VERSION}`;
const API_CACHE     = `cgp-api-${CACHE_VERSION}`;

// Recursos que sempre ficam em cache (shell do app)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// ─── Install ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const CURRENT_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !CURRENT_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET
  if (request.method !== 'GET') return;

  // Ignora protocolos não-HTTP (chrome-extension, data:, etc.)
  if (!url.protocol.startsWith('http')) return;

  // ── Supabase / API → Network First com cache offline
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.io') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/')
  ) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // ── Assets estáticos compilados (JS/CSS/img) → Cache First
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── Navegação → Network First com fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/offline.html');
        })
    );
    return;
  }

  // ── Default → Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// ─── Estratégias de Cache ────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408, statusText: 'Timeout' });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return (
      cached ||
      new Response(JSON.stringify({ error: 'offline', message: 'Sem conexão com a internet.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// ─── Background Sync ─────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'cgp-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_REQUESTED' });
        });
      })
    );
  }
});

// ─── Periodic Background Sync ────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cgp-periodic-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'PERIODIC_SYNC_REQUESTED' });
        });
      })
    );
  }
});

// ─── Push Notifications ──────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {
    title: 'Control GP',
    body: 'Você tem novas atualizações financeiras',
    url: '/',
  };

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    image: data.image || undefined,
    vibrate: [100, 50, 100],
    tag: data.tag || 'cgp-notification',
    renotify: true,
    requireInteraction: false,
    silent: false,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Abrir', icon: '/icons/icon-72.png' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Tenta focar uma janela já aberta
      const existing = clients.find((c) => c.url === targetUrl && 'focus' in c);
      if (existing) return existing.focus();
      // Abre nova janela
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── Mensagens do App ─────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});
