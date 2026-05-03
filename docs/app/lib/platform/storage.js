// chrome.storage.local 互換のキー/値ストレージ抽象化レイヤ
//
// セマンティクス:
//   - get(string|string[])  → 該当キーのみを含む object。未設定キーは欠落 (undefined ではなく key 自体無し)
//   - set(object)            → 複数キーを一括書き込み
//   - remove(string|string[]) → 削除
//
// 拡張モード: chrome.storage.local をそのまま委譲 (既存挙動を完全維持)。
//
// Web モード: localStorage を JSON シリアライズして使用。
//   - iOS Safari プライベートブラウジングや QuotaExceededError など
//     localStorage が例外を投げる経路に備えて in-memory Map にフォールバックする。
//   - 一度フォールバックすると以降は Map のみで動作 (永続化はされない)。
//     セッション内では機能を維持し、ユーザーに「storage が壊れた」状態を見せない。

import { isExtension } from "./env.js";

const memoryFallback = new Map();
let useMemory = false;

function tryMigrateLocalStorageToMemory() {
  // フォールバック発火時、既に localStorage に書き込まれていたデータをメモリ側に救出する。
  // 失敗してもメモリ側で続行できるように例外は握りつぶす。
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k == null) continue;
      try {
        const raw = localStorage.getItem(k);
        if (raw == null) continue;
        memoryFallback.set(k, JSON.parse(raw));
      } catch {
        // JSON.parse 失敗時は当該キーをスキップ (旧形式や破損データ)
      }
    }
  } catch {
    // localStorage 自体にアクセスできない環境ではそのまま空メモリで開始
  }
}

function readWeb(key) {
  if (useMemory) {
    return memoryFallback.has(key) ? memoryFallback.get(key) : undefined;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      // 値が JSON ではない (旧データ等) → 文字列のまま返す
      return raw;
    }
  } catch {
    useMemory = true;
    tryMigrateLocalStorageToMemory();
    return memoryFallback.has(key) ? memoryFallback.get(key) : undefined;
  }
}

function writeWeb(key, value) {
  if (useMemory) {
    memoryFallback.set(key, value);
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // QuotaExceededError / SecurityError 等 → メモリへ退避してから書く
    useMemory = true;
    tryMigrateLocalStorageToMemory();
    memoryFallback.set(key, value);
  }
}

function removeWeb(key) {
  if (useMemory) {
    memoryFallback.delete(key);
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch {
    useMemory = true;
    tryMigrateLocalStorageToMemory();
    memoryFallback.delete(key);
  }
}

export const storage = {
  async get(keyOrKeys) {
    if (isExtension()) {
      return await chrome.storage.local.get(keyOrKeys);
    }
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    const result = {};
    for (const k of keys) {
      const v = readWeb(k);
      if (v !== undefined) result[k] = v;
    }
    return result;
  },

  async set(obj) {
    if (isExtension()) {
      return await chrome.storage.local.set(obj);
    }
    for (const [k, v] of Object.entries(obj)) {
      writeWeb(k, v);
    }
  },

  async remove(keyOrKeys) {
    if (isExtension()) {
      return await chrome.storage.local.remove(keyOrKeys);
    }
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    for (const k of keys) {
      removeWeb(k);
    }
  },
};
