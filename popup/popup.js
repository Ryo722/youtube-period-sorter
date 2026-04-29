// 現在のタブ URL から YouTube チャンネルを推定し、フォームに反映する
// サポート URL 例:
//   https://www.youtube.com/@handle
//   https://www.youtube.com/@handle/videos
//   https://www.youtube.com/channel/UCxxxx
//   https://www.youtube.com/watch?v=... (この場合はチャンネル不明 → 手動入力)

const channelInput = document.getElementById("channel-input");
const channelHint = document.getElementById("channel-hint");
const periodSelect = document.getElementById("period-select");
const maxSelect = document.getElementById("max-select");
const searchBtn = document.getElementById("search-btn");
const status = document.getElementById("status");
const openOptionsLink = document.getElementById("open-options");

function parseChannelFromUrl(rawUrl) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$/.test(url.hostname)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const first = decodeURIComponent(segments[0]);
  if (first.startsWith("@")) return first; // @handle
  if (first === "channel" && segments[1]) return segments[1]; // UC...
  return null;
}

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const detected = parseChannelFromUrl(tab?.url);
    if (detected) {
      channelInput.value = detected;
      channelHint.textContent = "現在のタブから検出しました";
    } else {
      channelHint.textContent = "YouTube のチャンネルページで開くと自動入力されます";
    }
  } catch {
    channelHint.textContent = "";
  }

  try {
    const { lastPeriod, lastMaxResults } = await chrome.storage.local.get([
      "lastPeriod",
      "lastMaxResults",
    ]);
    if (lastPeriod) periodSelect.value = lastPeriod;
    if (lastMaxResults) maxSelect.value = String(lastMaxResults);
  } catch {
    // 設定の復元に失敗しても致命的ではないので silent
  }
}

async function ensureApiKey() {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  return Boolean(apiKey);
}

async function onSearch() {
  status.classList.remove("error");
  status.textContent = "";

  const channel = channelInput.value.trim();
  if (!channel) {
    status.classList.add("error");
    status.textContent = "チャンネルを入力してください";
    return;
  }

  const hasKey = await ensureApiKey();
  if (!hasKey) {
    status.classList.add("error");
    status.textContent = "API キーが未設定です。下のリンクから設定してください。";
    return;
  }

  const period = periodSelect.value;
  const maxResults = Number(maxSelect.value) || 50;
  await chrome.storage.local.set({ lastPeriod: period, lastMaxResults: maxResults });

  const params = new URLSearchParams({ channel, period, max: String(maxResults) });
  const resultsUrl = chrome.runtime.getURL(`results/results.html?${params.toString()}`);
  await chrome.tabs.create({ url: resultsUrl });
  window.close();
}

searchBtn.addEventListener("click", onSearch);
channelInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onSearch();
});
openOptionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init().catch((err) =>
  console.error("[yt-period-sorter] popup init failed:", err?.message || err),
);
