/* Fluxo Suporte — Service Worker
 *
 * Estratégias de cache:
 *  - HTML (navegações): network-first com fallback offline
 *  - Static (CSS/JS/fonts): stale-while-revalidate
 *  - Imagens: cache-first com expiração
 *  - API: NUNCA (sempre rede)
 *
 * Push: handler responde a notificações enviadas pelo backend
 *       e abre a URL clicada.
 */

const VERSION = 'v1';
const STATIC_CACHE = `fluxo-static-${VERSION}`;
const RUNTIME_CACHE = `fluxo-runtime-${VERSION}`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon.svg']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só lida com GETs do mesmo origin (mas não /api)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/data')) return;

  // Navegações HTML: network-first
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  // Estáticos (JS/CSS/fontes) do _next: stale-while-revalidate
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return res;
        });
        return cached || networkFetch;
      }),
    );
    return;
  }

  // Imagens em /icons ou /uploads: cache-first
  if (url.pathname.startsWith('/icons/') || /\.(png|jpg|jpeg|gif|svg|webp)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return res;
        });
      }),
    );
    return;
  }
});

// ─────────────────────────────────────────────────────────────
// Push notifications
// ─────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let payload = { title: 'Fluxo Suporte', body: 'Você tem uma nova notificação.' };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon.svg',
    badge: '/icons/icon.svg',
    data: {
      url: payload.url || '/',
      ticketNumber: payload.ticketNumber,
    },
    tag: payload.tag || 'fluxo-notification',
    requireInteraction: payload.requireInteraction ?? false,
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Foca uma janela existente se houver
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Senão abre nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});
