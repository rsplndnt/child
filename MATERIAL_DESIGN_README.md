# しゃべり描き翻訳™ - Material Design 実験版

このディレクトリには、Googleのマテリアルデザイン3（Material Design 3）を使用して再構築された実験的なバージョンが含まれています。

## 概要

既存のユーザーマニュアルWebサイトをGoogleのマテリアルデザインガイドラインに基づいて再実装しました。Material Components Web (MDC Web)ライブラリを使用し、モダンで一貫性のあるUIを提供します。

## ファイル構成

```
/Users/murakamimasahiro/child/
├── index-material.html          # Material Design版メインページ
├── whats-new-material.html      # Material Design版新着情報ページ
├── css/
│   └── material-custom.css      # カスタムMaterial Designスタイル
└── js/
    └── material-custom.js       # Material Designインタラクション実装
```

## 主な特徴

### 1. Material Design 3の完全実装

- **デザインシステム**: Googleの最新Material Design 3ガイドラインに準拠
- **カラーシステム**: ブランドカラー（#0071B8）をベースにしたMaterial Design 3トークン
- **タイポグラフィ**: Noto Sans JPとRobotoフォントを使用した階層的なテキストスタイル
- **エレベーション**: 5段階のシャドウシステムで深度を表現

### 2. Material Components

実装されているコンポーネント:

- **Navigation Drawer**: モーダル式のサイドバーナビゲーション
- **Top App Bar**: 固定ヘッダーバー
- **Cards**: 機能紹介用のエレベーション付きカード
- **Buttons**: Raised、Outlined、Textの3種類のボタン
- **FAB (Floating Action Button)**: ページトップへ戻るボタン
- **Dialog**: 新着情報表示用モーダルダイアログ
- **Text Fields**: 検索フィールド
- **List Items**: ナビゲーション項目
- **Chips**: バッジ表示

### 3. インタラクティブ機能

- **Material Ripple Effect**: すべてのインタラクティブ要素にリップルエフェクト
- **Smooth Animations**: 滑らかなトランジションとアニメーション
- **Responsive Design**: モバイル、タブレット、デスクトップ対応
- **Accessibility**: ARIA属性とキーボードナビゲーション対応

### 4. カラーシステム

Material Design 3のカラートークンを使用:

```css
Primary Color:       #0071B8  (ブランドブルー)
Primary Container:   #D1E4FF
Secondary Color:     #535F70
Surface Colors:      #FDFCFF ~ #E0E2EA (5段階)
Success Color:       #28a745
Warning Color:       #ffc107
Error Color:         #BA1A1A
```

## 使用技術

### フロントエンド

- **Material Components Web (MDC Web)**: v14.0.0+
- **Material Icons**: Googleのアイコンフォント
- **Noto Sans JP**: 日本語フォント
- **Roboto**: Material Design標準フォント

### CDNリソース

```html
<!-- Material Components CSS -->
<link href="https://unpkg.com/material-components-web@latest/dist/material-components-web.min.css">

<!-- Material Components JS -->
<script src="https://unpkg.com/material-components-web@latest/dist/material-components-web.min.js"></script>

<!-- Material Icons -->
<link href="https://fonts.googleapis.com/icon?family=Material+Icons">
```

## レスポンシブブレークポイント

- **モバイル**: 〜480px
- **タブレット**: 481px〜1024px
- **デスクトップ**: 1025px〜

## アクセシビリティ

### 実装されている機能

1. **ARIAラベル**: すべてのインタラクティブ要素に適切なARIA属性
2. **キーボードナビゲーション**: Tabキーとエスケープキーのサポート
3. **フォーカス表示**: 視覚的なフォーカスインジケーター
4. **セマンティックHTML**: 適切なHTML5要素の使用
5. **スクリーンリーダー対応**: 音声読み上げ最適化
6. **色のコントラスト**: WCAGガイドライン準拠

### 設定例

```css
/* 高コントラストモード */
@media (prefers-contrast: high) {
    .mdc-button--outlined {
        border-width: 2px;
    }
}

/* モーション削減 */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

## 主要コンポーネント詳細

### Navigation Drawer（サイドバー）

```javascript
const drawer = new mdc.drawer.MDCDrawer(document.querySelector('.mdc-drawer'));

// メニューボタンでトグル
menuButton.addEventListener('click', () => {
    drawer.open = !drawer.open;
});
```

### Dialog（モーダル）

```javascript
const dialog = new mdc.dialog.MDCDialog(document.querySelector('.mdc-dialog'));

