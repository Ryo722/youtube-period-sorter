#!/bin/bash
# PWA 配布用ディレクトリを生成する
# Usage: ./scripts/build-pwa.sh
#
# 出力: dist/pwa/ (静的ホスティング用)
#       dist/youtube-period-sorter-<version>-pwa.zip (任意; ZIP=1 で生成)
#
# 同一 lib/ コードを拡張版と PWA 版で共有する設計のため、本スクリプトは
# 共通アセット (popup/options/results/lib/icons) をコピーした上で、
# PWA 専用ファイル (manifest.webmanifest / sw.js / index.html) を public/ から重ねる。

set -euo pipefail
cd "$(dirname "$0")/.."

ROOT="$(pwd)"
DIST="$ROOT/dist"
OUT_DIR="$DIST/pwa"
mkdir -p "$DIST"

VERSION=$(grep -E '^\s*"version"\s*:' manifest.json | head -1 | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
if [ -z "$VERSION" ]; then
  echo "ERROR: manifest.json から version を抽出できませんでした" >&2
  exit 1
fi

# 必須ファイルの存在チェック (PWA 専用ファイル)
for f in public/manifest.webmanifest public/sw.js public/index.html; do
  if [ ! -e "$f" ]; then
    echo "ERROR: 必須ファイルが見つかりません: $f" >&2
    exit 1
  fi
done

# アイコンの 192/512 が存在するか (PWA で必須)
for size in 192 512; do
  if [ ! -e "icons/icon-${size}.png" ]; then
    echo "ERROR: PWA 用アイコンが不足しています: icons/icon-${size}.png" >&2
    echo "  ./icons/build.sh を実行して生成してください。" >&2
    exit 1
  fi
done

# プレースホルダ未置換チェック
PLACEHOLDER_HITS=$(grep -rIEn "<YOUR_[A-Z_]+>" popup options results lib icons public 2>/dev/null || true)
if [ -n "$PLACEHOLDER_HITS" ]; then
  echo "ERROR: プレースホルダが未置換のファイルが配布対象に含まれています:" >&2
  echo "$PLACEHOLDER_HITS" >&2
  exit 1
fi

# 秘密情報の簡易スキャン
SECRET_HITS=$(grep -rIEn "AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----" popup options results lib icons public 2>/dev/null || true)
if [ -n "$SECRET_HITS" ]; then
  echo "ERROR: 秘密情報らしき文字列が配布対象に含まれています:" >&2
  echo "$SECRET_HITS" >&2
  exit 1
fi

# クリーンビルド
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# 共通アセットをコピー
for d in popup options results lib; do
  cp -R "$d" "$OUT_DIR/"
done

# アイコン (svg は同梱しない / 16-128 + 192/512 のみ)
mkdir -p "$OUT_DIR/icons"
for size in 16 32 48 128 192 512; do
  cp "icons/icon-${size}.png" "$OUT_DIR/icons/"
done

# PWA 専用ファイルを public/ から重ねる
cp public/manifest.webmanifest "$OUT_DIR/"
cp public/sw.js "$OUT_DIR/"
cp public/index.html "$OUT_DIR/"

# manifest screenshots (Chrome Rich Install UI 用; 拡張版では使わない)
if [ -d public/screenshots ]; then
  cp -R public/screenshots "$OUT_DIR/"
fi

# SW のキャッシュバージョンをビルド時刻に置換 (再デプロイで確実に新キャッシュへ切り替え)
BUILD_TS=$(date +%Y%m%d%H%M%S)
# macOS BSD sed 互換: -i '' を使用
sed -i '' "s/const VERSION = \"v1\";/const VERSION = \"v1-${BUILD_TS}\";/" "$OUT_DIR/sw.js"

# popup/options/results の HTML に PWA 用 head 要素を注入する。
# (拡張版に同じ link を書くと chrome-extension:// 配下で 404 になるため、ビルド時のみ追加)
inject_pwa_head() {
  local file="$1"
  if grep -q 'rel="manifest"' "$file"; then
    return 0
  fi
  # 各ページ (popup/options/results) は PWA dist では兄弟階層 → ../{manifest.webmanifest, icons/...}
  local snippet='    <link rel="manifest" href="../manifest.webmanifest" />\
    <meta name="theme-color" content="#cc0000" />\
    <link rel="icon" href="../icons/icon-32.png" sizes="32x32" />\
    <link rel="apple-touch-icon" href="../icons/icon-192.png" />'
  # </head> の直前に挿入
  sed -i '' "s|</head>|${snippet}\\
  </head>|" "$file"
}

for page in popup/popup.html options/options.html results/results.html; do
  inject_pwa_head "$OUT_DIR/$page"
done

# 不要ファイルを除去 (rsync ではなく cp -R を使うので明示削除)
find "$OUT_DIR" \( -name ".DS_Store" -o -name "*.swp" -o -name "*.bak" \) -delete 2>/dev/null || true

echo "✅ Built: $OUT_DIR/"
echo
echo "ファイル数: $(find "$OUT_DIR" -type f | wc -l | tr -d ' ')"
echo "サイズ:     $(du -sh "$OUT_DIR" | awk '{print $1}')"

# 任意: ZIP 化 (ZIP=1 で生成)
if [ "${ZIP:-}" = "1" ]; then
  ZIP_OUT="$DIST/youtube-period-sorter-${VERSION}-pwa.zip"
  rm -f "$ZIP_OUT"
  (cd "$OUT_DIR" && zip -r "$ZIP_OUT" . > /dev/null)
  echo
  echo "✅ Created: $ZIP_OUT"
fi

echo
echo "ローカル動作確認:"
echo "  cd $OUT_DIR && python3 -m http.server 8000"
echo "  → http://localhost:8000/ にアクセス"
echo
echo "デプロイ例 (GitHub Pages):"
echo "  $OUT_DIR/ の中身を gh-pages ブランチに push"
