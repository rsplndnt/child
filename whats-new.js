// 新着情報のページネーションとモーダル制御

// whatsNewData は whats-new-data.js で定義されている
// ITEMS_PER_PAGE も whats-new-data.js で定義されている

class WhatsNewManager {
  constructor() {
    this.currentPage = 1;
    this.currentModalIndex = 0;
    this.currentContentIndex = 0;
    this.currentAppModalContentIndex = 0; // アプリスタイルモーダル用のコンテンツインデックス
    this.init();
  }

  init() {
    this.renderMainPage();
    this.setupModalEvents();
  }

  // メインページのレンダリング
  renderMainPage() {
    const container = document.getElementById('whatsNewContainer');
    if (!container) return;

    const totalPages = Math.ceil(whatsNewData.length / ITEMS_PER_PAGE);
    const start = (this.currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = whatsNewData.slice(start, end);

    let html = '';

    pageData.forEach((item, index) => {
      const globalIndex = start + index;

      html += `
        <div class="news-item-wrapper">
          <h2 class="news-item-title">${item.manualTitle || item.title}</h2>
          <article class="news-item" data-index="${globalIndex}" data-content-index="0">
            <div class="news-item-content">
      `;

      // 各コンテンツを見出し + 説明文 + 画像 + リンク + チケットIDの形式で表示
      if (item.contents && item.contents.length > 0) {
        item.contents.forEach(content => {
          html += `
            <div class="news-content-section">
              <h3 class="news-content-heading">${content.heading}</h3>
              <p class="news-content-text">${content.text}</p>
          `;

          // 画像がある場合は各トピックの直下に表示
          if (content.image) {
            html += `
              <div class="news-content-image">
                <img src="${content.image}" alt="${content.heading}" class="news-item-image" loading="lazy" style="max-width: 60%; height: auto;">
              </div>
            `;
          }

          // リンクがある場合は表示
          if (content.link) {
            html += `<p class="news-content-link"><a href="${content.link}" target="_blank" rel="noopener noreferrer">マニュアルを確認する <i class="material-icons">open_in_new</i></a></p>`;
          }

          // チケットIDを併記（確認用）
          if (content.ticketIds) {
            html += `<p class="news-content-ticket-ids"><small>PBI（開発用に記載。本番環境では削除。）: ${content.ticketIds}</small></p>`;
          }

          html += `
            </div>
          `;
        });
      }

      html += `
            </div>
          </article>
        </div>
      `;
    });

    // ページネーション
    if (totalPages > 1) {
      html += this.renderPagination(totalPages);
    }

    container.innerHTML = html;

    // イベントリスナー設定
    this.setupMainPageEvents();
    this.setupInlineContentPagination();
  }

  renderImage(imageUrl) {
    if (imageUrl) {
      return `<img src="${imageUrl}" alt="画像" class="news-item-image-real" loading="lazy">`;
    }
    return '<div class="news-item-image">Dummy Image</div>';
  }

  renderList(list) {
    return `
      <ul>
        ${list.map(item => `<li>${item}</li>`).join('')}
      </ul>
    `;
  }

  // テキストとリンクをレンダリング
  // enableLink: true = マニュアルサイト内（リンクあり）, false = モーダル（リンクなし）
  renderTextWithLink(text, link, enableLink) {
    if (enableLink && link) {
      return `<a href="${link}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
    return text;
  }

  renderInlineContentPagination(currentIndex, totalContents) {
    return `
      <div class="news-item-content-pagination">
        <button class="news-item-pagination-btn ${currentIndex === 0 ? 'disabled' : ''}"
                data-action="inline-prev" ${currentIndex === 0 ? 'disabled' : ''}>
          <i class="material-icons">chevron_left</i>
        </button>
        <span class="news-item-pagination-indicator">${currentIndex + 1} / ${totalContents}</span>
        <button class="news-item-pagination-btn ${currentIndex === totalContents - 1 ? 'disabled' : ''}"
                data-action="inline-next" ${currentIndex === totalContents - 1 ? 'disabled' : ''}>
          <i class="material-icons">chevron_right</i>
        </button>
      </div>
    `;
  }

  renderPagination(totalPages) {
    let html = '<div class="news-pagination">';

    // 前へボタン
    html += `
      <button class="news-pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}"
              data-action="prev" ${this.currentPage === 1 ? 'disabled' : ''}>
        <i class="material-icons">chevron_left</i>
        <span>前へ</span>
      </button>
    `;

    // ページ番号
    html += '<div class="news-pagination-pages">';
    for (let i = 1; i <= totalPages; i++) {
      html += `
        <button class="news-pagination-page ${i === this.currentPage ? 'active' : ''}"
                data-page="${i}">${i}</button>
      `;
    }
    html += '</div>';

    // 次へボタン
    html += `
      <button class="news-pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}"
              data-action="next" ${this.currentPage === totalPages ? 'disabled' : ''}>
        <span>次へ</span>
        <i class="material-icons">chevron_right</i>
      </button>
    `;

    html += '</div>';
    return html;
  }

  setupMainPageEvents() {
    // ページネーションボタン
    document.querySelectorAll('[data-action="prev"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderMainPage();
          this.scrollToTop();
        }
      });
    });

    document.querySelectorAll('[data-action="next"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const totalPages = Math.ceil(whatsNewData.length / ITEMS_PER_PAGE);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.renderMainPage();
          this.scrollToTop();
        }
      });
    });

    document.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = parseInt(e.target.dataset.page);
        this.currentPage = page;
        this.renderMainPage();
        this.scrollToTop();
      });
    });
  }

  setupInlineContentPagination() {
    document.querySelectorAll('[data-action="inline-prev"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const newsItem = e.target.closest('.news-item');
        const currentContentIndex = parseInt(newsItem.dataset.contentIndex);

        if (currentContentIndex > 0) {
          this.updateNewsItemContent(newsItem, currentContentIndex - 1);
        }
      });
    });

    document.querySelectorAll('[data-action="inline-next"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const newsItem = e.target.closest('.news-item');
        const currentContentIndex = parseInt(newsItem.dataset.contentIndex);
        const itemIndex = parseInt(newsItem.dataset.index);
        const item = whatsNewData[itemIndex];

        if (currentContentIndex < item.contents.length - 1) {
          this.updateNewsItemContent(newsItem, currentContentIndex + 1);
        }
      });
    });
  }

  updateNewsItemContent(newsItem, newContentIndex) {
    const itemIndex = parseInt(newsItem.dataset.index);
    const item = whatsNewData[itemIndex];
    const content = item.contents[newContentIndex];

    // コンテンツ部分を更新
    const contentDiv = newsItem.querySelector('.news-item-content');
    contentDiv.innerHTML = `
      <p>${content.text}</p>
      ${this.renderImage(content.image)}
      ${content.list ? this.renderList(content.list) : ''}
    `;

    // ヘッダーのページネーション部分を更新
    const paginationDiv = newsItem.querySelector('.news-item-content-pagination');
    if (paginationDiv) {
      const prevBtn = paginationDiv.querySelector('[data-action="inline-prev"]');
      const nextBtn = paginationDiv.querySelector('[data-action="inline-next"]');
      const indicator = paginationDiv.querySelector('.news-item-pagination-indicator');

      // ボタンの状態を更新
      if (newContentIndex === 0) {
        prevBtn.classList.add('disabled');
        prevBtn.disabled = true;
      } else {
        prevBtn.classList.remove('disabled');
        prevBtn.disabled = false;
      }

      if (newContentIndex === item.contents.length - 1) {
        nextBtn.classList.add('disabled');
        nextBtn.disabled = true;
      } else {
        nextBtn.classList.remove('disabled');
        nextBtn.disabled = false;
      }

      // インジケーターを更新
      indicator.textContent = `${newContentIndex + 1} / ${item.contents.length}`;
    }

    // data-content-index を更新
    newsItem.dataset.contentIndex = newContentIndex;
  }

  scrollToTop() {
    const section = document.getElementById('whats-new');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // モーダル制御
  openModal(index, contentIndex = 0) {
    this.currentModalIndex = index;
    this.currentContentIndex = contentIndex;

    const modal = document.getElementById('whatsNewModal');
    const modalBody = document.querySelector('.whats-new-modal-body');

    if (!modal || !modalBody) return;

    const item = whatsNewData[index];
    const content = item.contents[contentIndex];

    let contentHtml = `
      <div class="whats-new-modal-body-content">
        <div class="modal-news-header">
          <span class="news-item-date">${item.date}</span>
          <span class="news-item-badge">v${item.version}</span>
        </div>
        <h2 class="modal-news-title">${item.title}</h2>
        <div class="modal-news-content">
          <p>${this.renderTextWithLink(content.text, content.link, false)}</p>
          ${this.renderImage(content.image)}
          ${content.list ? this.renderList(content.list) : ''}
        </div>
      </div>
    `;

    // コンテンツページネーションまたは閉じるボタン
    if (item.contents.length > 1) {
      contentHtml += this.renderContentPagination(item.contents.length);
    } else {
      // コンテンツが1件の場合も閉じるボタンを表示
      contentHtml += this.renderSingleContentFooter();
    }

    modalBody.innerHTML = contentHtml;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    this.setupContentPagination();
  }

  renderSingleContentFooter() {
    return `
      <div class="modal-content-pagination">
        <div style="flex: 1;"></div>
        <button class="modal-close-btn" data-action="close-modal">
          <i class="material-icons">check_circle</i>
          <span>閉じる</span>
        </button>
      </div>
    `;
  }

  // whats-new-modal.html スタイルのモーダル（最新1件の全項目を1つのモーダルに表示）
  openAppStyleModal() {
    const modal = document.getElementById('whatsNewModal');
    const modalBody = document.querySelector('.whats-new-modal-body');

    if (!modal || !modalBody) return;
    if (!whatsNewData || whatsNewData.length === 0) return;

    // 最新（0番目）のデータを取得
    const latest = whatsNewData[0];
    if (!latest.contents || latest.contents.length === 0) return;

    let contentHtml = `
      <div class="whats-new-modal-body-content app-style-modal">
        <h1 class="app-modal-title">${latest.modalTitle || latest.title || '新バージョンのお知らせ'}</h1>
        <div class="app-modal-scrollable">
    `;

    // 画像がある項目と画像がない項目を分ける
    const itemsWithImage = latest.contents.filter(c => c.image);
    const itemsWithoutImage = latest.contents.filter(c => !c.image);

    // 画像がある項目を先に表示（見出し + 説明文 + 画像）
    itemsWithImage.forEach((content, index) => {
      contentHtml += `
        <div class="app-modal-content-item">
          <h2 class="app-modal-content-heading">${content.heading}</h2>
          <p class="app-modal-content-text">${content.text}</p>
          <div class="app-modal-image">
            <img src="${content.image}" alt="${content.heading}" class="modal-representative-image" loading="lazy" style="max-width: 60%; height: auto;">
          </div>
        </div>
      `;

      // 区切り線を追加
      if (index < itemsWithImage.length - 1 || itemsWithoutImage.length > 0) {
        contentHtml += `<hr class="app-modal-divider">`;
      }
    });

    // 画像がない項目の表示
    if (itemsWithoutImage.length > 0) {
      // 項目が1つだけの場合は見出し+説明文で表示
      if (itemsWithoutImage.length === 1) {
        const content = itemsWithoutImage[0];
        contentHtml += `
          <div class="app-modal-content-item">
            <h2 class="app-modal-content-heading">${content.heading}</h2>
            <p class="app-modal-content-text">${content.text}</p>
          </div>
        `;
      } else {
        // 複数の場合は箇条書きで表示
        contentHtml += `
          <div class="app-modal-content-item">
            <h2 class="app-modal-content-heading">その他の改善</h2>
            <ul class="app-modal-simple-list">
        `;

        itemsWithoutImage.forEach(content => {
          contentHtml += `<li>${content.heading}</li>`;
        });

        contentHtml += `
            </ul>
          </div>
        `;
      }
    }

    contentHtml += `
        </div>
        <div class="app-modal-buttons">
          <a href="#whats-new" class="app-modal-btn app-modal-btn-outline" data-action="view-details">
            詳細を見る
            <i class="material-icons">open_in_new</i>
          </a>
          <button class="app-modal-btn app-modal-btn-primary" data-action="close-app-modal">
            使いはじめる
          </button>
        </div>
      </div>
    `;

    modalBody.innerHTML = contentHtml;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // イベントリスナー設定
    this.setupAppModalEvents();
  }

  // アプリスタイルモーダルのイベントリスナー設定
  setupAppModalEvents() {
    const modal = document.getElementById('whatsNewModal');
    const modalBody = document.querySelector('.whats-new-modal-body');
    if (!modalBody) return;

    // 詳細を見るボタン
    const detailsBtn = modalBody.querySelector('[data-action="view-details"]');
    if (detailsBtn) {
      detailsBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // 閉じるボタン
    const closeBtn = modalBody.querySelector('[data-action="close-app-modal"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // オーバーレイクリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });
  }

  // テスト用: 日付選択リストを表示
  showDateList() {
    const modal = document.getElementById('whatsNewModal');
    const modalBody = document.querySelector('.whats-new-modal-body');

    if (!modal || !modalBody) return;

    let listHtml = `
      <div class="whats-new-modal-body-content">
        <h2 class="modal-date-list-title">新着情報を選択してください</h2>
        <p class="modal-date-list-description">※ この画面はテスト用です。実際の運用では最新の新着情報が自動的に表示されます。</p>
        <div class="modal-date-list">
    `;

    whatsNewData.forEach((item, index) => {
      listHtml += `
        <button class="modal-date-list-item" data-index="${index}">
          <div class="modal-date-list-item-header">
            <span class="news-item-date">${item.date}</span>
            <span class="news-item-badge">v${item.version}</span>
          </div>
          <div class="modal-date-list-item-title">${item.title}</div>
          ${item.contents.length > 1 ? `<span class="modal-date-list-item-count">${item.contents.length}件のコンテンツ</span>` : ''}
        </button>
      `;
    });

    listHtml += `
        </div>
        <div class="modal-date-list-footer">
          <button class="modal-date-list-cancel" data-action="cancel-date-list">
            <i class="material-icons">close</i>
            <span>キャンセル</span>
          </button>
        </div>
      </div>
    `;

    modalBody.innerHTML = listHtml;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // 日付リストのイベントリスナー設定
    this.setupDateListEvents();
  }

  setupDateListEvents() {
    document.querySelectorAll('.modal-date-list-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.openModal(index, 0);
      });
    });

    const cancelBtn = document.querySelector('[data-action="cancel-date-list"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }
  }

  renderContentPagination(totalContents) {
    const isLastPage = this.currentContentIndex === totalContents - 1;

    return `
      <div class="modal-content-pagination">
        <button class="modal-pagination-btn ${this.currentContentIndex === 0 ? 'disabled' : ''}"
                data-action="content-prev" ${this.currentContentIndex === 0 ? 'disabled' : ''}>
          <i class="material-icons">chevron_left</i>
        </button>
        <span class="modal-pagination-indicator">${this.currentContentIndex + 1} / ${totalContents}</span>
        <button class="modal-pagination-btn ${isLastPage ? 'disabled' : ''}"
                data-action="content-next" ${isLastPage ? 'disabled' : ''}>
          <i class="material-icons">chevron_right</i>
        </button>
        ${isLastPage ? `
          <button class="modal-close-btn" data-action="close-modal">
            <i class="material-icons">check_circle</i>
            <span>閉じる</span>
          </button>
        ` : ''}
      </div>
    `;
  }

  setupContentPagination() {
    const prevBtn = document.querySelector('[data-action="content-prev"]');
    const nextBtn = document.querySelector('[data-action="content-next"]');
    const closeBtn = document.querySelector('[data-action="close-modal"]');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentContentIndex > 0) {
          this.currentContentIndex--;
          this.openModal(this.currentModalIndex, this.currentContentIndex);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const item = whatsNewData[this.currentModalIndex];
        if (this.currentContentIndex < item.contents.length - 1) {
          this.currentContentIndex++;
          this.openModal(this.currentModalIndex, this.currentContentIndex);
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }
  }

  closeModal() {
    const modal = document.getElementById('whatsNewModal');
    // フォーカスをモーダル外に移動（アクセシビリティエラー回避）
    if (document.activeElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  setupModalEvents() {
    // オーバーレイクリックとESCキーは無効化
  }
}

// TOCの更新履歴リストを動的生成
function generateWhatsNewTocList() {
  const tocList = document.getElementById('whats-new-toc-list');
  if (!tocList || typeof whatsNewData === 'undefined') return;

  tocList.innerHTML = whatsNewData.map(item =>
    `<li><a class="toc-sublink" href="#whats-new" data-group-id="whats-new-items">v${item.version}</a></li>`
  ).join('');
}

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', () => {
  // TOCリストを生成
  generateWhatsNewTocList();

  if (typeof whatsNewData !== 'undefined' && whatsNewData.length > 0) {
    window.whatsNewManager = new WhatsNewManager();
    console.log('WhatsNewManager initialized successfully');
  } else {
    console.error('新着情報データが見つかりません');
  }
});