// ダイアログを開く
whatsNewBtn.addEventListener('click', () => {
    dialog.open();
});
```

### FAB（トップへ戻る）

```javascript
// スクロール位置に応じて表示/非表示
mainContent.addEventListener('scroll', () => {
    if (mainContent.scrollTop > 300) {
        fab.style.display = 'flex';
    } else {
        fab.style.display = 'none';
    }
});
```

## カスタマイズ方法

### カラーテーマの変更

`css/material-custom.css`のCSS変数を編集:

```css
:root {
    --md-sys-color-primary: #0071B8;  /* ← ここを変更 */
    --md-sys-color-secondary: #535F70;
    /* ... */
}
```

### タイポグラフィの変更

```css
:root {
    --md-sys-typescale-body-large-font: 'Noto Sans JP', Roboto, sans-serif;
}
```

### スペーシングの調整

```css
:root {
    --spacing-xs: 8px;
    --spacing-sm: 12px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
}
```

## パフォーマンス最適化

### 実装済み

1. **遅延読み込み**: 画像の遅延読み込み（Lazy Loading）
2. **DNS Prefetch**: フォントとCDNのプリフェッチ
3. **デバウンス**: 検索入力のデバウンス処理
4. **スロットル**: スクロールイベントのスロットル処理

### 最適化例

```javascript
// デバウンス関数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```

## ブラウザサポート

- **Chrome**: 最新版 + 2バージョン
- **Firefox**: 最新版 + 2バージョン
- **Safari**: 最新版 + 2バージョン
- **Edge**: 最新版 + 2バージョン

Material Components Webは、モダンブラウザの最新2バージョンをサポートしています。

## 既知の制限事項

1. **MDC Webの制限**:
   - Persistent Drawerモードが完全にサポートされていない
   - 一部のコンポーネントがIE11非対応

2. **パフォーマンス**:
   - 大量のリップルエフェクトは低スペック端末で遅延する可能性
   - CDN経由のライブラリ読み込みに依存

3. **カスタマイズ**:
   - Material Design 3の厳格なガイドラインによる制約
   - 一部のブランド独自デザインは実装が困難

## 今後の改善予定

- [ ] 全セクションのコンテンツ実装
- [ ] ダークモード対応
- [ ] オフライン対応（Service Worker）
- [ ] パフォーマンスメトリクスの計測
- [ ] ユニットテストの追加
- [ ] E2Eテストの実装

## Material Design リソース

- [Material Design 3 公式ガイドライン](https://m3.material.io/)
- [Material Components Web](https://material.io/develop/web)
- [Material Icons](https://fonts.google.com/icons)
- [Material Design カラーツール](https://material.io/resources/color/)

## ライセンス

このプロジェクトは実験的な実装です。Material Components Webは[Apache License 2.0](https://github.com/material-components/material-components-web/blob/master/LICENSE)の下で提供されています。

## 開発者情報

- **作成日**: 2025年1月
- **ブランチ**: `experiment/material-design-implementation`
- **ベースバージョン**: しゃべり描き翻訳™ ユーザーマニュアル v1.0

## デモ

ブラウザで以下のファイルを開いて確認できます:

```bash
# メインページ
open index-material.html

# 新着情報ページ
open whats-new-material.html
```

## 開発メモ

### 既存版との主な違い

| 項目 | 既存版 | Material Design版 |
|------|--------|-------------------|
| UIフレームワーク | カスタムCSS | Material Components Web |
| ナビゲーション | 固定サイドバー | Modal Drawer |
| カード | カスタムデザイン | Material Card |
| ボタン | カスタムスタイル | Material Button |
| モーダル | カスタム実装 | Material Dialog |
| リップル効果 | なし | あり |
| アイコン | Font Awesome + Material Icons | Material Icons のみ |

### 技術的な選択理由

1. **Material Components Web を選択**:
   - Googleの公式実装
   - 継続的なメンテナンス
   - 豊富なドキュメント

2. **CDN経由での読み込み**:
   - 迅速なプロトタイピング
   - キャッシュの恩恵
   - バージョン管理の簡略化

3. **Noto Sans JP + Roboto**:
   - 日本語の読みやすさ
   - Material Designとの親和性

---

**注意**: これは実験的な実装であり、本番環境での使用前に十分なテストが必要です。
