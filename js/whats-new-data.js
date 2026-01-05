
// バージョン表示範囲（この範囲内のバージョンのみ表示）
const VERSION_RANGE = { min: "1.0", max: "1.1" };

// 全バージョンの新着情報データ
const _allWhatsNewData = [
  {
    date: "2025-02-15",
    version: "1.2",
    title: "バージョン1.2の新機能と改善",
    modalTitle: "新バージョンがリリースされました",
    manualTitle: "バージョン1.2",
    contents: [
      {
        heading: "チーム機能の追加",
        text: "複数人で同じシートをリアルタイムで共有・編集できる「チームモード」が追加されました。トランスクリプトやキャンバスを複数人で同時に利用できます。",
        image: "https://lp.melbridge.mitsubishielectric.co.jp/hubfs/images/manual/swipeTalk/dummy-image.png",
        link: "/operation-guide#team-mode"
      },
      {
        heading: "使用時間制限の導入",
        text: "トランスクリプト機能の月間使用時間制限が導入されました。アカウント画面で残り時間を確認でき、上限に近づくと警告が表示されます。",
        image: "https://lp.melbridge.mitsubishielectric.co.jp/hubfs/images/manual/swipeTalk/dummy-image.png",
        link: "/product-specs#usage-limits"
      },
      {
        heading: "テキストのみ消去できる消しゴム機能",
        text: "画像や手描きの線を残したまま、音声入力で配置したテキストだけを消すことができるようになりました。新しい「テキスト消しゴム」ツールをご利用ください。",
        image: "https://lp.melbridge.mitsubishielectric.co.jp/hubfs/images/manual/swipeTalk/dummy-image.png"
      },
      {
        heading: "シート管理の改善（11枚目以降のアーカイブ）",
        text: "11枚目のシートを作成すると、古いシートが自動的にアーカイブされます。アーカイブされたシートは「シート管理」メニューから確認・復元できます。",
        image: "https://lp.melbridge.mitsubishielectric.co.jp/hubfs/images/manual/swipeTalk/dummy-image.png"
      },
      {
        heading: "PDFドキュメントのキャンバス対応",
        text: "PDFファイルをキャンバスに直接読み込めるようになりました。画像と同様に、PDFに描き込みや翻訳テキストを追加できます。技術文書や図面での利用に便利です。",
        image: "https://lp.melbridge.mitsubishielectric.co.jp/hubfs/images/manual/swipeTalk/dummy-image.png"
      },
      {
        heading: "トランスクリプト音声入力の改善",
        text: "短文ごとに区切って入力できるようになりました。より自然な会話の記録が可能です。発話の区切りを自動的に検出し、読みやすい形式で表示します。"
      },
      {
        heading: "しゃべり描き®音声読み上げ機能",
        text: "キャンバス上のテキストを音声で読み上げられるようになりました。視覚と聴覚の両方でコミュニケーションを支援します。",
        link: "/operation-guide#canvas-features"
      },
      {
        heading: "トランスクリプト音声読み上げ機能",
        text: "トランスクリプトの会話内容を音声で読み上げられるようになりました。会話の流れを音声で確認できるため、より自然なコミュニケーションが可能です。",
        link: "/operation-guide#transcript-features"
      },
      {
        heading: "画像・PDFファイルサイズ上限の拡張",
        text: "より大きなファイルをアップロードできるようになりました。高解像度の画像や複雑なPDF文書も扱えるようになり、より多様な用途に対応します。"
      },
      {
        heading: "初期起動時の言語設定ポップアップ",
        text: "初回起動時に翻訳言語を設定するガイドが表示されます。初めての方でも迷わず設定できるようになりました。",
        link: "/getting-started#initial-setup"
      },
      {
        heading: "トランスクリプトのテキスト取得機能",
        text: "トランスクリプトの会話内容をテキストファイルとしてダウンロードできるようになりました。会話の記録を外部で活用できます。",
        link: "/operation-guide#transcript-export"
      },
      {
        heading: "サポート対象外環境の警告表示",
        text: "非推奨ブラウザやOSでアクセスした際に警告が表示されます。最適な環境でのご利用をサポートします。"
      },
      {
        heading: "リリース内容の通知機能追加",
        text: "新機能や更新内容をモーダルで確認できるようになりました。"
      },
      {
        heading: "キャンバスのタッチパッド操作対応",
        text: "タッチパッドでの上下スクロールに対応しました。"
      },
      {
        heading: "シートタイトル機能の改善",
        text: "より使いやすいタイトル編集機能に改善されました。"
      },
      {
        heading: "翻訳表示の高速化（しゃべり描き）",
        text: "しゃべり描き機能の応答待ち時間が短縮されました。"
      }
    ]
  },
  {
    date: "2026-01-12",
    version: "1.1",
    title: "バージョン1.1の改善",
    modalTitle: "",
    manualTitle: "バージョン1.1",
    contents: [
      {
        heading: "安定性の向上",
        text: "アプリケーションの安定性を向上させました。"
      }
    ]
  },
  {
    date: "2025-10-01",
    version: "1.0",
    title: "初版リリース",
    modalTitle: "",
    manualTitle: "バージョン1.0",
    contents: [
      {
        heading: "初版リリース",
        text: "しゃべり描き翻訳をリリースしました。"
      }
    ]
  }
];

// VERSION_RANGEでフィルタリングされたデータ
const whatsNewData = _allWhatsNewData.filter(item => {
  const v = parseFloat(item.version);
  return v >= parseFloat(VERSION_RANGE.min) && v <= parseFloat(VERSION_RANGE.max);
});

// ページネーション設定
const ITEMS_PER_PAGE = 5;
