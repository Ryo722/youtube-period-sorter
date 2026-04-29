#!/bin/bash
# Chrome Web Store 提出用 ZIP を生成する
# Usage: ./scripts/build-zip.sh
#
# 出力: dist/youtube-period-sorter-<version>.zip
# manifest.json の version を読んでファイル名に埋め込む

set -euo pipefail
cd "$(dirname "$0")/.."

ROOT="$(pwd)"
DIST="$ROOT/dist"
mkdir -p "$DIST"

# manifest.json から version を抽出 (jq に依存しない簡易抽出)
VERSION=$(grep -E '^\s*"version"\s*:' manifest.json | head -1 | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
if [ -z "$VERSION" ]; then
  echo "ERROR: manifest.json から version を抽出できませんでした" >&2
  exit 1
fi

OUT="$DIST/youtube-period-sorter-${VERSION}.zip"
rm -f "$OUT"

# Chrome Web Store 提出用に含めるもの
#   - manifest.json
#   - 各エントリーポイント (popup/, options/, results/, background/)
#   - lib/ アイコン
# 含めないもの
#   - docs/, scripts/, dist/, README.md, LICENSE (ストア掲載で別途)
#   - .git, .DS_Store, *.svg, build.sh
#   - icon.svg は同梱不要 (PNG だけあれば動く)

INCLUDE=(
  manifest.json
  background
  lib
  options
  popup
  results
  icons/icon-16.png
  icons/icon-32.png
  icons/icon-48.png
  icons/icon-128.png
)

# 不要ファイルが含まれていないかチェック (ベストエフォート)
for item in "${INCLUDE[@]}"; do
  if [ ! -e "$item" ]; then
    echo "ERROR: 必須ファイル/ディレクトリが見つかりません: $item" >&2
    exit 1
  fi
done

# プレースホルダ未置換チェック (公開前事故防止)
# 配布対象に <YOUR_NAME> 等が残ったままパッケージされるのを止める
PLACEHOLDER_HITS=$(grep -rIEn "<YOUR_[A-Z_]+>" "${INCLUDE[@]}" 2>/dev/null || true)
if [ -n "$PLACEHOLDER_HITS" ]; then
  echo "ERROR: プレースホルダが未置換のファイルが配布対象に含まれています:" >&2
  echo "$PLACEHOLDER_HITS" >&2
  exit 1
fi

# よくある秘密情報パターンの簡易スキャン (false positive 上等で stop the world)
# AIza... = Google API キー / -----BEGIN ...PRIVATE KEY----- 等
SECRET_HITS=$(grep -rIEn "AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----" "${INCLUDE[@]}" 2>/dev/null || true)
if [ -n "$SECRET_HITS" ]; then
  echo "ERROR: 秘密情報らしき文字列が配布対象に含まれています:" >&2
  echo "$SECRET_HITS" >&2
  exit 1
fi

# zip 作成: 隠しファイル (.DS_Store 等) を除外
zip -r "$OUT" "${INCLUDE[@]}" \
  -x "**/.DS_Store" "**/.*" "**/*.swp" "**/*.bak" \
  > /dev/null

echo "✅ Created: $OUT"
echo
echo "ZIP の中身 (ファイル一覧):"
unzip -Z1 "$OUT"

SIZE=$(du -h "$OUT" | awk '{print $1}')
COUNT=$(unzip -Z1 "$OUT" | wc -l | tr -d ' ')
echo
echo "サイズ: $SIZE / ファイル数: $COUNT"
echo
echo "次のステップ:"
echo "  1. Chrome Web Store Developer Dashboard にアクセス"
echo "     https://chrome.google.com/webstore/devconsole"
echo "  2. 「新しいアイテム」→ $OUT をアップロード"
echo "  3. docs/STORE_LISTING.md の内容を入力欄に貼り付け"
echo "  4. docs/screenshots/ のスクリーンショットをアップロード"
echo "  5. 公開申請 → 審査結果を待つ (通常 1〜数日)"
