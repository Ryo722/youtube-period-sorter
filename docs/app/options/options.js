// オプション画面: API キー管理 + キャッシュ操作
//
// chrome.* には直接触らず lib/platform/* 経由でストレージ・キャッシュ操作を行う。

import { storage } from "../lib/platform/storage.js";
import { cacheStats, clearCache } from "../lib/platform/messaging.js";
import { markPlatform } from "../lib/platform/env.js";

// CSS のレスポンシブ条件分岐で参照するため、html 要素に platform 属性を付与する。
markPlatform();

const apiKeyInput = document.getElementById("api-key");
const toggleBtn = document.getElementById("toggle-visibility");
const saveBtn = document.getElementById("save-btn");
const testBtn = document.getElementById("test-btn");
const deleteKeyBtn = document.getElementById("delete-key-btn");
const status = document.getElementById("status");

function setStatus(text, kind) {
  status.classList.remove("success", "error");
  if (kind) status.classList.add(kind);
  status.textContent = text;
}

async function loadKey() {
  try {
    const { apiKey } = await storage.get("apiKey");
    if (apiKey) apiKeyInput.value = apiKey;
  } catch (err) {
    setStatus(`読み込みに失敗しました: ${err?.message || err}`, "error");
  }
}

async function saveKey() {
  const value = apiKeyInput.value.trim();
  if (!value) {
    setStatus("API キーを入力してください", "error");
    return;
  }
  try {
    await storage.set({ apiKey: value });
    setStatus("保存しました", "success");
  } catch (err) {
    setStatus(`保存に失敗しました: ${err?.message || err}`, "error");
  }
}

// API キーが UI 表示・ログ・例外メッセージに混入しないよう ?key=... を伏せる
function sanitizeForDisplay(value) {
  if (value == null) return "";
  const s = typeof value === "string" ? value : String(value);
  return s.replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]");
}

async function testKey() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus("API キーを入力してください", "error");
    return;
  }
  setStatus("テスト中…", null);
  try {
    // 軽量なエンドポイントで疎通確認 (i18nLanguages は 1 ユニット)
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/i18nLanguages?part=snippet&hl=ja&key=${encodeURIComponent(key)}`,
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const reason = body?.error?.errors?.[0]?.reason || res.status;
      setStatus(`失敗: ${sanitizeForDisplay(body?.error?.message || reason)}`, "error");
      return;
    }
    setStatus("OK: API キーは有効です", "success");
  } catch (err) {
    setStatus(`通信エラー: ${sanitizeForDisplay(err?.message || err)}`, "error");
  }
}

async function deleteKey() {
  if (!confirm("API キーを削除しますか? (この操作は元に戻せません)")) return;
  try {
    await storage.remove("apiKey");
    apiKeyInput.value = "";
    apiKeyInput.type = "password";
    toggleBtn.textContent = "表示";
    setStatus("API キーを削除しました", "success");
  } catch (err) {
    setStatus(`削除に失敗しました: ${err?.message || err}`, "error");
  }
}

toggleBtn.addEventListener("click", () => {
  const isPwd = apiKeyInput.type === "password";
  apiKeyInput.type = isPwd ? "text" : "password";
  toggleBtn.textContent = isPwd ? "隠す" : "表示";
});
saveBtn.addEventListener("click", saveKey);
testBtn.addEventListener("click", testKey);
deleteKeyBtn.addEventListener("click", deleteKey);

// --- キャッシュ操作 ---
const cacheStatsBtn = document.getElementById("cache-stats-btn");
const cacheClearBtn = document.getElementById("cache-clear-btn");
const cacheStatus = document.getElementById("cache-status");

function setCacheStatus(text, kind) {
  cacheStatus.classList.remove("success", "error");
  if (kind) cacheStatus.classList.add(kind);
  cacheStatus.textContent = text;
}

cacheStatsBtn.addEventListener("click", async () => {
  const res = await cacheStats();
  if (res?.ok) {
    setCacheStatus(`現在 ${res.data.count} / ${res.data.max} 件のキャッシュを保持しています`, null);
  } else {
    setCacheStatus(`取得失敗: ${res?.error?.message || "unknown"}`, "error");
  }
});

cacheClearBtn.addEventListener("click", async () => {
  if (!confirm("キャッシュをすべて削除しますか?")) return;
  const res = await clearCache();
  if (res?.ok) {
    setCacheStatus(`${res.removed} 件のキャッシュを削除しました`, "success");
  } else {
    setCacheStatus(`削除失敗: ${res?.error?.message || "unknown"}`, "error");
  }
});

loadKey().catch((err) =>
  console.error("[yt-period-sorter] loadKey failed:", err?.message || err),
);
