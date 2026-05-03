// 「現在のコンテキストから推定される YouTube channel 文字列」を返す
//
// 拡張モード: 現在開いているタブの URL をパース (chrome.tabs.query)
//   - YouTube のチャンネルページなら @handle / channel/UC... を抽出
//
// PWA モード: URL クエリ (location.search) をパース
//   - Web Share Target で受け取った場合: url / text / title が入る (manifest.webmanifest 側で定義)
//   - 直接 ?channel=@handle で開かれた場合も同じ経路で拾う
//   - 何も無ければ null (= 自動入力なし、ユーザーが手で入れる)

import { isExtension } from "./env.js";

function parseChannelFromUrl(rawUrl) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    // URL 形式でなければ、`@handle` や `UCxxx` のリテラル文字列として扱えるか試す
    const trimmed = String(rawUrl).trim();
    if (/^@[A-Za-z0-9._-]+$/.test(trimmed)) return trimmed;
    if (/^UC[A-Za-z0-9_-]{20,}$/.test(trimmed)) return trimmed;
    return null;
  }
  if (!/(^|\.)youtube\.com$/.test(url.hostname)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const first = decodeURIComponent(segments[0]);
  if (first.startsWith("@")) return first;
  if (first === "channel" && segments[1]) return segments[1];
  return null;
}

export async function getActiveYouTubeChannel() {
  if (isExtension()) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return parseChannelFromUrl(tab?.url);
    } catch {
      return null;
    }
  }
  // PWA: Web Share Target / URL パラメタから取得
  const params = new URLSearchParams(location.search);
  const candidate =
    params.get("url") ||
    params.get("text") ||
    params.get("channel") ||
    params.get("title") ||
    null;
  return parseChannelFromUrl(candidate);
}
