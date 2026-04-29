import {
  resolveChannelId,
  searchChannelVideos,
  fetchVideoStatistics,
  YouTubeApiError,
} from "../lib/youtube-api.js";
import * as cache from "../lib/cache.js";

async function getApiKey() {
  const { apiKey } = await chrome.storage.local.get("apiKey");
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

async function fetchPopularVideos({
  channelInput,
  period,
  maxResults = 50,
  forceRefresh = false,
}) {
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

// API キー漏洩を防ぐため、エラーメッセージや URL に key=... が含まれていれば伏せる
function sanitizeForLog(value) {
  if (value == null) return value;
  const s = typeof value === "string" ? value : String(value);
  return s.replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]");
}

// FETCH_POPULAR_VIDEOS の payload バリデーション
const ALLOWED_PERIODS = new Set(["1d", "1w", "1m", "3m", "6m", "1y", "all"]);
const ALLOWED_TYPES = new Set(["FETCH_POPULAR_VIDEOS", "CLEAR_CACHE", "CACHE_STATS"]);

function validateFetchPayload(p) {
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
    throw new YouTubeApiError("maxResults は 1〜100 の整数で指定してください", 400, "invalidMaxResults");
  }
  return {
    channelInput,
    period: p.period,
    maxResults: Math.floor(maxResults),
    forceRefresh: Boolean(p.forceRefresh),
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 同一拡張内からのメッセージのみ受け付ける。
  // sender.id は外部メッセージでも sender.url が chrome-extension:// で始まる場合のみ
  // 自拡張と判定する。content script からの呼び出しは sender.tab が付くが、
  // 本拡張は content script を一切持たないため tab が無いことを期待する。
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
    let validated;
    try {
      validated = validateFetchPayload(message.payload);
    } catch (err) {
      sendResponse({
        ok: false,
        error: { message: err.message, code: err.code || "invalidPayload", status: 400 },
      });
      return false;
    }
    fetchPopularVideos(validated)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => {
        // err.message / err.stack に URL が含まれる可能性があるため sanitize
        console.error(
          "[yt-period-sorter] fetch failed:",
          sanitizeForLog(err?.message || String(err)),
          "code=" + (err?.code || "unknown"),
          "status=" + (err?.status ?? "unknown"),
        );
        sendResponse({
          ok: false,
          error: {
            message: sanitizeForLog(err?.message || String(err)),
            code: err?.code || null,
            status: err?.status ?? null,
          },
        });
      });
    return true; // async
  }

  if (type === "CLEAR_CACHE") {
    cache
      .clear()
      .then((removed) => sendResponse({ ok: true, removed }))
      .catch((err) => sendResponse({ ok: false, error: { message: err?.message || String(err) } }));
    return true;
  }

  if (type === "CACHE_STATS") {
    cache
      .stats()
      .then((s) => sendResponse({ ok: true, data: s }))
      .catch((err) => sendResponse({ ok: false, error: { message: err?.message || String(err) } }));
    return true;
  }
});
