// PWA 用 Service Worker
//
// 役割:
//   1. 静的アセット (HTML/CSS/JS/icons) をプレキャッシュしてオフライン対応
//   2. Web Share Target は manifest の "action": "./" で index.html が処理するため
//      SW での介在は不要 (fetch をスルーしてブラウザに任せる)
//
// キャッシュしないもの:
//   - YouTube Data API (https://www.googleapis.com/...): lib/cache.js が独自に
//     24h キャッシュしているため SW で二重キャッシュしない。常にネットワーク。
//   - 非 GET メソッド: そもそもキャッシュ対象外
//
// 戦略: cache-first (同一オリジンのみ)。失敗時は index.html フォールバック。

const VERSION = "v1";
const CACHE = `yt-period-sorter-${VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./popup/popup.html",
  "./popup/popup.css",
  "./popup/popup.js",
  "./options/options.html",
  "./options/options.css",
  "./options/options.js",
  "./results/results.html",
  "./results/results.css",
  "./results/results.js",
  "./lib/cache.js",
  "./lib/youtube-api.js",
  "./lib/platform/env.js",
  "./lib/platform/storage.js",
  "./lib/platform/tabs.js",
  "./lib/platform/runtime.js",
  "./lib/platform/messaging.js",
  "./lib/backend/sanitize.js",
  "./lib/backend/validate.js",
  "./lib/backend/fetch-popular-videos.js",
  "./icons/icon-16.png",
  "./icons/icon-32.png",
  "./icons/icon-48.png",
  "./icons/icon-128.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // YouTube Data API はキャッシュ介在させない (storage 側で 24h キャッシュ済み)
  if (url.origin === "https://www.googleapis.com") return;

  // 同一オリジンのみキャッシュ参照
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          // 200 のみキャッシュに格納 (リダイレクトや 4xx/5xx は格納しない)
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match("./index.html"));
    }),
  );
});
