// Vice City service worker: rede primeiro (sempre a versão mais nova), cache só quando offline.
// Nunca guarda chamadas ao Supabase.
const VERSION = 'vc-v23';
const SHELL = ['/', '/index.html', '/css/app.css', '/js/game.js', '/config.js', '/vendor/three.min.js', '/vendor/supabase.js',
  '/icons/screenshot-wide.png', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
const key = url => { const u = new URL(url); u.search = ''; return u.pathname === '/' ? '/index.html' : u.href; };
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (font) { // fontes mudam pouco: cache primeiro
    e.respondWith(caches.open(VERSION).then(async c => (await c.match(req)) || fetch(req).then(r => { c.put(req, r.clone()); return r; })));
    return;
  }
  if (url.origin !== location.origin) return;
  const k = req.mode === 'navigate' ? '/index.html' : key(req.url);
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(k, c)); }
    return r;
  }).catch(() => caches.match(k).then(h => h || caches.match(req))));
});
