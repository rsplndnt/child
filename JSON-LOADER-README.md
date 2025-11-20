# JSON データローダー実装ガイド

## 概要

新着情報データをJSONファイルとして管理し、JavaScriptローダーで読み込む方式に変更しました。
この方式により、HubSpotの`get_asset_url()`と互換性を保ちながら、データとロジックを分離できます。

## ファイル構成

```
js/
├── whats-new-data.json      # 新着情報データ（JSON形式）
├── whats-new-loader.js      # JSONデータローダー（ローカル環境用）
└── whats-new.js             # WhatsNewManagerクラス（ロジック）
```

## データファイル: whats-new-data.json

純粋なJSON形式でデータを管理します。JavaScriptのコメントや変数宣言は含みません。

```json
[
  {
    "date": "2025年2月15日",
    "badge": "v1.1",
    "badgeClass": "",
    "title": "バージョン1.1の新機能と改善",
    "modalTitle": "新バージョンがリリースされました",
    "manualTitle": "バージョン1.1 更新内容",
    "contents": [
      {
        "heading": "機能名",
        "text": "説明文",
        "link": "/path/to/manual#section",
        "image": "https://example.com/image.png",
        "ticketIds": "123, 456"
      }
    ]
  }
]
```

### データ項目の説明

| フィールド | 必須 | 説明 |
|----------|------|------|
| `date` | ○ | リリース日 |
| `badge` | ○ | バージョンバッジ（例: "v1.1"） |
| `badgeClass` | - | バッジの追加CSSクラス |
| `title` | ○ | バージョンのタイトル |
| `modalTitle` | ○ | モーダル表示時のタイトル |
| `manualTitle` | ○ | マニュアルページ表示時のタイトル |
| `contents` | ○ | 更新内容の配列 |

#### contents配列の各項目

| フィールド | 必須 | 説明 |
|----------|------|------|
| `heading` | ○ | 機能名 |
| `text` | ○ | 説明文 |
| `link` | - | マニュアルへのリンク |
| `image` | - | 説明画像のURL |
| `ticketIds` | - | 関連チケットID（デバッグ用） |

## ローカル環境での使用方法

### HTMLでの読み込み順序

```html
<!-- 1. WhatsNewManagerクラス -->
<script src="js/whats-new.js"></script>

<!-- 2. JSONローダー -->
<script src="js/whats-new-loader.js"></script>
```

### データ読み込み完了の検知

JSONは非同期で読み込まれるため、`whatsNewDataLoaded`イベントで完了を検知します。

```javascript
window.addEventListener('whatsNewDataLoaded', function(event) {
    console.log('データ読み込み完了:', event.detail);

    // データを使用した処理
    if (window.whatsNewManager) {
        // 例: モーダルを開く
        window.whatsNewManager.openAppStyleModal();
    }
});
```

### グローバル変数

ローダーは以下のグローバル変数を設定します：

- `window.whatsNewData` - JSONから読み込まれたデータ配列
- `window.ITEMS_PER_PAGE` - ページネーションの1ページあたりの項目数（5）
- `window.whatsNewManager` - WhatsNewManagerのインスタンス

## HubSpot環境での使用方法

### テンプレートファイルでの実装

HubSpotでは`get_asset_url()`を使用してアセットパスを取得します。

```html
<!-- 1. WhatsNewManagerクラス -->
<script src="{{ get_asset_url('js/whats-new.js') }}"></script>

<!-- 2. HubSpot用インラインローダー -->
<script>
(function() {
    'use strict';

    // HubSpotのget_asset_url()でJSONファイルのパスを取得
    const JSON_PATH = '{{ get_asset_url("js/whats-new-data.json") }}';

    fetch(JSON_PATH)
        .then(response => response.json())
        .then(data => {
            window.whatsNewData = data;
            window.ITEMS_PER_PAGE = 5;

            if (typeof WhatsNewManager !== 'undefined') {
                window.whatsNewManager = new WhatsNewManager();
            }

            window.dispatchEvent(new CustomEvent('whatsNewDataLoaded', { detail: data }));
        })
        .catch(error => {
            console.error('Failed to load whats-new data:', error);
            window.whatsNewData = [];
            window.ITEMS_PER_PAGE = 5;
        });
})();
</script>
```

### HubSpot テンプレート例

完全な例は `index-hubspot-json.html` を参照してください。

## データの更新方法

### 新しいバージョンを追加する場合

1. `js/whats-new-data.json`を開く
2. 配列の**先頭**に新しいバージョンオブジェクトを追加

```json
[
  {
    "date": "2025年3月1日",
    "badge": "v1.2",
    "title": "バージョン1.2の新機能",
    ...
  },
  {
    "date": "2025年2月15日",
    "badge": "v1.1",
    ...
  }
]
```

### 既存のコンテンツを編集する場合

該当するオブジェクトを見つけて直接編集します。JSON形式に注意してください：

- 最後の項目以外は末尾にカンマ`,`が必要
- 文字列は`"`（ダブルクォート）で囲む
- コメント`//`は使用不可

## トラブルシューティング

### データが読み込まれない

1. ブラウザのコンソールでエラーを確認
2. JSONファイルのパスが正しいか確認
3. JSONの構文エラーがないか確認（[JSONLint](https://jsonlint.com/)で検証可能）

### HubSpotで404エラーが出る

- `get_asset_url()`のパスが正しいか確認
- HubSpotのファイルマネージャーにJSONファイルがアップロードされているか確認

### モーダルが表示されない

- `window.whatsNewDataLoaded`イベントが発火しているか確認
- `window.whatsNewManager`が存在するか確認
- `whats-new.js`が正しく読み込まれているか確認

## 従来方式との違い

| 項目 | 従来方式 | JSON方式 |
|------|---------|---------|
| データファイル | `whats-new-data.js` | `whats-new-data.json` |
| データ形式 | JavaScript変数 | JSON |
| コメント | 使用可能 | 使用不可 |
| 読み込み | 同期的 | 非同期的 |
| HubSpot互換性 | 低い | 高い |
| データとロジックの分離 | 低い | 高い |

## 注意事項

- このブランチ（`feature/json-data-loader`）はGitHub Pagesにデプロイしません
- 本番環境への適用前に、HubSpot環境で十分にテストしてください
- JSONファイルの編集時は、構文エラーに注意してください
- 非同期読み込みのため、ページ読み込み直後は`whatsNewData`が`undefined`の可能性があります

## ファイル一覧

- `js/whats-new-data.json` - データファイル
- `js/whats-new-loader.js` - ローカル環境用ローダー
- `js/whats-new.js` - WhatsNewManagerクラス（変更なし）
- `test-whats-new.html` - JSON方式のテストページ
- `index-hubspot-json.html` - HubSpotテンプレート例
- `JSON-LOADER-README.md` - このドキュメント
