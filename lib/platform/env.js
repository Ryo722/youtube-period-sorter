// 実行環境の検出 (Chrome 拡張 / 純 Web)
//
// 判定基準: chrome.runtime.id が存在するかどうか。
//   - 拡張内ドキュメント (popup / options / results / service-worker) では必ず存在
//   - Edge Chromium 等で `chrome` グローバル自体が部分的に存在するケースでも、
//     `chrome.runtime.id` までは生えていないため誤検出しない
//
// 上位レイヤ (lib/platform/*) は本関数のみで分岐し、各ファイルで chrome の
// 存在チェックを重複させない。

export const isExtension = () =>
  typeof chrome !== "undefined" && chrome?.runtime?.id != null;

// CSS から `html[data-platform="web"]` セレクタで判定するための属性を付与する。
// モバイル用メディアクエリは Web (PWA / ブラウザ) のときだけ発動させ、
// 拡張版 popup (360x600 固定) のレイアウトを保護する。
export const markPlatform = () => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.platform = isExtension() ? "extension" : "web";
};
