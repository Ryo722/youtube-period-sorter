// YouTube Data API v3 ラッパー
// service worker から ES module として読み込まれる前提

const API_BASE = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 50; // search.list / videos.list の API 上限

class YouTubeApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "YouTubeApiError";
    this.status = status;
    this.code = code;
  }
}

async function fetchJson(url, apiKey) {
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}key=${encodeURIComponent(apiKey)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason;
    const message = body?.error?.message || `HTTP ${res.status}`;
    throw new YouTubeApiError(message, res.status, reason);
  }
  return body;
}

// @handle (例: @mkbhd) または UC で始まる channelId をそのまま受け取り、UC... を返す
export async function resolveChannelId(input, apiKey) {
  const trimmed = (input || "").trim();
  if (!trimmed) throw new YouTubeApiError("チャンネル指定が空です", 400, "empty");

  if (/^UC[A-Za-z0-9_-]{20,}$/.test(trimmed)) {
    return { channelId: trimmed, title: null };
  }

  const handle = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  const url = `${API_BASE}/channels?part=snippet&forHandle=${encodeURIComponent(handle)}`;
  const data = await fetchJson(url, apiKey);
  const item = data.items?.[0];
  if (!item) {
    throw new YouTubeApiError(`チャンネル ${handle} が見つかりません`, 404, "channelNotFound");
  }
  return { channelId: item.id, title: item.snippet?.title ?? null };
}

// 指定チャンネル・期間の動画を最大 maxResults 件まで取得 (pageToken でループ)
export async function searchChannelVideos({
  channelId,
  publishedAfter,
  publishedBefore,
  maxResults = 50,
  apiKey,
  onProgress,
}) {
  const collected = [];
  let pageToken = null;

  while (collected.length < maxResults) {
    const remaining = maxResults - collected.length;
    const pageMax = Math.min(PAGE_SIZE, remaining);

    const params = new URLSearchParams({
      part: "snippet",
      channelId,
      type: "video",
      order: "viewCount",
      maxResults: String(pageMax),
    });
    if (publishedAfter) params.set("publishedAfter", publishedAfter);
    if (publishedBefore) params.set("publishedBefore", publishedBefore);
    if (pageToken) params.set("pageToken", pageToken);

    const url = `${API_BASE}/search?${params.toString()}`;
    const data = await fetchJson(url, apiKey);

    const items = (data.items || [])
      .map((it) => ({
        videoId: it.id?.videoId,
        title: it.snippet?.title,
        description: it.snippet?.description,
        publishedAt: it.snippet?.publishedAt,
        thumbnail:
          it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url,
        channelTitle: it.snippet?.channelTitle,
      }))
      .filter((v) => v.videoId);

    collected.push(...items);
    if (typeof onProgress === "function") {
      onProgress({ phase: "search", got: collected.length, target: maxResults });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break; // YouTube 側に追加結果なし
  }

  return collected.slice(0, maxResults);
}

// 動画 ID 配列から statistics (viewCount, likeCount) を取得して結合 (50件ごとにバッチ)
export async function fetchVideoStatistics(videos, apiKey, onProgress) {
  if (videos.length === 0) return [];

  const statsById = new Map();

  for (let i = 0; i < videos.length; i += PAGE_SIZE) {
    const batch = videos.slice(i, i + PAGE_SIZE);
    const ids = batch.map((v) => v.videoId).join(",");
    const url = `${API_BASE}/videos?part=statistics,contentDetails&id=${encodeURIComponent(ids)}`;
    const data = await fetchJson(url, apiKey);
    for (const item of data.items || []) {
      statsById.set(item.id, {
        viewCount: Number(item.statistics?.viewCount ?? 0),
        likeCount: Number(item.statistics?.likeCount ?? 0),
        commentCount: Number(item.statistics?.commentCount ?? 0),
        duration: item.contentDetails?.duration ?? null,
      });
    }
    if (typeof onProgress === "function") {
      onProgress({
        phase: "stats",
        got: Math.min(i + PAGE_SIZE, videos.length),
        target: videos.length,
      });
    }
  }

  return videos.map((v) => ({
    ...v,
    ...(statsById.get(v.videoId) || {
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      duration: null,
    }),
  }));
}

export { YouTubeApiError };
