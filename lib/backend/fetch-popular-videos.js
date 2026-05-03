// 人気動画取得のコアロジック (拡張版・PWA 版で共有)
//
// 旧 background/service-worker.js から移植。chrome.* を直接参照せず
// lib/platform/storage.js 経由でストレージにアクセスするため、Web 版
// (PWA) でもそのまま動作する。
//
// 入口での責務:
//   1. 入力バリデーション (validateFetchPayload)
//   2. キャッシュヒットの場合は API を叩かない
//   3. API キーを storage から取得 (未設定なら missingApiKey エラー)
//   4. resolveChannelId → searchChannelVideos → fetchVideoStatistics
//   5. viewCount 降順でソートしてキャッシュに保存
//
// 例外は YouTubeApiError として伝播する。呼び出し側 (SW / messaging 層) で
// catch して { ok, data | error } 形式に整形すること。

import {
  resolveChannelId,
  searchChannelVideos,
  fetchVideoStatistics,
  YouTubeApiError,
} from "../youtube-api.js";
import * as cache from "../cache.js";
import { storage } from "../platform/storage.js";
import { validateFetchPayload } from "./validate.js";

async function getApiKey() {
  const { apiKey } = await storage.get("apiKey");
  if (!apiKey) {
    throw new YouTubeApiError(
      "API キーが未設定です。拡張機能のオプションから設定してください。",
      0,
      "missingApiKey",
    );
  }
  return apiKey;
}

function periodToPublishedAfter(period) {
  if (!period || period === "all") return null;
  const now = new Date();
  const days = { "1d": 1, "1w": 7, "1m": 30, "3m": 90, "6m": 180, "1y": 365 }[period];
  if (!days) return null;
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return since.toISOString();
}

export async function fetchPopularVideos(input) {
  const { channelInput, period, maxResults, forceRefresh } = validateFetchPayload(input);

  const cacheKey = cache.buildKey({ channelInput, period, maxResults });

  if (!forceRefresh) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true, cachedAt: cached.timestamp };
    }
  }

  const apiKey = await getApiKey();
  const { channelId, title: resolvedTitle } = await resolveChannelId(channelInput, apiKey);
  const publishedAfter = periodToPublishedAfter(period);

  const searchResults = await searchChannelVideos({
    channelId,
    publishedAfter,
    maxResults,
    apiKey,
  });
  const enriched = await fetchVideoStatistics(searchResults, apiKey);
  enriched.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));

  const payload = {
    channelId,
    channelTitle: resolvedTitle || enriched[0]?.channelTitle || channelInput,
    period,
    publishedAfter,
    maxResults,
    videos: enriched,
  };

  const stored = await cache.set(cacheKey, payload);
  return { ...payload, fromCache: false, cachedAt: stored.timestamp };
}
