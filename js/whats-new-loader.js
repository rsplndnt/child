/**
 * whats-new-loader.js
 * JSONデータを読み込んでグローバル変数に変換するローダー
 * HubSpotの get_asset_url() と互換性があります
 */

(function() {
  'use strict';

  // JSONファイルのパス（HubSpotではテンプレート構文で置き換えられます）
  // ローカル環境では直接パスを使用
  const JSON_PATH = 'js/whats-new-data.json';

  // JSONデータを読み込む
  fetch(JSON_PATH)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // グローバル変数に設定
      window.whatsNewData = data;
      window.ITEMS_PER_PAGE = 5;

      console.log('✓ whats-new data loaded:', data.length, 'version(s)');

      // WhatsNewManagerを初期化
      if (typeof WhatsNewManager !== 'undefined') {
        window.whatsNewManager = new WhatsNewManager();
        console.log('✓ WhatsNewManager initialized');
      } else {
        console.warn('WhatsNewManager is not defined yet. Make sure whats-new.js is loaded.');
      }

      // カスタムイベントを発火（他のスクリプトが待機できるように）
      window.dispatchEvent(new CustomEvent('whatsNewDataLoaded', { detail: data }));
    })
    .catch(error => {
      console.error('✗ Failed to load whats-new data:', error);
      // フォールバック: 空のデータを設定
      window.whatsNewData = [];
      window.ITEMS_PER_PAGE = 5;
    });
})();
