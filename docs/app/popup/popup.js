// 拡張アイコン (popup) または PWA エントリページの初期化
//
// chrome.* には直接触らず lib/platform/* 経由で操作する。
// 拡張モードでは現在のタブ URL から、PWA モードでは Web Share Target / URL クエリから
// チャンネルを推定して入力欄に流し込む。

import { storage } from "../lib/platform/storage.js";
import { getActiveYouTubeChannel } from "../lib/platform/tabs.js";
import { openResultsPage, openOptions } from "../lib/platform/runtime.js";
import { isExtension, markPlatform } from "../lib/platform/env.js";

// CSS のレスポンシブ条件分岐で参照するため、html 要素に platform 属性を付与する。
markPlatform();

// PWA モードでのみ Service Worker を登録 (拡張モードでは manifest.json で自動登録される)。
// scope を popup/ ではなくサイトルート (../) に揃えることで、results / options / icons など
// 全ページで同じ SW が有効になる。
if (!isExtension() && "serviceWorker" in navigator) {
  const swUrl = new URL("../sw.js", import.meta.url).href;
  const scope = new URL("../", import.meta.url).href;
  navigator.serviceWorker.register(swUrl, { scope }).catch((err) =>
    console.error("[yt-period-sorter] SW register failed:", err?.message || err),
  );
}

const channelInput = document.getElementById("channel-input");
const channelHint = document.getElementById("channel-hint");
const periodSelect = document.getElementById("period-select");
const maxSelect = document.getElementById("max-select");
const searchBtn = document.getElementById("search-btn");
const status = document.getElementById("status");
const openOptionsLink = document.getElementById("open-options");

async function init() {
  try {
    const detected = await getActiveYouTubeChannel();
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
    const { lastPeriod, lastMaxResults } = await storage.get([
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
  const { apiKey } = await storage.get("apiKey");
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
  await storage.set({ lastPeriod: period, lastMaxResults: maxResults });

  const params = new URLSearchParams({ channel, period, max: String(maxResults) });
  await openResultsPage(params);
  // 拡張版 (popup) では popup を閉じる。PWA では効果なしだが害もない。
  window.close();
}

searchBtn.addEventListener("click", onSearch);
channelInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onSearch();
});
openOptionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  openOptions();
});

init().catch((err) =>
  console.error("[yt-period-sorter] popup init failed:", err?.message || err),
);
