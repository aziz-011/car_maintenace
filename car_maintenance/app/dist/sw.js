// Lets the app open without a connection once it has been opened before.
// The page and its files come from the cache when the server can't be
// reached; data requests always go to the server (the app keeps its own
// copy of the data and queues changes made offline). Paths are relative to
// where the app is served.
const CACHE = 'car-maintenance-v2';
const BASE = new URL('./', self.registration.scope).pathname;
const PAGE = BASE;
const SHELL = [PAGE, `${BASE}manifest.webmanifest`, `${BASE}icon.svg`, `${BASE}icon-192.png`];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const path = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : null;
  if (req.method !== 'GET' || url.origin !== location.origin || path === null || path.startsWith('api/') || path === 'calendar.ics') return;

  // Built files and photos never change once written: cache first.
  if (path.startsWith('assets/') || path.startsWith('files/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // The page: the network when it answers, otherwise the last copy.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === 'navigate' || SHELL.includes(url.pathname))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? PAGE : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req.mode === 'navigate' ? PAGE : req).then((hit) => hit ?? Response.error())),
  );
});
