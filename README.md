しゃべり描き翻訳™ ユーザーマニュアル（GitHub Pages）
=================================================

このリポジトリは「しゃべり描き翻訳™ ユーザーマニュアル」の静的サイトです。`index.html` と `css/` `js/` で構成されています。

構成ガイド
---------------------------------
- CSS: `css/manual-ui.css`
  - 00. Base & Resets
  - 01. Design Tokens
  - 02. Layout
  - 03. Typography
  - 04. Components（例: step-advice, operation-grid, hero buttons など）
  - 05. Utilities（例: .button-label, .small-text, .marker-highlight）
- JS: `js/manual-ui.js`
  - 01) utilities
  - 02) URL & hash helpers
  - 03) smooth scroll engine

デプロイ（GitHub Pages）
---------------------------------
main ブランチへの push で自動デプロイされます。手動でトリガーしたい場合は空コミットでも可です。

```
git commit --allow-empty -m "chore: trigger deploy" && git push origin main
```

用語統一ポリシー（抜粋）
---------------------------------
- しゃべり描き翻訳™: タイトルやOG/Twitterのタイトルも ™ を付与
- しゃべり描き®: ® を付与
- バウンディングボックス → 選択枠
- スラッシュ表記: 半角スラッシュの前後に半角スペース（例: A / B）

開発時のチェック
---------------------------------
- リンク切れチェック（GitHub Actionsで自動化予定）
- Lighthouse/アクセシビリティのスポットチェック（任意）


