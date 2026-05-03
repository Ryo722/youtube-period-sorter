// API キー漏洩防止用サニタイザ
//
// 任意の文字列 (エラーメッセージ・URL・スタックトレース等) に含まれる
// `?key=...` / `&key=...` を [REDACTED] に置換する。
// console.error / sendResponse / UI 表示の手前で必ず通すこと。

export function sanitizeForLog(value) {
  if (value == null) return value;
  const s = typeof value === "string" ? value : String(value);
  return s.replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]");
}
