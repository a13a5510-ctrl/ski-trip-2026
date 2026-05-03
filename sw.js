// sw.js - 離線守護者 (終極極地版 V2)
const CACHE_NAME = 'ski-trip-cache-v2';

// 🌟 把根目錄 './' 也加進快取清單中！
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js'
];

// 安裝階段：強制立即接管
self.addEventListener('install', event => {
    self.skipWaiting(); // 🌟 放棄實習期，立刻強制上工
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('📦 終極離線快取庫建立完成！');
            return cache.addAll(urlsToCache);
        })
    );
});

// 啟動階段：立刻控制所有開啟的網頁
self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim()); // 🌟 宣告接管這台瀏覽器
});

// 攔截請求階段：網路優先，並且具備智慧導航
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                console.log('🔴 偵測到斷網，啟動極地求生模式...');
                // 🌟 智慧導航：去快取庫找，如果找不到完全一樣的網址，只要是切換網頁的要求，都硬塞 index.html 給他！
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
