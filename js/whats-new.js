// 新着情報のページネーションとモーダル制御

class WhatsNewManager {
  constructor() {
    this.currentPage = 1;
    this.currentModalIndex = 0;
    this.currentContentIndex = 0;
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
        <article class="news-item" data-index="${globalIndex}" data-content-index="0">
          <div class="news-item-header">
            <div class="news-item-header-left">
              <span class="news-item-date">${item.date}</span>
              <span class="news-item-badge ${item.badgeClass}">${item.badge}</span>
            </div>
          </div>
          <h2 class="news-item-title">${item.title}</h2>
          <div class="news-item-content">
      `;

      // 全てのコンテンツを1ページにまとめて表示
      if (item.contents && item.contents.length > 0) {
        html += `<ul class="news-item-list">`;

        // 最初のコンテンツのテキスト
        html += `<li>${item.contents[0].text}</li>`;

        // 全てのリストを同じ階層で表示
        item.contents.forEach(content => {
          if (content.list && content.list.length > 0) {
            content.list.forEach(listItem => {
              html += `<li>${listItem}</li>`;
            });
          }
        });

        html += `</ul>`;

        // 画像を1枚表示（nullの場合はダミー画像）
        const firstContent = item.contents[0];
        html += this.renderImage(firstContent.image);
      }

      html += `
          </div>
        </article>
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
          <span class="news-item-badge ${item.badgeClass}">${item.badge}</span>
        </div>
        <h2 class="modal-news-title">${item.title}</h2>
        <div class="modal-news-content">
          <p>${content.text}</p>
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

  // whats-new-modal.html スタイルのモーダル（最新1件のみ、2つのボタン）
  openAppStyleModal() {
    const modal = document.getElementById('whatsNewModal');
    const modalBody = document.querySelector('.whats-new-modal-body');

    if (!modal || !modalBody) return;
    if (!whatsNewData || whatsNewData.length === 0) return;

    // 最新（0番目）のデータを取得
    const latest = whatsNewData[0];

    let contentHtml = `
      <div class="whats-new-modal-body-content app-style-modal">
        <h1 class="app-modal-title">${latest.title || '新バージョンのお知らせ'}</h1>
        <div class="app-modal-scrollable">
    `;

    // 全てのコンテンツのテキストを箇条書きで表示（全て同じ階層）
    if (latest.contents && latest.contents.length > 0) {
      contentHtml += `<ul class="app-modal-list">`;

      // 最初のコンテンツのテキスト
      contentHtml += `<li>${latest.contents[0].text}</li>`;

      // リストがあれば全て同じ階層で表示
      latest.contents.forEach(content => {
        if (content.list && content.list.length > 0) {
          content.list.forEach(item => {
            contentHtml += `<li>${item}</li>`;
          });
        }
      });

      contentHtml += `</ul>`;

      // 画像を1枚表示（nullの場合はダミー画像）
      const firstContent = latest.contents[0];
      contentHtml += `
        <div class="app-modal-image">
          ${this.renderImage(firstContent.image)}
        </div>
      `;
    }

    contentHtml += `
        </div>
        <div class="app-modal-buttons">
          <a href="https://lp.melbridge.mitsubishielectric.co.jp/manual-swipetalk"
             class="app-modal-btn app-modal-btn-outline"
             target="_blank">
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

    // 閉じるボタンのイベント
    const closeBtn = modalBody.querySelector('[data-action="close-app-modal"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }
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
            <span class="news-item-badge ${item.badgeClass}">${item.badge}</span>
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
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  setupModalEvents() {
    const mainModalBtn = document.getElementById('mainModalBtn');

    // メイン画面右上のモーダル表示ボタン
    if (mainModalBtn) {
      mainModalBtn.addEventListener('click', () => {
        // whats-new-modal.html スタイルのモーダルを表示
        this.openAppStyleModal();
      });
    }

    // オーバーレイクリックとESCキーは無効化
    // 右上の×ボタンも後で削除予定
  }
}

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', () => {
  new WhatsNewManager();
});
