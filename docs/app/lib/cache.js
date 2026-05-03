// 永続キャッシュ層 (拡張: chrome.storage.local / Web: localStorage)
//
// 設計上のポイント:
//   - 永続化先は lib/platform/storage.js が環境に応じて自動で振り分ける。
//     本ファイルは storage インターフェースのみを参照し chrome.* を直接触らない。
//   - キャッシュ列挙は "インデックスキー" (__cache_index__) に集約。
//     evict / clear / stats で全キー走査 (chrome.storage.local.get(null)) を呼ばない。
//     これにより apiKey 等の非キャッシュデータをメモリに展開しない。
//   - キー: cache:{encodeURIComponent(channelInput, max 200 chars)}:{period}:{maxResults}
//     channelInput をエスケープすることで、`:` 等の特殊文字によるキー衝突や
//     極端に長い入力によるストレージ圧迫を防ぐ。
//   - TTL: 24 時間 (一律)
//   - 上限: MAX_ENTRIES エントリ。超過したら最古から削除 (LRU 風)

import { storage } from "./platform/storage.js";

const PREFIX = "cache:";
const INDEX_KEY = "__cache_index__"; // [{ key, timestamp }, ...]
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 30;
const MAX_CHANNEL_INPUT_LEN = 200;

export const TTL = TTL_MS;

export function buildKey({ channelInput, period, maxResults }) {
  const raw = String(channelInput ?? "").slice(0, MAX_CHANNEL_INPUT_LEN);
  const safeInput = encodeURIComponent(raw);
  return `${PREFIX}${safeInput}:${period}:${maxResults}`;
}

async function getIndex() {
  const stored = await storage.get(INDEX_KEY);
  const idx = stored[INDEX_KEY];
  return Array.isArray(idx) ? idx : [];
}

async function setIndex(index) {
  await storage.set({ [INDEX_KEY]: index });
}

// TTL 内ならエントリを返す。期限切れなら null + 自動削除
export async function get(key) {
  const stored = await storage.get(key);
  const entry = stored[key];
  if (!entry) return null;
  const age = Date.now() - (entry.timestamp || 0);
  if (age > TTL_MS) {
    await storage.remove(key).catch(() => {});
    const index = await getIndex();
    const filtered = index.filter((e) => e.key !== key);
    if (filtered.length !== index.length) await setIndex(filtered);
    return null;
  }
  return entry;
}

// set() / clear() の read-modify-write を直列化するためのキュー。
// service worker は同一インスタンスで並行メッセージを処理するため、
// ロックを取らずに index を書き換えると後勝ち上書きで孤立エントリが残る。
let _writeQueue = Promise.resolve();
function enqueue(fn) {
  const next = _writeQueue.then(fn, fn);
  // チェーン途中の reject でキューが詰まらないよう吸収
  _writeQueue = next.catch(() => {});
  return next;
}

// timestamp を付与して保存。容量超過なら最古から削除
export function set(key, data) {
  return enqueue(() => _setImpl(key, data));
}

async function _setImpl(key, data) {
  let index = await getIndex();
  // 既存のキーがあれば一旦外して末尾に置き直す (LRU 的な振る舞い)
  index = index.filter((e) => e.key !== key);
  const now = Date.now();
  index.push({ key, timestamp: now });

  const overflow = [];
  while (index.length > MAX_ENTRIES) {
    const removed = index.shift();
    if (removed?.key) overflow.push(removed.key);
  }

  const entry = { ...data, timestamp: now };
  await storage.set({ [key]: entry, [INDEX_KEY]: index });
  if (overflow.length) {
    await storage.remove(overflow).catch(() => {});
  }
  return entry;
}

export function clear() {
  return enqueue(() => _clearImpl());
}

async function _clearImpl() {
  const index = await getIndex();
  const keys = index.map((e) => e.key).filter(Boolean);
  if (keys.length) {
    await storage.remove(keys).catch(() => {});
  }
  await storage.remove(INDEX_KEY).catch(() => {});
  return keys.length;
}

export async function stats() {
  const index = await getIndex();
  return { count: index.length, max: MAX_ENTRIES };
}
