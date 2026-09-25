// HYD Flights service worker: app shell offline, map tiles cached, live APIs always network
const VERSION = 'hydf-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const LIVE = /rapidapi\.com|adsb\.lol|airplanes\.live|opensky-network\.org|open-meteo\.com|aviationweather\.gov|maps\.googleapis\.com|maps\.gstatic\.com|googleapis\.com\/maps/;
const TILES = /pics\.avs\.io|images\.kiwi\.com/;
const FONTS = /fonts\.(googleapis|gstatic)\.com/;

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || LIVE.test(url.host)) return; // live data: straight to network
  if (TILES.test(url.host) || FONTS.test(url.host)) {
    e.respondWith(caches.open(VERSION + '-ext').then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin === location.origin) {
    // network-first for the app so updates land quickly, cache as fallback
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
  }
});
