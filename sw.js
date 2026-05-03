// sw.js - 離線守護者 (Service Worker)
const CACHE_NAME = 'ski-trip-cache-v1';

// 這些是我們網站的「核心骨架」，一安裝 App 就強制下載存起來
const urlsToCache = [
    './index.html',
    './style.css',
    './app.js'
];

// 安裝階段：將骨架存入快取庫
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('離線快取庫建立完成！');
            return cache.addAll(urlsToCache);
        })
    );
});

// 攔截請求階段：網路優先 (Network First)
self.addEventListener('fetch', event => {
    // 只攔截 GET 請求 (不攔截投票的 POST/PUT，因為沒網路本來就不能投票)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 1. 如果網路暢通，就把抓到的新資料(包含 Firebase 傳來的 JSON) 順便存一份進快取
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response; // 將最新資料還給網頁
            })
            .catch(() => {
                // 2. 如果斷網 (fetch 發生錯誤)，就去快取庫裡面找舊資料來救命！
                console.log('🔴 偵測到斷網，啟動極地求生模式，載入快取資料...');
                return caches.match(event.request);
            })
    );
});
