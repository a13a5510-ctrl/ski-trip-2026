// sw.js - 離線守護者 (終極外觀修復版 V3)
const CACHE_NAME = 'ski-trip-cache-v3'; // 🌟 版本號升級，強制更新

// 🌟 把「衣服」跟「特效」的 CDN 網址也放進強制快取清單中！
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11'
];

self.addEventListener('install', event => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('📦 終極離線快取庫 (含 UI 樣式) 建立完成！');
            // 由於跨網域 (CORS) 限制，CDN 檔案有時無法用 addAll，改用動態抓取寫入
            return Promise.allSettled(
                urlsToCache.map(url => {
                    return fetch(url, { mode: 'no-cors' }).then(response => {
                        return cache.put(url, response);
                    }).catch(err => console.log('CDN 快取略過:', url));
                })
            );
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim()); 
    // 順便清除舊版 (v2) 的快取，避免佔用手機空間
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 攔截請求：網路優先，並包含所有圖片與外部字體的動態快取
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    // 動態把抓到的圖片、FontAwesome 的字體檔都存起來
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                console.log('🔴 偵測到斷網，啟動極地求生模式...');
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
