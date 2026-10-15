/* Bump VERSION on every release: a changed sw.js is what makes phones show the update notice. */
const VERSION = 'v132-2026-10-15';
const CACHE = 'ladder-' + VERSION;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'tcg_spectator.js', 'motion_lifecycle.js',
  'kmr_hood.jpg', 'kmr_chibi.jpg', 'kmr_hoodie2.jpg', 'kmr_vt1.jpg', 'kmr_vt2.jpg', 'kmr_vt3.jpg',
  'fx_chest.webp', 'fx_chest.png', 'fx_kmrcoin_a.jpg', 'fx_kmrcoin_b.jpg', 'fx_coin.webp', 'fx_coin_hi.webp',
  'fx_chest_closed.jpg', 'fx_chest_open.jpg', 'fx_chest_gold_closed.jpg', 'fx_chest_gold_open.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('ladder-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  /* live data, login and video streaming always go straight to the network */
  if (/(^|\.)(googleapis|firebaseapp|google|firebaseio)\.com$/.test(url.hostname) || url.pathname.startsWith('/__/')) return;
  if (url.pathname.endsWith('.mp4') || req.headers.has('range')) return;
  /* the app page: newest from the network, cached copy when offline */
  const isApp = url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
  if (req.mode === 'navigate' && !isApp) return;   /* other pages (guide.html) go straight to the network */
  if (isApp) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('index.html', c)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  /* everything else (icons, images, fonts, Firebase SDK): cache first, refresh in the background */
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; });
    return hit || net;
  }));
});

/* ---- push notifications (sent by the Firebase functions as data messages) ---- */
self.addEventListener('push', e => {
  let j = {};
  try { j = e.data ? e.data.json() : {}; } catch (x) { try { j = { data: { body: e.data.text() } }; } catch (y) {} }
  const d = j.data || j, n = j.notification || {};
  const title = d.title || n.title || 'きもオタレート', body = d.body || n.body || '';
  const opt = { body, icon: 'icon-192.png', badge: 'icon-192.png', data: { go: d.go || 'home' } };
  if (d.tag) { opt.tag = d.tag; opt.renotify = true; }
  e.waitUntil(self.registration.showNotification(title, opt));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const go = (e.notification.data && e.notification.data.go) || 'home';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if (c.url.startsWith(self.registration.scope)) { c.postMessage({ kgo: go }); return c.focus(); } }
    return self.clients.openWindow(self.registration.scope + '?go=' + encodeURIComponent(go));
  }));
});
