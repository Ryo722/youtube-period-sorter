// FETCH_POPULAR_VIDEOS payload のバリデーション
//
// 設計判断:
//   - backend (fetch-popular-videos.js) の入口で必ず呼び出す。
//     拡張版では SW のメッセージディスパッチ層も同じ payload を見るが、
//     重複検証より backend 内部での自衛を優先する。
//   - 失敗時は YouTubeApiError を throw する。呼び出し側 (SW / messaging 層) で
//     catch して { ok: false, error: {...} } 形式に整形すること。

import { YouTubeApiError } from "../youtube-api.js";

export const ALLOWED_PERIODS = new Set(["1d", "1w", "1m", "3m", "6m", "1y", "all"]);

export function validateFetchPayload(p) {
  if (!p || typeof p !== "object") {
    throw new YouTubeApiError("payload が不正です", 400, "invalidPayload");
  }
  const channelInput = typeof p.channelInput === "string" ? p.channelInput.trim() : "";
  if (!channelInput || channelInput.length > 200) {
    throw new YouTubeApiError("channelInput が不正です", 400, "invalidChannelInput");
  }
  if (!ALLOWED_PERIODS.has(p.period)) {
    throw new YouTubeApiError("period が不正です", 400, "invalidPeriod");
  }
  const maxResults = Number(p.maxResults);
  if (!Number.isFinite(maxResults) || maxResults < 1 || maxResults > 100) {
    throw new YouTubeApiError(
      "maxResults は 1〜100 の整数で指定してください",
      400,
      "invalidMaxResults",
    );
  }
  return {
    channelInput,
    period: p.period,
    maxResults: Math.floor(maxResults),
    forceRefresh: Boolean(p.forceRefresh),
  };
}
