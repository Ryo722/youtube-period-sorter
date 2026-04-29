const PERIOD_LABEL = {
  "1d": "過去 24 時間",
  "1w": "過去 1 週間",
  "1m": "過去 1 か月",
  "3m": "過去 3 か月",
  "6m": "過去 6 か月",
  "1y": "過去 1 年",
  "all": "全期間",
};

const SORT_LABEL = {
  viewCount: "再生回数",
  likeCount: "高評価",
  commentCount: "コメント数",
  publishedAt: "投稿日",
};

const $ = (id) => document.getElementById(id);
const headerTitle = $("header-title");
const headerMeta = $("header-meta");
const cacheBadge = $("cache-badge");
const periodSelect = $("period-select");
const maxSelect = $("max-select");
const sortSelect = $("sort-select");
const reloadBtn = $("reload-btn");
const refreshBtn = $("refresh-btn");
const copyBtn = $("copy-btn");
const csvBtn = $("csv-btn");
const loadingEl = $("loading");
const errorEl = $("error");
const emptyEl = $("empty");
const listEl = $("video-list");

let currentVideos = []; // 表示中の動画 (ソート後)
let currentChannelTitle = "";
let currentPeriod = "";

const params = new URLSearchParams(location.search);
const channelInput = params.get("channel") || "";
const initialPeriod = params.get("period") || "1m";
const initialMax = clampMax(Number(params.get("max")) || 50);

if (!channelInput) {
  showError("チャンネルが指定されていません。拡張のポップアップから開き直してください。");
} else {
  document.title = `${channelInput} の人気動画 — ${PERIOD_LABEL[initialPeriod] || initialPeriod}`;
  periodSelect.value = initialPeriod;
  maxSelect.value = String(initialMax);
  loadInitialSort().then(() => load({ forceRefresh: false }));
}

reloadBtn.addEventListener("click", () => load({ forceRefresh: false }));
refreshBtn.addEventListener("click", () => load({ forceRefresh: true }));
periodSelect.addEventListener("change", () => load({ forceRefresh: false }));
maxSelect.addEventListener("change", () => load({ forceRefresh: false }));
sortSelect.addEventListener("change", () => {
  chrome.storage.local.set({ lastSort: sortSelect.value }).catch(() => {});
  applySortAndRender();
});
copyBtn.addEventListener("click", onCopy);
csvBtn.addEventListener("click", onDownloadCsv);

async function loadInitialSort() {
  const { lastSort } = await chrome.storage.local.get("lastSort");
  if (lastSort && SORT_LABEL[lastSort]) sortSelect.value = lastSort;
}

function clampMax(n) {
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(100, Math.max(1, Math.floor(n)));
}

// YouTube サムネイルの正規 CDN ホスト allowlist
// API の応答であっても無条件に img.src に流すと、将来の応答仕様変更や
// キャッシュ汚染で任意 URL へのリクエストを発火させられるため検証する。
const THUMBNAIL_HOST_ALLOWLIST = new Set([
  "i.ytimg.com",
  "i9.ytimg.com",
  "img.youtube.com",
  "yt3.ggpht.com",
  "yt3.googleusercontent.com",
]);

function safeThumbnailUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  let u;
  try {
    u = new URL(raw);
  } catch {
    return "";
  }
  if (u.protocol !== "https:") return "";
  if (!THUMBNAIL_HOST_ALLOWLIST.has(u.hostname)) return "";
  return u.toString();
}

function setLoading(on) {
  loadingEl.hidden = !on;
  listEl.setAttribute("aria-busy", on ? "true" : "false");
  if (on) {
    errorEl.hidden = true;
    emptyEl.hidden = true;
    listEl.hidden = true;
  }
}

function showError(msg) {
  loadingEl.hidden = true;
  emptyEl.hidden = true;
  listEl.hidden = true;
  errorEl.hidden = false;
  errorEl.textContent = msg;
  cacheBadge.hidden = true;
}

function showEmpty() {
  loadingEl.hidden = true;
  errorEl.hidden = true;
  listEl.hidden = true;
  emptyEl.hidden = false;
}

function updateCacheBadge({ fromCache, cachedAt }) {
  if (!cachedAt) {
    cacheBadge.hidden = true;
    return;
  }
  cacheBadge.hidden = false;
  if (fromCache) {
    cacheBadge.classList.remove("fresh");
    cacheBadge.classList.add("stale");
    cacheBadge.textContent = `キャッシュ ・ ${formatRelativeTime(cachedAt)}`;
  } else {
    cacheBadge.classList.remove("stale");
    cacheBadge.classList.add("fresh");
    cacheBadge.textContent = `最新取得 ・ ${formatRelativeTime(cachedAt)}`;
  }
}

