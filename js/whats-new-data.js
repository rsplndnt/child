// 新着情報データ
const whatsNewData = [
  {
    date: "2025年1月5日",
    badge: "NEW",
    badgeClass: "",
    title: "ユーザーマニュアル Ver. 1.0 公開",
    contents: [
      {
        text: "しゃべり描き翻訳™のユーザーマニュアルを公開しました。アカウント設定から基本的な操作方法まで、画像付きで詳しく解説しています。",
        image: null // null の場合はダミー画像を表示
      }
    ]
  },
  {
    date: "2024年12月20日",
    badge: "UPDATE",
    badgeClass: "news-item-badge-update",
    title: "トランスクリプト機能の注意事項を追加",
    contents: [
      {
        text: "トランスクリプト機能使用時のシート切り替えに関する注意事項を追加しました。",
        image: null,
        list: [
          "トランスクリプト起動中のシート操作に関する注意点",
          "マイクボタンの無効化手順の明記"
        ]
      }
    ]
  },
  {
    date: "2024年12月15日",
    badge: "FIX",
    badgeClass: "news-item-badge-fix",
    title: "画像表示の最適化",
    contents: [
      {
        text: "マニュアル内の画像表示を最適化し、読み込み速度を改善しました。",
        image: null,
        list: [
          "画像のアスペクト比を16:9に統一",
          "HubSpot推奨事項に基づく実装"
        ]
      }
    ]
  }
];

// ページネーション設定
const ITEMS_PER_PAGE = 5;
