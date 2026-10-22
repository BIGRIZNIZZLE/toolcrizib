/* Tool Crizib service worker: offline app shell, lazily cached catalog, update prompt. */
const CACHE = 'toolcrizib-v3';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './taxonomy.js', './sync.js', './manifest.json', './favicon.ico',
  './icons/favicon-32.png', './icons/favicon-16.png', './icons/logo-192.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './img/riznoss-crest-solid.webp', './img/riznoss-crest.webp', './img/riznoss-lockup.webp', './img/riznoss-watermark.png',
  // comic icon set (32 small WebPs) so fallbacks work offline
  ...'battery blower chainsaw charger circsaw drill fan gluegun grinder hammerdrill heatgun hedge impactdriver impactwrench inflator jigsaw kit light miter mower multitool nailer other pressure radio recip rotary router sander tablesaw trimmer vacuum'.split(' ').map(k => `./icons/comic/${k}.webp`)
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))); });
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
// Only ever delete Tool Crizib's own old caches: AutoLog lives on the same origin with its own 'autolog-*' caches.
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => (k.startsWith('toollog-v') || k.startsWith('toolcrizib-v')) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const put = (req, r) => { if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; };
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (url.pathname.includes('/join/')) return; // invite page always comes from the network
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then(r => put(req, r)).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html')))); return; }
  if (url.pathname.endsWith('/catalog.json')) { // lazy: cached the first time the picker opens, refreshed when online
    e.respondWith(fetch(req).then(r => put('./catalog.json', r)).catch(() => caches.match('./catalog.json', { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req).then(hit => { const net = fetch(req).then(r => put(req, r)).catch(() => hit); return hit || net; }));
});
