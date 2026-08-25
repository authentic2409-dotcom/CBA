// CBA MasterGuide — Service Worker
// 方針: stale-while-revalidate。キャッシュがあれば即座に返して体感速度を優先し、
// 裏でネットワークから最新版を取得してキャッシュを更新する。
// これにより機内モード・電波なし環境でも起動でき、電波があれば自動で最新化される。

const CACHE_NAME = 'cba-masterguide-v10l';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse); // オフライン時はキャッシュにフォールバック

        // キャッシュがあれば即返却(体感速度優先)、なければネットワーク結果を待つ
        return cachedResponse || networkFetch;
      })
    )
  );
});
