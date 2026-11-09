/* Fonduri — păstrează aplicația pe telefon ca să meargă fără internet.
   Când schimbi ceva în aplicație, crește numărul versiunii de mai jos. */
const VERSION = 'fonduri-v1.8.0';
const SHELL = [
  './', 'index.html', 'styles.css', 'core.js', 'app.js', 'change-log.js', 'CHANGELOG.md', 'city-sync.js', 'vendor/jsQR.js', 'manifest.webmanifest', 'vendor/xlsx.mini.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'fonts/bricolage-grotesque-latin-500-normal.woff2', 'fonts/bricolage-grotesque-latin-600-normal.woff2', 'fonts/bricolage-grotesque-latin-700-normal.woff2',
  'fonts/bricolage-grotesque-latin-ext-500-normal.woff2', 'fonts/bricolage-grotesque-latin-ext-600-normal.woff2', 'fonts/bricolage-grotesque-latin-ext-700-normal.woff2',
  'fonts/instrument-sans-latin-400-normal.woff2', 'fonts/instrument-sans-latin-500-normal.woff2', 'fonts/instrument-sans-latin-600-normal.woff2',
  'fonts/instrument-sans-latin-ext-400-normal.woff2', 'fonts/instrument-sans-latin-ext-500-normal.woff2', 'fonts/instrument-sans-latin-ext-600-normal.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('fonduri-v') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.searchParams.has('update-check')) return;
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // prețuri, curs: mereu de pe internet
  // întâi încercăm versiunea nouă de pe internet, dacă nu merge folosim copia de pe telefon
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
