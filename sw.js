// sw.js
const STATIC = 'sparkle-static-v2';
const IMAGES = 'sparkle-img-v2';

const STATIC_ASSETS = [
  '/', '/index.html', '/quote.html', '/manifest.json',
  '/images/icon-192.png', '/images/icon-512.png',
  // Optional: if you add these, they'll be pre-cached
  // '/images/hero-fallback.jpg',
  // '/images/hero-loop.webm',
  // '/images/hero-loop.mp4'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(STATIC).then(c=>c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>![STATIC, IMAGES].includes(k)).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);

  // Images: cache-first
  if (/\.(?:png|jpg|jpeg|webp|avif|svg)$/i.test(url.pathname)) {
    e.respondWith((async ()=>{
      const cache = await caches.open(IMAGES);
      const cached = await cache.match(e.request);
      if (cached) return cached;
      try{
        const resp = await fetch(e.request, { mode: 'cors' });
        cache.put(e.request, resp.clone());
        return resp;
      }catch(err){
        return cached || Response.error();
      }
    })());
    return;
  }

  // HTML/JSON: stale-while-revalidate
  if (e.request.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.json')) {
    e.respondWith((async ()=>{
      const cache = await caches.open(STATIC);
      const cached = await cache.match(e.request);
      const fetchPromise = fetch(e.request).then(resp=>{
        cache.put(e.request, resp.clone());
        return resp;
      }).catch(()=>cached);
      return cached || fetchPromise;
    })());
    return;
  }

  // Default: network first with fallback
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
