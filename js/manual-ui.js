/* manual-ui.js — 完全版（サイドバー内トグル削除版）
   - タブ / TOC / sub-items 同期
   - サイドバーリサイズ（保存）
   - モバイルハンバーガー（Material Symbols 文字列切替）
   - 画像プレースホルダ自動挿入（IMG_SRC）
   - 内部検索（ハイライト / 精確ジャンプ / Enterで再検索）
   - 外部重複クリアボタンを排除
   - a11y配慮 (aria-*)
   - "サイドバーを隠す" ボタン周りは削除（後で実装する想定）
*/
(function () {
  'use strict';

  const IMG_SRC = 'https://lp.melbridge.mitsubishielectric.co.jp/hubfs/images/test.png';
  const SIDEBAR_WIDTH_KEY = 'mb-manual-sidebar-width';
  const MOBILE_BREAKPOINT = 1024;

  /* ---------------- utilities ---------------- */
  function debounce(fn, wait = 160) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
  function escapeRegExp(s) { return (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
  function getScrollOffset() {
    const tabs = document.querySelector('.content-tabs');
    return (tabs && tabs.offsetHeight) ? tabs.offsetHeight + 12 : 20;
  }

  /* ---------------- boot ---------------- */
  document.addEventListener('DOMContentLoaded', function() {
    // 少し遅延を追加して要素が確実に存在することを保証
    setTimeout(init, 100);
  });

  // フォールバック: window.onloadでも実行
  window.addEventListener('load', function() {
    const hamburger = document.getElementById('hamburgerMenu');
    if (hamburger && !hamburger.hasAttribute('data-initialized')) {
      hamburger.setAttribute('data-initialized', 'true');
      
      hamburger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const sidebar = document.getElementById('sidebarMenu');
        const overlay = document.getElementById('menuOverlay');
        const mi = hamburger.querySelector('.material-icons');
        
        const active = hamburger.classList.toggle('active');
        if (mi) mi.textContent = active ? 'close' : 'menu';
        hamburger.setAttribute('aria-expanded', String(active));
        
        if (sidebar) sidebar.classList.toggle('active', active);
        if (overlay) overlay.classList.toggle('active', active);
        
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
          document.body.style.overflow = active ? 'hidden' : '';
        }
      });
    }
  });

  function init() {
    // 二重初期化ガード（重複読み込み/多重バインド防止）
    const INIT_FLAG = 'data-mb-manual-ui-init';
    const root = document.documentElement;
    if (root.getAttribute(INIT_FLAG) === '1') { 
      return; 
    }
    root.setAttribute(INIT_FLAG, '1');
    const sidebar = document.getElementById('sidebarMenu');
    const resizer = document.getElementById('sidebarResizer');
    const hamburger = document.getElementById('hamburgerMenu');
    // ここで初期化フラグを立てて、window.onload フォールバックによる二重バインドを防止
    if (hamburger && !hamburger.hasAttribute('data-initialized')) {
      hamburger.setAttribute('data-initialized', 'true');
    }
    const overlay = document.getElementById('menuOverlay');
    const tabs = Array.from(document.querySelectorAll('.content-tabs .tab'));
    const tocLinks = Array.from(document.querySelectorAll('.toc .toc-link'));
    const subGroups = Array.from(document.querySelectorAll('.sub-items-group'));
    const subLinks = Array.from(document.querySelectorAll('.sub-items-group a'));
    const sections = Array.from(document.querySelectorAll('.content-panel .step-section'));
    const searchInput = document.getElementById('manualSearch');
    const searchResults = document.getElementById('manualSearchResults');
    const searchBtn = document.getElementById('searchBtn');
    let searchCycleIndex = -1; // 検索ボタンサイクル用
    let lastQueryValue = '';



    // remove duplicate/外部クリア要素（安全に）
    removeExternalClearButtons();

    // ノーマライズ & placeholder
    normalizeLabels();
    insertPlaceholders();

    // 初期化時に✕ボタンを非表示
    const closeBtn = document.getElementById('sidebarCloseBtn');
    if (closeBtn) {
      closeBtn.style.display = 'none';
    }

    // 左TOCにサブ項目（右カラムの内容）を生成し、Expand More/Lessで開閉・永続化
    setupLeftTocSubitems({ tocLinks, subGroups });
    
    // トグルボタン追加後に再度数字を削除（念のため）
    normalizeLabels();

    // タブクリック -> セクション切替
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-target');
        if (target) activateSection(target, { scrollToTop: true });
      });
    });

    // ヘッダータイトルリンククリック
    const headerTitleLink = document.querySelector('.header-title-link');
    if (headerTitleLink) {
      headerTitleLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const href = headerTitleLink.getAttribute('href');
        if (href) {
          activateSection(href, { closeMobile: true, scrollToTop: true });
        }
      });
    }

    // 左TOCクリック（後でsetupLeftTocSubitems内で上書きされる）
    tocLinks.forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const href = a.getAttribute('href');
        if (!href) return;
        activateSection(href, { closeMobile: true, scrollToTop: true });
      });
    });

    // 右中項目クリック（スムーススクロール）
    subLinks.forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const anchor = a.getAttribute('href');
        if (!anchor) return;
        // アンカーから最寄りの.step-sectionを特定（TOP含む全ケースで安全）
        let sectionHash = '#top';
        const anchorEl = document.querySelector(anchor);
        if (anchorEl) {
          const sectionEl = anchorEl.closest && anchorEl.closest('.step-section');
          if (sectionEl && sectionEl.id) sectionHash = `#${sectionEl.id}`;
        } else {
          const m = anchor.match(/^#(section\d+)/i);
          if (m) sectionHash = `#${m[1]}`;
        }
        activateSection(sectionHash, { scrollToTop: false });
        document.querySelectorAll('.sub-items-group a.active').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        setTimeout(() => scrollToElement(anchor), 40);
        if (window.innerWidth <= MOBILE_BREAKPOINT) closeMobileSidebar();
      });
    });

    // ハンバーガー（Material Symbolsを使った文字列切替）
    console.log('Hamburger element found:', hamburger);
    if (hamburger) {
      setupHamburger(hamburger, sidebar, overlay);
    } else {
      // フォールバック: 直接イベントリスナーを設定
      const hamburgerFallback = document.getElementById('hamburgerMenu');
      console.log('Hamburger fallback found:', hamburgerFallback);
      if (hamburgerFallback) {
        console.log('Setting up fallback hamburger click handler');
        hamburgerFallback.addEventListener('click', function(e) {
          console.log('Fallback hamburger clicked!');
          e.preventDefault();
          e.stopPropagation();
          
          const sidebar = document.getElementById('sidebarMenu');
          const overlay = document.getElementById('menuOverlay');
          const mi = hamburgerFallback.querySelector('.material-icons');
          
          const active = hamburgerFallback.classList.toggle('active');
          if (mi) mi.textContent = active ? 'close' : 'menu';
          hamburgerFallback.setAttribute('aria-expanded', String(active));
          
          if (sidebar) sidebar.classList.toggle('active', active);
          if (overlay) overlay.classList.toggle('active', active);
          
          if (window.innerWidth <= MOBILE_BREAKPOINT) {
            document.body.style.overflow = active ? 'hidden' : '';
          }
        });
      }
    }

    // overlay click
    overlay && overlay.addEventListener('click', closeMobileSidebar);

    // サイドバー閉じるボタン（無効化・常時非表示。外側クリックで閉じる方針）
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    if (sidebarCloseBtn) {
      sidebarCloseBtn.style.display = 'none';
      sidebarCloseBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
    }

    // sidebar responsive mode
    setSidebarMode();
    window.addEventListener('resize', debounce(setSidebarMode, 120));

    // resizer
    if (resizer && sidebar) setupSidebarResizer(sidebar, resizer);

    // 初期表示のセクション
    activateSection('#top', { scrollToTop: false });
    // 検索モジュール
    const searchModule = createSearchModule({
      sectionsSelector: '.content-panel .step-section',
      procedureSelector: '.procedure-item',
      searchInput,
      resultsPanel: searchResults,
      onJump: (anchorId, sectionHash) => {
        activateSection(sectionHash, { scrollToTop: false });
        setTimeout(() => searchModule.jumpTo(anchorId, sectionHash), 60);
      }
    });

    // 検索トリガ（ボタン/Enter）共通処理
    function handleSearchTrigger() {
      const q = (searchInput && searchInput.value || '').trim();
      if (!q) return;
      const needNewSearch = !searchResults || !searchResults.classList.contains('show') || q !== lastQueryValue;
      if (needNewSearch) {
        const results = searchModule.search(q);
        lastQueryValue = q;
        if (searchResults && results && results.length) {
          searchCycleIndex = 0;
          setTimeout(() => {
            const items = searchResults.querySelectorAll('.sr-item');
            if (items.length) {
              const first = items[0];
              // 入力を連打で使えるよう、最終的なフォーカスは検索入力に戻す
              const anchorId = first.getAttribute('data-anchor-id');
              const sectionHash = first.getAttribute('data-target');
              if (sectionHash) {
                activateSection(sectionHash, { scrollToTop: false });
                setTimeout(() => searchModule.jumpTo(anchorId, sectionHash), 40);
              }
            }
            // フォーカスを検索入力へ戻す（スクロール防止オプション付き）
            try { searchInput.focus({ preventScroll: true }); } catch (_) { searchInput.focus(); }
          }, 20);
        }
        return;
      }
      // 候補が表示中 → 次の候補へ移動（循環）
      if (searchResults) {
        const items = searchResults.querySelectorAll('.sr-item');
        if (!items.length) return;
        searchCycleIndex = (searchCycleIndex + 1 + items.length) % items.length;
        const target = items[searchCycleIndex];
        if (target) {
          if (typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ block: 'nearest' });
          }
          const anchorId = target.getAttribute('data-anchor-id');
          const sectionHash = target.getAttribute('data-target');
          if (sectionHash) {
            activateSection(sectionHash, { scrollToTop: false });
            setTimeout(() => searchModule.jumpTo(anchorId, sectionHash), 40);
          }
          // 次のEnterに備えて検索入力へフォーカス維持
          try { searchInput.focus({ preventScroll: true }); } catch (_) { searchInput.focus(); }
        }
      }
    }

    // 検索ボタン
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSearchTrigger();
      });
    }

    // 候補リスト上でEnterを押しても「クリック扱い」にせず、検索ボタンと同じサイクル挙動にする
    if (searchResults) {
      searchResults.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          handleSearchTrigger();
        }
      });
    }

    // 入力が変わったらサイクルインデックスをリセット
    if (searchInput) {
      searchInput.addEventListener('input', () => { searchCycleIndex = -1; });
    }
    if (searchResults) {
      searchResults.addEventListener('click', () => { searchCycleIndex = -1; });
    }

    // 検索ボックス内 クリア(✕) ボタン
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn && searchInput) {
      const updateClearVisibility = () => {
        const hasText = (searchInput.value || '').trim().length > 0;
        clearBtn.style.display = hasText ? 'flex' : 'none';
      };
      updateClearVisibility();
      searchInput.addEventListener('input', updateClearVisibility);
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 入力と結果をクリア
        try {
          searchModule.clearSearch();
        } catch (_) {
          searchInput.value = '';
          if (searchResults) {
            searchResults.classList.remove('show');
            searchResults.innerHTML = '';
          }
          searchInput.focus();
        }
        searchCycleIndex = -1;
        clearBtn.style.display = 'none';
      });
    }

    // Enter/Escape の振る舞い（検索ボックス）
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          handleSearchTrigger();
        } else if (e.key === 'Escape') {
          searchModule.clearSearch();
          searchCycleIndex = -1;
        }
      });
    }

    // クリックで結果パネル外なら閉じる + メニュー外クリックでメニューを閉じる
    document.addEventListener('click', (ev) => {
      // 検索結果パネル
      if (searchResults && searchInput) {
        const searchBtnEl = document.getElementById('searchBtn');
        if (!(searchResults.contains(ev.target) || searchInput.contains(ev.target) || (searchBtnEl && searchBtnEl.contains(ev.target)))) {
          searchResults.classList.remove('show');
        }
      }

      // メニュー外クリック
      const sidebarEl = document.getElementById('sidebarMenu');
      const hamburgerEl = document.getElementById('hamburgerMenu');
      const clickedInsideMenu = sidebarEl && sidebarEl.contains(ev.target);
      const clickedHamburger = hamburgerEl && hamburgerEl.contains(ev.target);
      if (!clickedInsideMenu && !clickedHamburger) {
        closeMobileSidebar();
        // 念のため、ここでもハンバーガー状態へ強制的に戻す
        const h = document.getElementById('hamburgerMenu');
        if (h) {
          h.classList.remove('active');
          h.setAttribute('aria-expanded', 'false');
          const mi1 = h.querySelector('.menu-icon');
          const mi2 = h.querySelector('.close-icon');
          if (mi1 && mi2) {
            mi2.style.opacity = '0';
            mi1.style.opacity = '1';
            mi2.style.display = 'none';
            mi1.style.display = 'flex';
          }
        }
      }
    });

    // タブをモバイル時に非表示かつ a11y を確保
    updateTabsForViewport();
    window.addEventListener('resize', debounce(updateTabsForViewport, 120));

    /* ---------- helper functions (inside init scope) ---------- */

    // 左TOC: サブ項目生成とトグル（localStorageに永続化）
    const TOC_OPEN_STATE_KEY = 'mb-manual-lefttoc-open';
    function loadTocOpenState() {
      try { return JSON.parse(localStorage.getItem(TOC_OPEN_STATE_KEY) || '{}'); } catch (_) { return {}; }
    }
    function saveTocOpenState(state) {
      try { localStorage.setItem(TOC_OPEN_STATE_KEY, JSON.stringify(state || {})); } catch (_) {}
    }
    function setupLeftTocSubitems({ tocLinks, subGroups }) {
      if (!tocLinks || !tocLinks.length) return;
      const state = loadTocOpenState();
      const getGroupIdByHash = (hash) => {
        if (!hash) return null;
        if (hash === '#top') return 'sub-items-top';
        const m = String(hash).match(/^#section(\d+)/i);
        return m ? `sub-items-section${m[1]}` : null;
      };

      tocLinks.forEach(link => {
        const hash = link.getAttribute('href');
        const groupId = getGroupIdByHash(hash);
        if (!groupId) return;
        const rightGroup = document.getElementById(groupId);
        // サブ項目がない章はスキップ
        if (!rightGroup) return;
        const items = Array.from(rightGroup.querySelectorAll('a'));
        // リンクがない場合はトグル不要なのでスキップ
        if (!items.length) return;

        // リンク内にトグルアイコンを追加（テキストの右側）
        const h3 = link.closest('h3');
        if (!h3) return;
        const section = h3.parentElement;
        if (!section || !section.classList.contains('toc-section')) return;
        
        // リンク内にトグルアイコンがなければ追加
        let toggleIcon = link.querySelector('.toc-toggle-icon');
        if (!toggleIcon && items.length > 0) {
          toggleIcon = document.createElement('span');
          toggleIcon.className = 'toc-toggle-icon material-icons';
          toggleIcon.textContent = 'expand_more';
          link.appendChild(toggleIcon);
        }

        // 左TOCにサブリストを生成
        let sublist = section.querySelector('.toc-sublist');
        if (!sublist) {
          sublist = document.createElement('ul');
          sublist.className = 'toc-sublist';
          section.appendChild(sublist);
        }
        if (!sublist.hasChildNodes()) {
          items.forEach(a => {
            const li = document.createElement('li');
            const na = document.createElement('a');
            na.href = a.getAttribute('href');
            na.textContent = a.textContent || '';
            na.addEventListener('click', (e) => {
              e.preventDefault();
              const anchor = na.getAttribute('href');
              if (!anchor) return;
              // 対象セクションを特定して切替（右カラムと同様の挙動）
              let sectionHash = '#top';
              const anchorEl = document.querySelector(anchor);
              if (anchorEl) {
                const sectionEl = anchorEl.closest && anchorEl.closest('.step-section');
                if (sectionEl && sectionEl.id) sectionHash = `#${sectionEl.id}`;
              } else {
                const m2 = anchor.match(/^#(section\d+)/i);
                if (m2) sectionHash = `#${m2[1]}`;
              }
              activateSection(sectionHash, { scrollToTop: false });
              // サブリスト内のアクティブ状態を更新
              document.querySelectorAll('.toc-sublist a').forEach(x => x.classList.remove('active'));
              na.classList.add('active');
              
              // 大項目のアクティブクラスを削除して、has-active-childクラスを追加
              document.querySelectorAll('.toc .toc-link').forEach(link => {
                link.classList.remove('has-active-child');
              });
              const parentLink = section.querySelector('.toc-link');
              if (parentLink) {
                parentLink.classList.remove('active');
                parentLink.classList.add('has-active-child');
              }
              
              setTimeout(() => scrollToElement(anchor), 40);
              if (window.innerWidth <= MOBILE_BREAKPOINT) closeMobileSidebar();
            });
            li.appendChild(na);
            sublist.appendChild(li);
          });
        }

        // 初期状態の反映
        const key = groupId;
        const isOpen = Boolean(state[key]);
        // toggleIconは既に上で宣言済み
        applyTocOpenState({ sublist, toggleIcon, open: isOpen });

        // リンククリック時の処理を上書き（トグルも同時に行う）
        // 既存のイベントリスナーをすべて削除
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        const newToggleIcon = newLink.querySelector('.toc-toggle-icon');
        
        newLink.addEventListener('click', (e) => {
          e.preventDefault();
          // セクション切り替え
          const href = newLink.getAttribute('href');
          if (href) {
            activateSection(href, { closeMobile: true, scrollToTop: true });
          }
          // トグル処理（サブ項目がある場合のみ）
          if (items.length > 0) {
            const nowOpen = !sublist.classList.contains('show');
            applyTocOpenState({ sublist, toggleIcon: newToggleIcon, open: nowOpen });
            state[key] = nowOpen;
            saveTocOpenState(state);
          }
        });
      });
    }
    function applyTocOpenState({ sublist, toggleIcon, open }) {
      if (!sublist) return;
      sublist.classList.toggle('show', !!open);
      if (toggleIcon) {
        toggleIcon.textContent = open ? 'expand_less' : 'expand_more';
      }
    }

    function removeExternalClearButtons() {
      const ids = ['manualSearchClear', 'manualSearchClearOuter'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      Array.from(document.querySelectorAll('.external-clear, .search-clear-outer, .manual-search .external-clear')).forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    }

    function setupHamburger(hamburgerEl, sidebarEl, overlayEl) {
      console.log('setupHamburger called with:', hamburgerEl, sidebarEl, overlayEl);
      if (!hamburgerEl) {
        console.log('No hamburger element provided');
        return;
      }
      
      // ensure icon child
      let mi = hamburgerEl.querySelector('.mi, .material-icons');
      if (!mi) {
        console.log('Creating icon element');
        mi = document.createElement('i');
        mi.className = 'material-icons mi';
        mi.setAttribute('aria-hidden', 'true');
        mi.textContent = 'menu';
        hamburgerEl.appendChild(mi);
      } else {
        console.log('Icon element found:', mi);
      }
      // initialize aria-expanded according to classes
      const isActive = hamburgerEl.classList.contains('active');
      hamburgerEl.setAttribute('aria-expanded', String(isActive));
      mi.textContent = isActive ? 'close' : 'menu';

      hamburgerEl.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        
        // 現在の状態を取得
        const isCurrentlyActive = hamburgerEl.classList.contains('active');
        const newActiveState = !isCurrentlyActive;
        
        // ハンバーガーボタンの状態を更新
        if (newActiveState) {
          hamburgerEl.classList.add('active');
        } else {
          hamburgerEl.classList.remove('active');
        }
        
        mi.textContent = newActiveState ? 'close' : 'menu';
        hamburgerEl.setAttribute('aria-expanded', String(newActiveState));
        
        if (sidebarEl) {
          if (newActiveState) {
            sidebarEl.classList.add('active');
          } else {
            sidebarEl.classList.remove('active');
          }
        }
        if (overlayEl) {
          if (newActiveState) {
            overlayEl.classList.add('active');
          } else {
            overlayEl.classList.remove('active');
          }
        }
        // prevent background scroll when open (only for mobile)
        document.body.style.overflow = newActiveState ? 'hidden' : '';
      });

      // on resize ensure hamburger isn't left in active state when switching to desktop
      window.addEventListener('resize', debounce(() => {
        if (window.innerWidth > MOBILE_BREAKPOINT) {
          // make sure overlay/sidebar/hamburger are reset
          hamburgerEl.classList.remove('active');
          hamburgerEl.setAttribute('aria-expanded', 'false');
          mi.textContent = 'menu';
          if (sidebarEl) sidebarEl.classList.remove('active');
          if (overlayEl) overlayEl.classList.remove('active');
          document.body.style.overflow = '';
        }
      }, 120));
    }

    function closeMobileSidebar() {
      const hamburgerEl = document.getElementById('hamburgerMenu');
      const overlayEl = document.getElementById('menuOverlay');
      const sidebarEl = document.getElementById('sidebarMenu');
      
      if (hamburgerEl) {
        hamburgerEl.classList.remove('active');
        hamburgerEl.setAttribute('aria-expanded', 'false');
        const mi = hamburgerEl.querySelector('.material-icons');
        if (mi) mi.textContent = 'menu';
      }
      if (overlayEl) overlayEl.classList.remove('active');
      if (sidebarEl) sidebarEl.classList.remove('active');
      document.body.style.overflow = '';
    }

    function setSidebarMode() {
      if (!sidebar) return;
      if (window.innerWidth <= MOBILE_BREAKPOINT) sidebar.classList.add('mobile');
      else { sidebar.classList.remove('mobile'); closeMobileSidebar(); }
    }

    function getSectionNum(hash) { return (hash || '').replace('#section', ''); }

    function activateSection(targetHash, opts = {}) {
      if (!targetHash) return;
      tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-target') === targetHash));
      sections.forEach(sec => sec.classList.toggle('is-hidden', `#${sec.id}` !== targetHash));
      document.querySelectorAll('.toc .toc-link').forEach(a => {
        a.classList.remove('active');
        a.classList.remove('has-active-child');
      });
      const left = document.querySelector(`.toc .toc-link[href="${targetHash}"]`);
      left && left.classList.add('active');
      
      // 左TOCのサブリスト内のアクティブ状態もクリア
      document.querySelectorAll('.toc-sublist a.active').forEach(a => a.classList.remove('active'));

      // #topの場合は特別な処理
      if (targetHash === '#top') {
        subGroups.forEach(g => g.classList.remove('active'));
        const topGroup = document.getElementById('sub-items-top');
        if (topGroup) {
          topGroup.classList.add('active');
          const first = topGroup.querySelector('a');
          document.querySelectorAll('.sub-items-group a.active').forEach(a => a.classList.remove('active'));
          first && first.classList.add('active');
        }
      } else {
        const num = getSectionNum(targetHash);
        subGroups.forEach(g => g.classList.remove('active'));
        const group = document.getElementById(`sub-items-section${num}`);
        if (group) {
          group.classList.add('active');
          const first = group.querySelector('a');
          document.querySelectorAll('.sub-items-group a.active').forEach(a => a.classList.remove('active'));
          first && first.classList.add('active');
        }
      }

      if (opts.scrollToTop !== false) {
        const contentPanel = document.querySelector('.content-panel');
        if (contentPanel) {
          const y = Math.max(0, contentPanel.getBoundingClientRect().top + window.scrollY - 8);
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
      if (opts.closeMobile && window.innerWidth <= MOBILE_BREAKPOINT) closeMobileSidebar();
    }

    function scrollToElement(hash) {
      if (!hash) return;
      const el = document.querySelector(hash);
      if (!el) return;
      const offset = getScrollOffset();
      const container = document.querySelector('.manual-content');
      if (container && typeof container.scrollTo === 'function') {
        const cRect = container.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        const target = container.scrollTop + (eRect.top - cRect.top) - offset;
        container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      } else {
        const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }

    function updateTabsForViewport() {
      const tabsEl = document.querySelector('.content-tabs');
      if (!tabsEl) return;
      const buttons = Array.from(tabsEl.querySelectorAll('.tab'));
      if (window.innerWidth <= MOBILE_BREAKPOINT) {
        tabsEl.style.display = 'none';
        tabsEl.setAttribute('aria-hidden', 'true');
        buttons.forEach(btn => {
          if (btn.hasAttribute('tabindex')) btn.dataset._prevTabindex = btn.getAttribute('tabindex');
          btn.setAttribute('tabindex', '-1');
          btn.disabled = true;
          btn.setAttribute('aria-hidden', 'true');
        });
      } else {
        tabsEl.style.display = '';
        tabsEl.removeAttribute('aria-hidden');
        buttons.forEach(btn => {
          if (btn.dataset._prevTabindex) {
            btn.setAttribute('tabindex', btn.dataset._prevTabindex);
            delete btn.dataset._prevTabindex;
          } else btn.removeAttribute('tabindex');
          btn.disabled = false;
          btn.removeAttribute('aria-hidden');
        });
      }
    }
  } // end init

  /* ---------------- sidebar resizer ---------------- */
  function setupSidebarResizer(sidebar, resizer) {
    const MIN = 240, MAX = 520;
    let dragging = false, startX = 0, startW = sidebar.getBoundingClientRect().width;
    try {
      const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY) || 0);
      if (saved && saved >= MIN && saved <= MAX) {
        sidebar.style.flexBasis = saved + 'px';
        sidebar.style.maxWidth = saved + 'px';
      }
    } catch (e) {}
    resizer.addEventListener('mousedown', (e) => {
      if (window.innerWidth <= MOBILE_BREAKPOINT) return;
      dragging = true; startX = e.clientX; startW = sidebar.getBoundingClientRect().width;
      document.body.style.userSelect = 'none'; document.body.style.cursor = 'col-resize';
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const w = Math.min(MAX, Math.max(MIN, Math.round(startW + (e.clientX - startX))));
      sidebar.style.flexBasis = w + 'px'; sidebar.style.maxWidth = w + 'px';
    });
    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false; document.body.style.userSelect = ''; document.body.style.cursor = '';
      try { const w = Math.round(sidebar.getBoundingClientRect().width); localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w)); } catch (e) {}
    });

    // touch support
    resizer.addEventListener('touchstart', (e) => {
      const t = e.touches[0]; dragging = true; startX = t.clientX; startW = sidebar.getBoundingClientRect().width;
      document.body.style.userSelect = 'none';
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const t = e.touches[0];
      const w = Math.min(MAX, Math.max(MIN, Math.round(startW + (t.clientX - startX))));
      sidebar.style.flexBasis = w + 'px'; sidebar.style.maxWidth = w + 'px';
    }, { passive: true });
    window.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false; document.body.style.userSelect = '';
      try { const w = Math.round(sidebar.getBoundingClientRect().width); localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w)); } catch (e) {}
    });
  }

  /* ---------------- normalize labels ---------------- */
  function normalizeLabels() {
    const strip = s => (s || '').replace(/^\s*\d+[\.\)\s-]*\s*/, '').trim();
    // 左TOCのテキスト部分のみ数字を削除
    const tocSpans = document.querySelectorAll('.toc .toc-link span');
    tocSpans.forEach(el => {
      const text = el.textContent || '';
      const stripped = strip(text);
      if (text !== stripped) {
        el.textContent = stripped;
      }
    });
    // タブも数字を削除（モバイルでは非表示だが念のため）
    document.querySelectorAll('.content-tabs .tab').forEach(el => el.textContent = strip(el.textContent));
    // 右カラム（現在非表示）のテキストも数字削除
    document.querySelectorAll('.sub-items-group h4, .sub-items-group a').forEach(el => el.textContent = strip(el.textContent));
    // 手順項目の数字削除（section1以外）
    document.querySelectorAll('.content-panel .procedure-item h4').forEach(el => {
      // section1のh4は数字を残す
      if (el.id && el.id.startsWith('section1-item')) {
        return; // スキップ
      }
      el.textContent = strip(el.textContent);
    });
  }

  /* ---------------- placeholders for images ---------------- */
  function insertPlaceholders() {
    const layouts = document.querySelectorAll('.content-panel .procedure-layout');
    layouts.forEach(layout => {
      if (!layout.querySelector('.procedure-image')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'procedure-image';
        const a = document.createElement('a');
        a.href = 'https://lp.melbridge.mitsubishielectric.co.jp/manual';
        a.target = '_blank'; a.rel = 'noopener';
        const img = document.createElement('img');
        img.src = IMG_SRC; img.alt = '手順イメージ'; img.loading = 'lazy';
        a.appendChild(img); wrapper.appendChild(a);
        const text = layout.querySelector('.procedure-text');
        if (text) layout.insertBefore(wrapper, text); else layout.prepend(wrapper);
      }
    });
  }

  /* ---------------- Search module factory ---------------- */
  function createSearchModule({ sectionsSelector = '.content-panel .step-section', procedureSelector = '.procedure-item', searchInput, resultsPanel, onJump }) {
    const sections = Array.from(document.querySelectorAll(sectionsSelector));
    const index = buildIndex(sections, procedureSelector);

    if (!searchInput || !resultsPanel) {
      return { search: (q) => internalSearchAndRender(q), jumpTo: internalJumpTo, clearSearch: clearAll };
    }

    const doSearchDebounced = debounce(() => {
      const q = searchInput.value || '';
      if (!q.trim()) {
        resultsPanel.classList.remove('show');
        resultsPanel.innerHTML = '';
        const contentRoot = document.querySelector('.content-panel') || document;
        clearContentHighlights(contentRoot);
        return;
      }
      internalSearchAndRender(q);
    }, 160);

    searchInput.addEventListener('input', doSearchDebounced);

    resultsPanel.addEventListener('click', (ev) => {
      const a = ev.target.closest('.sr-item');
      if (!a) return;
      ev.preventDefault();
      const anchorId = a.getAttribute('data-anchor-id');
      const targetHash = a.getAttribute('data-target');
      // クリック時のみパネルを閉じる（Enter連打時は閉じないよう分岐）
      if (ev.pointerType || ev.detail > 0) {
        resultsPanel.classList.remove('show');
      }
      if (typeof onJump === 'function') onJump(anchorId, targetHash);
      else internalJumpTo(anchorId, targetHash);
    });

    function clearAll() {
      searchInput.value = '';
      resultsPanel.classList.remove('show');
      resultsPanel.innerHTML = '';
      const contentRoot = document.querySelector('.content-panel') || document;
      clearContentHighlights(contentRoot);
      searchInput.focus();
    }

    function internalSearchAndRender(q) {
      const items = internalSearch(q);
      renderResults(items, q);
      return items;
    }

    function internalSearch(q) {
      const terms = tokenize(q);
      if (!terms.length) return [];
      const results = [];
      for (const row of index) {
        const s = scoreText(row.text, terms);
        if (s > 0) results.push({ row, score: s });
      }
      results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.row.type === b.row.type) return 0;
        return a.row.type === 'section' ? -1 : 1;
      });
      return results.slice(0, 50).map(r => ({ row: r.row, snippet: makeSnippet(r.row.text, tokenize(q)) }));
    }

    function renderResults(list, q) {
      if (!q || !list) {
        resultsPanel.classList.remove('show');
        resultsPanel.innerHTML = '';
        return;
      }
      if (list.length === 0) {
        const escQ = escapeHtml(q);
        resultsPanel.innerHTML = `
          <div class="sr-empty">
            <div class="sr-empty-title">該当する結果はありません</div>
            <div class="sr-empty-sub">「${escQ}」に一致する項目は見つかりませんでした。検索語を短くする・言い回しを変えるなどをお試しください。</div>
          </div>
        `;
        resultsPanel.classList.add('show');
        return;
      }
      const terms = tokenize(q);
      const esc = s => escapeHtml(s || '');
      const hl = s => {
        let out = esc(s || '');
        terms.forEach(t => {
          const re = new RegExp(`(${escapeRegExp(t)})`, 'ig');
          out = out.replace(re, '<mark class="search-hit">$1</mark>');
        });
        return out;
      };
      const html = [
        `<div class="sr-head">${list.length} 件ヒット</div>`,
        ...list.map(({ row, snippet }) => {
          const secTitle = esc(row.sectionTitle || '');
          const title = hl(row.title);
          return `
            <a href="#${row.sectionId}" class="sr-item" data-target="#${row.sectionId}" data-anchor-id="${row.anchorId}" tabindex="0">
              <div class="sr-breadcrumb">${secTitle}</div>
              <div class="sr-title">${title}</div>
              <div class="sr-snippet">${snippet}</div>
            </a>
          `;
        })
      ].join('');
      resultsPanel.innerHTML = html;
      resultsPanel.classList.add('show');
    }

    function internalJumpTo(anchorId, sectionHash) {
      const sectionEl = document.querySelector(sectionHash);
      if (sectionEl) {
        const terms = tokenize(searchInput.value || '');
        const contentRoot = document.querySelector('.content-panel') || document;
        clearContentHighlights(contentRoot);
        if (terms.length) highlightSectionTerms(sectionEl, terms);
      }
      setTimeout(() => {
        let el = document.getElementById(anchorId) || document.querySelector(sectionHash);
        if (!el) return;
        // 可能な限り h4 見出し自体にスクロール（procedure-itemにIDが付いているケースに対応）
        if (el && el.tagName !== 'H4') {
          const directH4 = el.querySelector && el.querySelector('h4');
          const fromClosest = el.closest && el.closest('.procedure-item');
          const h4 = directH4 || (fromClosest ? fromClosest.querySelector('h4') : null);
          if (h4) el = h4;
        }
        const offset = getScrollOffset();
        const container = document.querySelector('.manual-content');
        if (container && typeof container.scrollTo === 'function') {
          const cRect = container.getBoundingClientRect();
          const eRect = el.getBoundingClientRect();
          const target = container.scrollTop + (eRect.top - cRect.top) - offset;
          container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
        } else {
          const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 30);
    }

    return { search: internalSearchAndRender, jumpTo: internalJumpTo, clearSearch: clearAll };

    /* ---------- helpers for index/search ---------- */
    function buildIndex(sectionEls, procSelector) {
      const idx = [];
      sectionEls.forEach(section => {
        const secId = section.id;
        const secTitle = (section.querySelector('.step-header h2')?.textContent || '').trim();
        idx.push({
          id: secId, el: section, anchorId: secId, anchorEl: section,
          title: secTitle, sectionId: secId, sectionTitle: secTitle,
          type: 'section', text: (section.textContent || '').replace(/\s+/g, ' ').trim()
        });
        const items = Array.from(section.querySelectorAll(procSelector));
        items.forEach((item, i) => {
          const h4 = item.querySelector('h4');
          let anchorEl = h4 || item;
          let anchorId = (h4 && h4.id) ? h4.id : (item.id || '');
          if (!anchorId) {
            anchorId = `${secId}-proc-${i + 1}`;
            anchorEl.id = anchorId;
          }
          const title = (h4?.textContent || ('手順 ' + (i + 1))).trim();
          idx.push({
            id: `${secId}__proc__${i}`, el: item, anchorEl, anchorId,
            sectionId: secId, sectionTitle: secTitle, title,
            type: 'procedure', text: (item.textContent || '').replace(/\s+/g, ' ').trim()
          });
        });
      });
      return idx;
    }
    function tokenize(q) { return (q || '').toLowerCase().trim().split(/\s+/).filter(Boolean); }
    function scoreText(text, terms) {
      if (!terms.length) return 0;
      const hay = (text || '').toLowerCase();
      let score = 0;
      for (const t of terms) {
        const m = hay.match(new RegExp(escapeRegExp(t), 'g'));
        if (m) score += m.length;
      }
      return score;
    }
    function makeSnippet(text, terms, radius = 60) {
      const low = (text || '').toLowerCase();
      let pos = -1;
      for (const t of terms) {
        const p = low.indexOf(t);
        if (p !== -1 && (pos === -1 || p < pos)) pos = p;
      }
      if (pos === -1) return (text || '').slice(0, 120) + ((text || '').length > 120 ? '…' : '');
      const start = Math.max(0, pos - radius);
      const end = Math.min((text || '').length, pos + radius);
      let snip = (start > 0 ? '…' : '') + (text || '').slice(start, end) + (end < (text || '').length ? '…' : '');
      terms.forEach(t => {
        const re = new RegExp(`(${escapeRegExp(t)})`, 'ig');
        snip = snip.replace(re, '<mark class="search-hit">$1</mark>');
      });
      return snip;
    }
  } // createSearchModule end

  /* ---------------- highlight helpers ---------------- */
  function clearContentHighlights(root = document) {
    const marks = root.querySelectorAll('mark.search-hit, mark.search-hit-live');
    marks.forEach(m => {
      const parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize && parent.normalize();
    });
  }
  function highlightSectionTerms(sectionEl, terms) {
    if (!sectionEl || !terms || !terms.length) return;
    const targets = sectionEl.querySelectorAll(`
      .step-header h2,
      .step-content h3,
      .procedure-item h4,
      .procedure-text,
      p, li
    `);
    const regexes = terms.map(t => new RegExp(`(${escapeRegExp(t)})`, 'ig'));
    targets.forEach(el => {
      clearContentHighlights(el);
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const bad = node.parentElement && node.parentElement.closest && node.parentElement.closest('code, pre, style, script');
          return bad ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        let text = node.nodeValue;
        let changed = false;
        regexes.forEach(re => { if (re.test(text)) changed = true; });
        if (!changed) return;
        let html = escapeHtml(text);
        regexes.forEach(re => { html = html.replace(re, '<mark class="search-hit-live">$1</mark>'); });
        const span = document.createElement('span');
        span.innerHTML = html;
        node.parentNode.replaceChild(span, node);
      });
    });
  }


})(); // EOF
