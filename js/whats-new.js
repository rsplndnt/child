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
      const content = item.contents[0]; // 最初のコンテンツを表示

      html += `
        <article class="news-item" data-index="${globalIndex}">
          <div>
            <span class="news-item-date">${item.date}</span>
            <span class="news-item-badge ${item.badgeClass}">${item.badge}</span>
            ${item.contents.length > 1 ? `<span class="news-item-multi-badge">${item.contents.length}件</span>` : ''}
          </div>
          <h2 class="news-item-title">${item.title}</h2>
          <div class="news-item-content">
            <p>${content.text}</p>
            ${this.renderImage(content.image)}
            ${content.list ? this.renderList(content.list) : ''}
            ${item.contents.length > 1 ? '<button class="news-item-more-btn">続きを読む</button>' : ''}
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
  }

  renderImage(imageUrl) {
    if (imageUrl) {
      return `<img src="${imageUrl}" alt="画像" class="news-item-image-real" loading="lazy">`;
    }
    return '<div class="news-item-image">16:9 画像</div>';
  }

  renderList(list) {
    return `
      <ul>
        ${list.map(item => `<li>${item}</li>`).join('')}
      </ul>
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
    // 続きを読むボタン
    document.querySelectorAll('.news-item-more-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const newsItem = e.target.closest('.news-item');
        const index = parseInt(newsItem.dataset.index);
        this.openModal(index);
      });
    });

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

    // コンテンツページネーション
    if (item.contents.length > 1) {
      contentHtml += this.renderContentPagination(item.contents.length);
    }

    modalBody.innerHTML = contentHtml;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    this.setupContentPagination();
  }

  renderContentPagination(totalContents) {
    return `
      <div class="modal-content-pagination">
        <button class="modal-pagination-btn ${this.currentContentIndex === 0 ? 'disabled' : ''}"
                data-action="content-prev" ${this.currentContentIndex === 0 ? 'disabled' : ''}>
          <i class="material-icons">chevron_left</i>
        </button>
        <span class="modal-pagination-indicator">${this.currentContentIndex + 1} / ${totalContents}</span>
        <button class="modal-pagination-btn ${this.currentContentIndex === totalContents - 1 ? 'disabled' : ''}"
                data-action="content-next" ${this.currentContentIndex === totalContents - 1 ? 'disabled' : ''}>
          <i class="material-icons">chevron_right</i>
        </button>
      </div>
    `;
  }

  setupContentPagination() {
    const prevBtn = document.querySelector('[data-action="content-prev"]');
    const nextBtn = document.querySelector('[data-action="content-next"]');

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
  }

  setupModalEvents() {
    const modal = document.getElementById('whatsNewModal');
    const modalBtn = document.getElementById('whatsNewModalBtn');
    const closeBtn = document.getElementById('whatsNewModalClose');
    const overlay = document.getElementById('whatsNewModalOverlay');

    const closeModal = () => {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    if (modalBtn) {
      modalBtn.addEventListener('click', () => {
        // 最新の新着情報をモーダルで開く
        this.openModal(0);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    if (overlay) {
      overlay.addEventListener('click', closeModal);
    }

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
        closeModal();
      }
    });
  }
}

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', () => {
  new WhatsNewManager();
});
