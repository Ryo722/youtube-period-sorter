# プライバシーポリシー / Privacy Policy

**YouTube 期間別人気動画ソーター** (以下「本拡張機能」)

最終更新日 / Last updated: 2026-04-29

---

## 日本語

### 1. 収集する情報
本拡張機能は、以下の情報をユーザーのブラウザ内でのみ取り扱います。**本拡張機能の開発者および第三者のサーバーへの送信・収集・提供は一切行いません。** ただし、Google が提供する YouTube Data API v3 への通信のみ発生します (詳細は §2)。

| 情報 | 保存場所 | 目的 |
|---|---|---|
| YouTube Data API v3 の API キー | `chrome.storage.local` (お使いのブラウザ内、平文) | YouTube Data API v3 へのリクエスト認証 |
| 検索結果のキャッシュ (動画タイトル・サムネイル URL・再生回数等) | `chrome.storage.local` | API クォータ消費の節約 (24 時間有効) |
| 最後に選択した期間・件数・並び順 | `chrome.storage.local` | UI 設定の復元 |

`chrome.storage.local` に保存されるデータは、同一プロファイル内の本拡張機能からのみアクセス可能です (他の拡張機能や Web サイトからは読み取れません)。ただし、デバイスを物理的に第三者に渡す場合や、Chrome プロファイルを共有している場合は、API キーが閲覧される可能性があります。

### 2. 外部送信先
本拡張機能が通信するのは、**Google が提供する YouTube Data API v3 (`https://www.googleapis.com/youtube/v3/*`) のみ**です。
- 通信内容: 指定したチャンネルの動画一覧と統計情報の取得リクエスト
- 認証方法: ユーザー自身が発行した API キー (URL クエリパラメータ `key` で送信)
- Google による情報の取り扱いは [Google プライバシーポリシー](https://policies.google.com/privacy) に従います
- 本拡張機能の開発者にデータが渡ることは一切ありません

### 3. 個人情報の取り扱い
本拡張機能は、ユーザーの氏名・メールアドレス・閲覧履歴・位置情報など、**個人を特定できる情報を一切収集しません。**

### 4. データの削除方法
拡張機能のオプション画面 (`chrome://extensions/` で「詳細」→「拡張機能のオプション」) から個別に削除できます:

- **API キーを削除**: 「API キーを削除」ボタン
- **キャッシュを削除**: 「キャッシュを全削除」ボタン
- **すべて削除**: Chrome の拡張機能管理画面から本拡張機能をアンインストール

ローカル以外の場所にデータが保存されることはないため、外部への削除依頼は不要です。

### 5. 権限の利用範囲
本拡張機能が要求する権限と利用目的は以下の通りです。

| 権限 | 利用目的 |
|---|---|
| `storage` | API キーとキャッシュをローカル保存するため |
| `activeTab` | YouTube チャンネルページを開いている時に URL からチャンネル ID を自動入力するため (ユーザーが拡張アイコンをクリックした瞬間のみ) |
| `https://www.googleapis.com/youtube/v3/*` | YouTube Data API v3 へのリクエスト送信のため |

### 6. 変更
本ポリシーは予告なく変更される場合があります。変更があった場合は、本ページの最終更新日が更新されます。

### 7. お問い合わせ
本ポリシーに関するご質問は、以下までご連絡ください。

- 開発者: Ryo722
- 連絡先: ryo722.m0kur0@gmail.com
- リポジトリ: https://github.com/Ryo722/youtube-period-sorter

---

## English

### 1. Information Collected
This extension handles the following information **strictly within the user's browser**. **No data is sent to or collected by the developer of this extension or any other third party**, except for communication with Google's YouTube Data API v3 (see §2).

| Information | Storage Location | Purpose |
|---|---|---|
| YouTube Data API v3 API key | `chrome.storage.local` (in your browser, in plain text) | Authentication for requests to YouTube Data API v3 |
| Search result cache (video titles, thumbnail URLs, view counts, etc.) | `chrome.storage.local` | Reducing API quota consumption (valid for 24 hours) |
| Last selected period, max results, sort order | `chrome.storage.local` | UI state restoration |

Data stored in `chrome.storage.local` is accessible only to this extension within the same browser profile (other extensions and websites cannot read it). However, if you physically hand over the device to a third party or share the Chrome profile, the API key may be exposed.

### 2. External Communication
This extension communicates **only with Google's YouTube Data API v3 (`https://www.googleapis.com/youtube/v3/*`)**.
- Content: Requests for the specified channel's videos and their statistics
- Authentication: User's own API key (sent as URL query parameter `key`)
- Google's handling of any data follows the [Google Privacy Policy](https://policies.google.com/privacy)
- No data is sent to the developer of this extension

### 3. Personal Information
This extension does **not collect any personally identifiable information** such as name, email, browsing history, or location.

### 4. Data Removal
You can remove data individually from the extension's options page (open `chrome://extensions/`, click "Details" → "Extension options"):

- **Delete API key**: "Delete API Key" button
- **Delete cache**: "Clear All Cache" button
- **Remove everything**: Uninstall the extension from Chrome's extension management page

Since no data is stored outside your browser, no external removal request is needed.

### 5. Permissions
The permissions requested by this extension and their purposes are as follows.

| Permission | Purpose |
|---|---|
| `storage` | To save the API key and cache locally |
| `activeTab` | To auto-fill the channel ID from the URL when the user is on a YouTube channel page (only at the moment the user clicks the extension icon) |
| `https://www.googleapis.com/youtube/v3/*` | To send requests to the YouTube Data API v3 |

### 6. Changes
This policy may be updated without prior notice. Any update will be reflected in the "Last updated" date at the top of this page.

### 7. Contact
For questions regarding this policy, please contact:

- Developer: Ryo722
- Contact: ryo722.m0kur0@gmail.com
- Repository: https://github.com/Ryo722/youtube-period-sorter
