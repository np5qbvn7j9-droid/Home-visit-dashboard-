const CACHE = 'dashboard-v3';
const CORE = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap'
];

// تثبيت
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

// تفعيل: امسح الكاش القديم
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// الطلبات: HTML دايماً من الشبكة (network-first) — باقي الملفات من الكاش
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // HTML: network first → كاش احتياطي
  if (req.destination === 'document' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE).then(c => c.put(req, res.clone()));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // باقي الملفات: كاش first
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(req, res.clone()));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
