// 已升級至 v20，全面革新 HR 更表 AI 掃描引擎，無懼欄位走位與複雜人名格式
const CACHE_NAME = 'vv-roster-v20';

const urlsToCache = [
  './index.html',
  './hr_management.html',
  './runway_report.html',
  './V1_Sales.html',
  './VD_Sales.html',
  './VV_Sales.html',
  './OVCP_Sales.html',
  './TVCP_Sales.html',
  './VVCP_Sales.html',
  './style.css',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // 強制立即安裝新版本
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 清除舊快取', cacheName);
            return caches.delete(cacheName); // 強制洗走舊版快取
          }
        })
      );
    })
  );
  self.clients.claim(); // 立即接管所有頁面
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // 優先使用快取，如果冇就透過網絡拿取
      return response || fetch(event.request);
    })
  );
});
```eof

**覆蓋完之後的建議動作：**
1. 喺電腦瀏覽器，㩒 `Ctrl + F5` (Windows) 或 `Cmd + Shift + R` (Mac) 強制重新整理。
2. 喺手機，建議**徹底關閉該 Safari / Chrome 分頁**，重新打開，或者入去設定清除一下網站資料，確保 v20 快取正式生效。

更新完呢兩個檔案，個系統就可以完美認得晒所有人名同日子㗎啦！