// 結果ページ・オプションページへの遷移抽象化
//
// 拡張モード:
//   - 結果ページ: 新規タブで chrome-extension://{id}/results/results.html を開く
//   - オプション: chrome.runtime.openOptionsPage() (新規タブで options/options.html)
//
// PWA モード:
//   - 結果ページ: 同オリジン /results.html?... へ遷移 (window.location)
//   - オプション: 同オリジン /options.html へ遷移
//
// PWA のディレクトリ配置: 拡張版と同じ構造を維持
//   /popup/popup.html, /options/options.html, /results/results.html
// のため popup 階層から見た兄弟ディレクトリへの相対パスで遷移する。
// (フラット化しないことで import パスの調整を不要にし、ビルドフリーを維持)

import { isExtension } from "./env.js";

export function openResultsPage(params) {
  const qs = params instanceof URLSearchParams ? params.toString() : String(params || "");
  if (isExtension()) {
    const url = chrome.runtime.getURL(`results/results.html${qs ? "?" + qs : ""}`);
    return chrome.tabs.create({ url });
  }
  // PWA: popup.html から見て兄弟ディレクトリの results へ
  window.location.href = `../results/results.html${qs ? "?" + qs : ""}`;
}

export function openOptions() {
  if (isExtension()) {
    chrome.runtime.openOptionsPage();
    return;
  }
  window.location.href = "../options/options.html";
}
