# Chrome Web Store 掲載用テキスト

> Web Store の Developer Dashboard で登録時にコピペで使えるドラフト。
> プライバシーポリシー URL は GitHub Pages 公開後に有効化される (公開前は 404)。

---

## 拡張機能名 (Name) — 最大 75 文字

```
YouTube 期間別人気動画ソーター
```

英語名 (任意):
```
YouTube Period Popular Sorter
```

## 概要 (Summary) — 最大 132 文字

日本語:
```
YouTube チャンネルの動画を「期間 × 再生回数」で絞り込み、人気順に並べて表示する拡張機能。期間 (24h〜全期間)・件数 (最大 100)・並び順を自由に切り替えできます。
```

English:
```
Sort YouTube channel videos by views, likes, or comments — within a custom time range (24h to all time). View up to 100 results per channel.
```

## 詳細説明 (Description)

### 日本語

```
YouTube の公式 UI には「特定の期間」かつ「人気順」で動画を絞り込む機能がありません。
本拡張機能はこの空白を埋めるシンプルなツールです。

【主な機能】
■ 期間プリセット
  過去 24 時間 / 1 週間 / 1 か月 / 3 か月 / 6 か月 / 1 年 / 全期間
■ 並び順切替
  再生回数 / 高評価 / コメント数 / 投稿日 (新しい順)
■ 件数選択
  最大 100 件まで
■ 24 時間ローカルキャッシュ
  同じ条件の再検索は API クォータを消費しません
■ エクスポート
  CSV ダウンロード / TSV クリップボードコピー (Google スプレッドシートに直接貼付可)

【使い方】
1. YouTube のチャンネルページ (例: youtube.com/@xxx) を開く
2. 拡張アイコンをクリック → 期間と件数を選択 → 「人気順で表示」
3. 新規タブに結果が表示されます

【API キーが必要です】
本拡張機能は Google 公式の YouTube Data API v3 を利用するため、ユーザーご自身で API キーを発行していただく必要があります。
無料枠 (1 日 10,000 ユニット) があり、通常利用なら十分にカバーできます。
取得手順は拡張機能のオプション画面に記載しています。

【プライバシー】
- すべての情報はお使いのブラウザ内にのみ保存されます
- 本拡張機能の開発者にはデータが一切送信されません
- 通信先は Google が提供する YouTube Data API v3 (https://www.googleapis.com/youtube/v3/) のみで、ご自身が発行した API キーで認証します
- 詳細: https://ryo722.github.io/youtube-period-sorter/PRIVACY

【ソースコード】
本拡張機能は MIT ライセンスのオープンソースです。
リポジトリ: https://github.com/Ryo722/youtube-period-sorter
```

### English

```
YouTube's native UI doesn't let you filter a channel's videos by "popularity within a custom time range". This extension fills that gap.

[Features]
- Period presets: 24h / 1w / 1m / 3m / 6m / 1y / all time
- Sort by: views / likes / comments / publish date
- Up to 100 results per query
- 24h local cache to save API quota
- Export to CSV / copy as TSV for spreadsheets

[How to use]
1. Open a YouTube channel page (e.g. youtube.com/@xxx)
2. Click the extension icon, choose a period and count, hit "Show by popularity"
3. Results open in a new tab

[API key required]
This extension uses the official YouTube Data API v3, so you need to issue your own API key. The free tier (10,000 units/day) is sufficient for typical use. Setup steps are in the options page.

[Privacy]
- All data stays in your browser only
- Nothing is sent to the developer of this extension
- The only external endpoint is Google's YouTube Data API v3 (https://www.googleapis.com/youtube/v3/), authenticated with your own API key
- Details: https://ryo722.github.io/youtube-period-sorter/PRIVACY

[Open source]
MIT licensed. Source: https://github.com/Ryo722/youtube-period-sorter
```

## カテゴリ (Category)
推奨: **生産性向上 (Productivity)**

## 言語 (Languages)
- 日本語 (Primary)
- 英語 (Secondary, 任意)

---

## 「単一目的」の説明 (Single Purpose Description)
> Web Store 審査で求められる項目。短く明確に。

日本語:
```
YouTube のチャンネル動画を、ユーザー指定の期間内で再生回数等の指標により並び替えて表示する。
```

English:
```
Sort and display videos of a specified YouTube channel by metrics such as view count, within a user-specified time range.
```

---

## 権限の正当化 (Permission Justification)
> Web Store の権限ごとに「なぜ必要か」を1〜2文で記入する欄がある。

| 権限 | 正当化文 (日本語) | Justification (English) |
|---|---|---|
| `storage` | API キー (ユーザーが発行) と検索結果のキャッシュをブラウザ内に保存するために必要です。 | Required to store the user-issued API key and cached query results within the browser. |
| `activeTab` | ユーザーが拡張アイコンをクリックした際、開いている YouTube チャンネルページの URL を読み取り、チャンネル名を自動入力するために必要です。 | Required to read the URL of the active YouTube channel tab the moment the user clicks the extension icon, in order to auto-fill the channel name. |
| `Host permission: https://www.googleapis.com/youtube/v3/*` | YouTube Data API v3 にチャンネル・動画情報のリクエストを送信するために必要です。 | Required to send requests for channel and video information to the YouTube Data API v3. |

「リモートコード (Remote Code)」の使用: **なし** (No)
本拡張機能は外部スクリプトを動的に読み込みません。

---

## 開発者連絡先 (Developer Contact)
- メール: ryo722.m0kur0@gmail.com (Web Store で必須)
- ウェブサイト: https://github.com/Ryo722/youtube-period-sorter (任意)

## プライバシーポリシー URL (Privacy Policy URL)
> Web Store 公開には公開 URL が必須。GitHub Pages / Gist などで `docs/PRIVACY.md` を公開してその URL を記入。

```
https://ryo722.github.io/youtube-period-sorter/PRIVACY
```

---

## 投稿前チェックリスト

- [x] `LICENSE` の著作者名を Ryo722 に設定
- [x] `docs/PRIVACY.md` の連絡先・リポジトリ URL を設定
- [x] このファイルの著作者・URL を設定
- [x] セキュリティレビュー (Claude + Codex の敵対的レビュー) を実施し、Critical/High/Medium をすべて修正
- [x] `manifest.json` の `version` を `1.0.0` に確定
- [x] `scripts/build-zip.sh` で配布 ZIP (`dist/youtube-period-sorter-1.0.0.zip`) を生成
- [ ] GitHub にリポジトリを公開し、Pages を有効化 (Settings → Pages → Source: `main` の `/docs`)
- [ ] プライバシーポリシー URL (`https://ryo722.github.io/youtube-period-sorter/PRIVACY`) が 200 で開けることを確認
- [ ] スクリーンショット 1〜5 枚 (1280x800 または 640x400) を `docs/screenshots/` に配置
- [ ] Chrome Web Store Developer Dashboard ($5 USD 一回払い) で新規アイテム登録
- [ ] アップロード → 審査提出 (通常 1〜数日)
