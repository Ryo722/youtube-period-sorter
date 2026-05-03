// 拡張版とPWA版の経路差を吸収するメッセージング層
//
// 上位コード (popup/options/results) は本ファイルの関数のみを呼び、
// chrome.runtime.sendMessage / backend 直接呼び出しのどちらが動くかを意識しない。
//
// レスポンス形式の統一:
//   - 成功: { ok: true, data, ... }
//   - 失敗: { ok: false, error: { message, code?, status? } }
// この形式は旧 service-worker.js のメッセージレスポンスと完全互換。
// 上位コードの分岐ロジック (e.g. err.code === "missingApiKey") をそのまま流用できる。

import { isExtension } from "./env.js";
import { fetchPopularVideos as backendFetchPopularVideos } from "../backend/fetch-popular-videos.js";
import * as cache from "../cache.js";

function toErrorResponse(err) {
  return {
    ok: false,
    error: {
      message: err?.message || String(err),
      code: err?.code || null,
      status: err?.status ?? null,
    },
  };
}

export async function fetchPopularVideos(payload) {
  if (isExtension()) {
    try {
      const res = await chrome.runtime.sendMessage({
        type: "FETCH_POPULAR_VIDEOS",
        payload,
      });
      return res || { ok: false, error: { message: "no response" } };
    } catch (err) {
      // SW 未起動・コンテキスト消滅などの transport エラー
      return toErrorResponse(err);
    }
  }
  // PWA: backend を直接呼び、SW のレスポンス形式に整形して返す
  try {
    const data = await backendFetchPopularVideos(payload);
    return { ok: true, data };
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function cacheStats() {
  if (isExtension()) {
    try {
      const res = await chrome.runtime.sendMessage({ type: "CACHE_STATS" });
      return res || { ok: false, error: { message: "no response" } };
    } catch (err) {
      return toErrorResponse(err);
    }
  }
  try {
    const data = await cache.stats();
    return { ok: true, data };
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function clearCache() {
  if (isExtension()) {
    try {
      const res = await chrome.runtime.sendMessage({ type: "CLEAR_CACHE" });
      return res || { ok: false, error: { message: "no response" } };
    } catch (err) {
      return toErrorResponse(err);
    }
  }
  try {
    const removed = await cache.clear();
    return { ok: true, removed };
  } catch (err) {
    return toErrorResponse(err);
  }
}
