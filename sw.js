/* Bump VERSION on every release: a changed sw.js is what makes phones show the update notice. */
const VERSION = 'v142-2026-10-27';
const CACHE = 'ladder-' + VERSION;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'tcg_spectator.js', 'motion_lifecycle.js',
  'kmr_hood.jpg', 'kmr_chibi.jpg', 'kmr_hoodie2.jpg', 'kmr_vt1.jpg', 'kmr_vt2.jpg', 'kmr_vt3.jpg',
  'fx_chest.webp', 'fx_chest.png', 'fx_kmrcoin_a.jpg', 'fx_kmrcoin_b.jpg', 'fx_coin.webp', 'fx_coin_hi.webp',
  'fx_chest_closed.jpg', 'fx_chest_open.jpg', 'fx_chest_gold_closed.jpg', 'fx_chest_gold_open.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).catch(() => {}));
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
  /* effect films (fx_*.mp4): the first play streams from the network while the whole file is saved once; after that every
     play (and every seek) is answered from the saved file, so the capsule never waits for the network again */
  if (/\/fx_[\w]+\.mp4$/.test(url.pathname) && url.origin === location.origin) { e.respondWith(filmResp(req, url)); return; }
  if (url.pathname.endsWith('.mp4') || req.headers.has('range')) return;
  /* the app page: newest from the network, cached copy when offline */
  const isApp = url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
  /* (10/16) 分身 and the TCG screen (big pages opened in a frame): kept per version (?v=), so opening them again does not
     download 2MB every time; the saved copy is used at once and refreshed in the background */
  if (url.origin === location.origin && /\/(bunshin|tcg_play)\.html$/.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; });
      return hit || net;
    })));
    return;
  }
  /* (10/23) card pictures (ci/ and cardhd/, each with ?h= of its own content): kept on the phone across app versions, so an update
     never downloads them again; a changed picture has a new ?h= and is fetched once */
  if (url.origin === location.origin && /\/(ci|cardhd)\//.test(url.pathname)) {
    e.respondWith(caches.open(CARDS).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))));
    return;
  }
  if (req.mode === 'navigate' && !isApp) return;   /* other pages (guide.html) go straight to the network */
  /* (10/16) the app page opens from this phone's saved copy at once (it is about 2MB; fetching it on every open made the
     start wait for the network). The copy belongs to this version only: a new version comes with a new sw.js, whose new cache
     starts empty, so the page reloads into the new version as before. The saved copy is still refreshed in the background */
  if (isApp) {
    e.respondWith(caches.open(CACHE).then(c => c.match('index.html').then(hit => {
      const net = fetch(req).then(r => { if (r.ok) c.put('index.html', r.clone()); return r; });
      if (hit) { net.catch(() => {}); return hit; }
      return net.catch(() => caches.match('index.html'));
    })));
    return;
  }
  /* everything else (icons, images, fonts, Firebase SDK): cache first, refresh in the background */
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; });
    return hit || net;
  }));
});

const CARDS = 'kcard-v1';         /* card pictures, kept across app versions (see the fetch handler) */
const FILMS = 'kvideo-v1';           /* kept across app versions: the films only change when their file names do */
const filling = new Set();
async function filmResp(req, url) {
  const key = url.origin + url.pathname;
  let cache = null, full = null;
  try { cache = await caches.open(FILMS); full = await cache.match(key); } catch (e) {}
  const range = req.headers.get('range');
  if (!full) {
    if (!range) {                                /* a plain fetch (the app warming its films): fetch once, save, hand it over */
      const r = await fetch(key);
      if (cache && r.ok && r.status === 200) { try { await cache.put(key, r.clone()); } catch (e) {} }
      return r;
    }
    if (cache && !filling.has(key)) {           /* a video element streaming: save the whole file in the background, once */
      filling.add(key);
      fetch(key).then(r => (r.ok && r.status === 200) ? cache.put(key, r) : null).catch(() => {}).then(() => filling.delete(key));
    }
    return fetch(req);
  }
  const buf = await full.arrayBuffer(), size = buf.byteLength, type = full.headers.get('content-type') || 'video/mp4';
  if (!range) return new Response(buf, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let a = m && m[1] ? +m[1] : (m && m[2] ? Math.max(0, size - +m[2]) : 0), b = m && m[1] && m[2] ? +m[2] : size - 1;
  b = Math.min(b, size - 1);
  if (!m || a > b || a >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  return new Response(buf.slice(a, b + 1), { status: 206, headers: { 'Content-Type': type, 'Content-Length': String(b - a + 1), 'Content-Range': 'bytes ' + a + '-' + b + '/' + size, 'Accept-Ranges': 'bytes' } });
}

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
