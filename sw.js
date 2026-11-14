// Tiene l'app disponibile offline. __BUILD__ viene sostituito a ogni pubblicazione.
const CACHE = 'palestra-__BUILD__';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css', 'css/fusione.css',
  'icons/icon-192.png', 'icons/icon-512.png', 'esempio/palestra-esempio.json',
  'js/app.js', 'js/catalog.js', 'js/charts.js', 'js/data.js', 'js/db.js', 'js/exercises.js',
  'js/demo.js', 'js/guide.js', 'js/history.js', 'js/info.js', 'js/plans.js', 'js/progress.js', 'js/stats.js', 'js/ui.js', 'js/workout.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('palestra-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'attiva') self.skipWaiting();
});

// I caratteri di Google Fonts vengono salvati la prima volta che arrivano, così
// l'app li ha anche offline. Questa copia resta valida tra una versione e l'altra.
const FONT_CACHE = 'caratteri-google';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

async function fontFirst(request) {
  const cache = await caches.open(FONT_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (FONT_HOSTS.includes(url.hostname)) { e.respondWith(fontFirst(e.request)); return; }
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(e.request);
    } catch (err) {
      if (e.request.mode === 'navigate') return caches.match('index.html');
      throw err;
    }
  })());
});
