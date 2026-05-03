// Chrome 拡張のメッセージディスパッチ層 (薄いシム)
//
// ビジネスロジックは lib/backend/* に集約されており、本ファイルは:
//   - sender.id 検証 (外部拡張からの呼び出し拒否)
//   - メッセージタイプの allowlist 制御
//   - backend 関数を呼び出して { ok, data | error } 形式に整形
// だけを担う。PWA 版では本ファイル自体を読み込まず、上位コードが
// lib/platform/messaging.js 経由で backend を直接呼び出す。
//
// 既存挙動の維持:
//   - sender.id !== chrome.runtime.id のメッセージは拒否
//   - 未知のメッセージタイプも拒否
//   - エラーメッセージは sanitizeForLog で API キー伏字化

import { fetchPopularVideos } from "../lib/backend/fetch-popular-videos.js";
import * as cache from "../lib/cache.js";
import { sanitizeForLog } from "../lib/backend/sanitize.js";

const ALLOWED_TYPES = new Set(["FETCH_POPULAR_VIDEOS", "CLEAR_CACHE", "CACHE_STATS"]);

function makeErrorResponse(err) {
  return {
    ok: false,
    error: {
      message: sanitizeForLog(err?.message || String(err)),
      code: err?.code || null,
      status: err?.status ?? null,
    },
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 同一拡張内からのメッセージのみ受け付ける。
  // 本拡張は content script を持たないため sender.tab は付かないことを期待する。
  if (sender?.id !== chrome.runtime.id) {
    sendResponse({ ok: false, error: { message: "rejected: cross-extension message" } });
    return false;
  }

  const type = message?.type;
  if (!ALLOWED_TYPES.has(type)) {
    sendResponse({ ok: false, error: { message: `unknown type: ${type}` } });
    return false;
  }

  if (type === "FETCH_POPULAR_VIDEOS") {
    fetchPopularVideos(message.payload)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => {
        // err.message / err.stack に URL が含まれる可能性があるため sanitize
        console.error(
          "[yt-period-sorter] fetch failed:",
          sanitizeForLog(err?.message || String(err)),
          "code=" + (err?.code || "unknown"),
          "status=" + (err?.status ?? "unknown"),
        );
        sendResponse(makeErrorResponse(err));
      });
    return true; // async
  }

  if (type === "CLEAR_CACHE") {
    cache
      .clear()
      .then((removed) => sendResponse({ ok: true, removed }))
      .catch((err) => sendResponse(makeErrorResponse(err)));
    return true;
  }

  if (type === "CACHE_STATS") {
    cache
      .stats()
      .then((s) => sendResponse({ ok: true, data: s }))
      .catch((err) => sendResponse(makeErrorResponse(err)));
    return true;
  }
});
