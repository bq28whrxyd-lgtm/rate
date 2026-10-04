/* Bump VERSION on every release: a changed sw.js is what makes phones show the update notice. */
const VERSION = 'v55-2026-10-04-final2';
const CACHE = 'ladder-' + VERSION;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'kmr_hood.jpg', 'kmr_chibi.jpg', 'kmr_hoodie2.jpg', 'kmr_vt1.jpg', 'kmr_vt2.jpg', 'kmr_vt3.jpg'];

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