async function load({ forceRefresh }) {
  const period = periodSelect.value;
  const maxResults = clampMax(Number(maxSelect.value) || 50);

  const newParams = new URLSearchParams({
    channel: channelInput,
    period,
    max: String(maxResults),
  });
  history.replaceState(null, "", `?${newParams.toString()}`);

  setLoading(true);
  loadingEl.textContent = forceRefresh
    ? "API から再取得中…"
    : `読み込み中… (最大 ${maxResults} 件)`;

  // sendMessage は service worker が未起動・例外時に reject する。
  // unhandled rejection で「読み込み中…」のまま固まらないよう全体を try/catch で囲む。
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "FETCH_POPULAR_VIDEOS",
      payload: { channelInput, period, maxResults, forceRefresh },
    });
  } catch (err) {
    showError(`通信エラー: ${err?.message || err}`);
    return;
  }

  if (!response?.ok) {
    const err = response?.error;
    let msg = err?.message || "不明なエラー";
    if (err?.code === "missingApiKey") {
      msg += "\n\n拡張機能を右クリック → オプションから API キーを設定してください。";
    } else if (err?.code === "quotaExceeded") {
      msg += "\n\n本日の API クォータを使い切りました。明日再度お試しください。";
    }
    showError(msg);
    return;
  }

  const { channelTitle, videos, fromCache, cachedAt } = response.data;
  currentChannelTitle = channelTitle;
  currentPeriod = period;
  currentVideos = videos.slice();

  headerTitle.textContent = `${channelTitle} の人気動画`;
  headerMeta.textContent = `${PERIOD_LABEL[period] || period} ・ ${videos.length} 件 (最大 ${maxResults})`;
  updateCacheBadge({ fromCache, cachedAt });

  if (videos.length === 0) {
    showEmpty();
    return;
  }

  applySortAndRender();
}

function applySortAndRender() {
  const sortKey = sortSelect.value;
  const sorted = currentVideos.slice().sort((a, b) => {
    if (sortKey === "publishedAt") {
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    }
    return (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0);
  });
  currentVideos = sorted;
  render(sorted);
}

function render(videos) {
  loadingEl.hidden = true;
  errorEl.hidden = true;
  emptyEl.hidden = true;
  listEl.hidden = false;
  listEl.innerHTML = "";

  for (let i = 0; i < videos.length; i++) {
    listEl.appendChild(buildCard(videos[i], i + 1));
  }
}

function buildCard(video, rank) {
  const li = document.createElement("li");
  li.className = "video-card";

  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`;

  const thumb = document.createElement("a");
  thumb.href = watchUrl;
  thumb.target = "_blank";
  thumb.rel = "noopener noreferrer";
  thumb.className = "thumbnail-wrap";

  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = "";
  img.referrerPolicy = "no-referrer";
  const safeThumb = safeThumbnailUrl(video.thumbnail);
  if (safeThumb) img.src = safeThumb;
  thumb.appendChild(img);

  const badge = document.createElement("span");
  badge.className = "rank-badge";
  badge.textContent = `#${rank}`;
  thumb.appendChild(badge);

  const body = document.createElement("div");
  body.className = "card-body";

  const titleLink = document.createElement("a");
  titleLink.className = "video-title";
  titleLink.href = watchUrl;
  titleLink.target = "_blank";
  titleLink.rel = "noopener noreferrer";
  titleLink.textContent = video.title || "(タイトル不明)";

  const stats = document.createElement("div");
  stats.className = "stats";
  stats.appendChild(span("views", `${formatCount(video.viewCount)} 回視聴`));
  stats.appendChild(span(null, formatRelativeDate(video.publishedAt)));
  if (typeof video.likeCount === "number" && video.likeCount > 0) {
    stats.appendChild(span(null, `👍 ${formatCount(video.likeCount)}`));
  }
  if (typeof video.commentCount === "number" && video.commentCount > 0) {
    stats.appendChild(span(null, `💬 ${formatCount(video.commentCount)}`));
  }

  body.appendChild(titleLink);
  body.appendChild(stats);

  li.appendChild(thumb);
  li.appendChild(body);
  return li;
}

function span(cls, text) {
  const el = document.createElement("span");
  if (cls) el.className = cls;
  el.textContent = text;
  return el;
}

function formatCount(n) {
  const num = Number(n) || 0;
  if (num >= 1_0000_0000) return `${(num / 1_0000_0000).toFixed(1)} 億`;
  // 99,995,000 以上は四捨五入で「10000.0 万」になり破綻するので億として表示。
  if (num >= 99_995_000) return `${(num / 1_0000_0000).toFixed(1)} 億`;
  if (num >= 1_0000) return `${(num / 1_0000).toFixed(1)} 万`;
  return num.toLocaleString("ja-JP");
}

function formatRelativeDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  // Invalid Date を弾く: API レスポンス仕様変更や旧キャッシュ汚染で
  // "NaN 日前" と表示されないように防御。
  if (Number.isNaN(d.getTime())) return "";
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "今日";
  if (diffDays < 7) return `${diffDays} 日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 週間前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} か月前`;
  return `${Math.floor(diffDays / 365)} 年前`;
}

function formatRelativeTime(ts) {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min} 分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 時間前`;
  const day = Math.floor(hr / 24);
  return `${day} 日前`;
}

// ---------------- Export ----------------

function buildRows() {
  const sortKey = sortSelect.value;
  const sortLabel = SORT_LABEL[sortKey] || sortKey;
  const header = [
    "順位",
    "タイトル",
    "URL",
    "再生回数",
    "高評価",
    "コメント数",
    "投稿日",
    `並び順:${sortLabel}`,
  ];
  const rows = currentVideos.map((v, i) => [
    i + 1,
    v.title || "",
    `https://www.youtube.com/watch?v=${v.videoId}`,
    v.viewCount ?? 0,
    v.likeCount ?? 0,
    v.commentCount ?? 0,
    v.publishedAt || "",
    "",
  ]);
  return { header, rows };
}

// CSV/TSV Formula Injection 対策:
// Excel/Sheets は先頭の空白・タブ・改行を無視して式と解釈する経路があるため、
// 先頭の空白類 (\s*) をスキップした最初の非空白文字が = + - @ なら ' を付与して無害化する。
// これで TSV 側で改行/タブを空白に潰した後でも判定が漏れない。
function neutralizeFormula(s) {
  return /^\s*[=+\-@]/.test(s) ? `'${s}` : s;
}

function escapeCsv(value) {
  const s = neutralizeFormula(String(value ?? ""));
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv({ header, rows }) {
  const lines = [header.map(escapeCsv).join(",")];
  for (const row of rows) lines.push(row.map(escapeCsv).join(","));
  // BOM 付きで Excel が UTF-8 を正しく認識する
  return "﻿" + lines.join("\r\n");
}

function toTsv({ header, rows }) {
  // タブ・改行を空白に潰す前に式判定する: \t=cmd|... が " =cmd|..." 化する経路を塞ぐ。
  const sanitize = (v) => {
    const raw = String(v ?? "");
    return neutralizeFormula(raw).replace(/[\t\r\n]+/g, " ");
  };
  const lines = [header.map(sanitize).join("\t")];
  for (const row of rows) lines.push(row.map(sanitize).join("\t"));
  return lines.join("\n");
}

// チャンネル名にはユーザー(=チャンネル運営者)が任意の Unicode を入れられるため、
// ファイル名に流す前に以下を除去する:
//   - OS 予約文字 (\ / : * ? " < > |)
//   - Bidi 制御文字 (RLO/LRO 等を使った拡張子偽装攻撃を防ぐ)
//   - ゼロ幅・不可視文字
//   - 改行・タブ
//   - 末尾のドットと空白 (Windows で扱いが不安定)
function sanitizeFilenamePart(s) {
  return s
    .normalize("NFC")
    // Unicode の制御文字・フォーマット文字 (Cc/Cf/Cn/Co/Cs) をまとめて除去。
    // ゼロ幅 (U+200B-200D), Bidi 制御 (U+200E-200F, U+202A-202E),
    // Invisible (U+2066-2069), BOM (U+FEFF) も全て \p{C} に含まれる。
    .replace(/\p{C}/gu, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 40)
    .trim();
}

function buildFilename(ext) {
  const raw = currentChannelTitle || channelInput || "youtube";
  const safeTitle = sanitizeFilenamePart(raw) || "youtube";
  const period = currentPeriod || periodSelect.value;
  const date = new Date().toISOString().slice(0, 10);
  return `${safeTitle}_${period}_${date}.${ext}`;
}

async function onCopy() {
  if (currentVideos.length === 0) {
    showToast("コピーする項目がありません", "error");
    return;
  }
  const tsv = toTsv(buildRows());
  try {
    await navigator.clipboard.writeText(tsv);
    showToast(`${currentVideos.length} 件をコピーしました (TSV)`);
  } catch (err) {
    showToast("コピーに失敗しました: " + (err?.message || err), "error");
  }
}

function onDownloadCsv() {
  if (currentVideos.length === 0) {
    showToast("ダウンロードする項目がありません", "error");
    return;
  }
  const csv = toCsv(buildRows());
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildFilename("csv");
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 大きな CSV や低速ストレージでもブラウザがダウンロードを開始する余裕を確保するため
  // 30 秒後に revoke する (固定 1 秒だとサイズ次第で中断する可能性がある)。
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  showToast(`CSV をダウンロード: ${a.download}`);
}

let toastEl = null;
let toastTimer = null;
function showToast(text, kind) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.classList.remove("error");
  if (kind === "error") toastEl.classList.add("error");
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}
