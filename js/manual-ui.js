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

  function updateUrlHash(hash, { replace = false } = {}) {
    if (!hash) return;
    const value = hash.startsWith('#') ? hash : `#${hash}`;
    try {
      if (window.location.hash === value && !replace) return;
      if (typeof history !== 'undefined' && history.pushState) {
        if (replace || window.location.hash === value) {
          history.replaceState(null, '', value);
        } else {
          history.pushState(null, '', value);
        }
      } else {
        window.location.hash = value;
      }
    } catch (_) {
      try {
        window.location.hash = value;
      } catch (__) {}
    }
  }

  // シンプルで確実なスクロール処理
  function scrollToWhenStable(hash, retryCount = 0) {
    if (!hash) return;
    const maxRetries = 10;
    
    const tryScroll = () => {
      const el = document.querySelector(hash);
      if (!el) {
        console.warn('scrollToWhenStable: 要素が見つかりません', hash);
        return;
      }
      
      // 要素が表示されているか確認
      const isHidden = el.closest('.is-hidden');
      if (isHidden) {
        console.warn('scrollToWhenStable: 要素がis-hidden内 (retry:', retryCount, ')', hash);
        // 再試行
        if (retryCount < maxRetries) {
          setTimeout(() => scrollToWhenStable(hash, retryCount + 1), 30);
        } else {
          console.error('scrollToWhenStable: 最大再試行回数到達', hash);
        }
        return;
      }
      
      // 要素の高さが0でないことを確認（レイアウト確定）
      const rect = el.getBoundingClientRect();
      if (rect.height === 0 && retryCount < maxRetries) {
        console.warn('scrollToWhenStable: 要素の高さが0 (retry:', retryCount, ')', hash);
        setTimeout(() => scrollToWhenStable(hash, retryCount + 1), 30);
        return;
      }
      
      console.log('scrollToWhenStable: scrollToElementNoAnim呼び出し直前', hash, 'retry:', retryCount);
      scrollToElementNoAnim(hash);
      console.log('scrollToWhenStable: scrollToElementNoAnim呼び出し完了', hash);
    };
    
    // 最初の試行は少し待ってから
    if (retryCount === 0) {
      setTimeout(tryScroll, 50);
    } else {
      tryScroll();
    }
  }

  function replaceUrlWithoutQuery(hash) {
    const value = hash && hash.startsWith('#') ? hash : `#${hash || ''}`;
    try {
      const base = window.location.href.split('#')[0].split('?')[0];
      if (typeof history !== 'undefined' && history.replaceState) {
        history.replaceState(null, '', `${base}${value}`);
      } else {
        window.location.hash = value;
      }
    } catch (_) {
      try {
        window.location.hash = value;
      } catch (__) {}
    }
  }

  // カスタムスクロールアニメーション（約300msで滑らか）
  const DEFAULT_SCROLL_DURATION = 315;
  const scrollAnimationMap = new WeakMap();
  let windowScrollAnimation = null;
  const tocLastActiveSub = new Map();

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function getWindowScrollY() {
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  function cancelScrollAnimation(target) {
    if (!target) return;
    if (target === window) {
      if (windowScrollAnimation && windowScrollAnimation.id) {
        cancelAnimationFrame(windowScrollAnimation.id);
      }
      windowScrollAnimation = null;
    } else {
      const state = scrollAnimationMap.get(target);
      if (state && state.id) {
        cancelAnimationFrame(state.id);
      }
      scrollAnimationMap.delete(target);
    }
  }

  function storeScrollAnimation(target, state) {
    if (!target || !state) return;
    if (target === window) {
      windowScrollAnimation = state;
    } else {
      scrollAnimationMap.set(target, state);
    }
  }

  function fastSmoothScrollTo({ target = 0, container = null, duration = DEFAULT_SCROLL_DURATION } = {}) {
    const el = (!container || container === document || container === document.body || container === document.documentElement) ? window : container;
    const isWindow = el === window;
    const start = isWindow ? getWindowScrollY() : el.scrollTop;
    const maxScroll = isWindow
      ? Math.max(0, Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight)
      : Math.max(0, el.scrollHeight - el.clientHeight);
    const clampedTarget = Math.max(0, Math.min(target, maxScroll));
    const distance = clampedTarget - start;

    cancelScrollAnimation(el);

    if (Math.abs(distance) < 1 || duration <= 0 || prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      if (isWindow) {
        window.scrollTo(0, clampedTarget);
      } else {
        el.scrollTop = clampedTarget;
      }
      return;
    }

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const state = { start, target: clampedTarget, startTime: performance.now(), duration };

    function step(now) {
      const elapsed = now - state.startTime;
      const progress = Math.min(1, elapsed / state.duration);
      const eased = easeOutCubic(progress);
      const next = state.start + distance * eased;
      if (isWindow) {
        window.scrollTo(0, next);
      } else {
        el.scrollTop = next;
      }
      if (progress < 1) {
        state.id = requestAnimationFrame(step);
      } else {
        cancelScrollAnimation(el);
      }
    }

    state.id = requestAnimationFrame(step);
    storeScrollAnimation(el, state);
  }

  /* ---------------- A-1, B-2, C-3の文字装飾 ---------------- */
  function decorateStepNumbers() {
    const stepTexts = document.querySelectorAll('.step-text p');
    
    stepTexts.forEach(p => {
      const text = p.textContent;
      // A-1, B-2, C-3などのパターンを検出
      const match = text.match(/^([A-C]-([0-9]+)\.\s*)/);
      
      if (match) {
        const fullMatch = match[1]; // A-1. など
        const numberOnly = match[2]; // 1 など（数字のみ）
        const remainingText = text.replace(fullMatch, '').trim();
        
        // 親のstep-textを取得
        const stepTextContainer = p.parentElement;
        
        // 既存のolがあるかチェック（新しく作成したもの以外）
        let ol = stepTextContainer.querySelector('ol:not(.existing-ol)');
        if (!ol) {
          // 既存のolがあれば削除
          const existingOl = stepTextContainer.querySelector('ol');
          if (existingOl) {
            existingOl.remove();
          }
          
          // 新しいolを作成
          ol = document.createElement('ol');
          ol.className = 'step-number-list';
          stepTextContainer.appendChild(ol);
        }
        
        // li要素を作成
        const li = document.createElement('li');
        li.innerHTML = `<span class="step-number-label">${numberOnly}.</span> ${remainingText}`;
        ol.appendChild(li);
        
        // 元のp要素を削除
        p.remove();
      }
    });
  }

  /* ---------------- ボタンラベル変換処理 ---------------- */
  function convertButtonLabels() {
    // step-text, note-card, step-advice内のテキストを処理
    const selectors = '.step-text li, .note-card li, .step-advice li, .step-text p, .note-card p, .step-advice p';
    const elements = document.querySelectorAll(selectors);
    
    elements.forEach(element => {
      // HTMLを取得
      let html = element.innerHTML;
      // [ボタン名]のパターンを検出して置換
      if (html.includes('[') && html.includes(']')) {
        html = html.replace(/\[([^\]]+)\]/g, '<span class="button-label">$1</span>');
        element.innerHTML = html;
      }
    });
  }

  /* ---------------- boot ---------------- */
  document.addEventListener('DOMContentLoaded', function() {
    // 少し遅延を追加して要素が確実に存在することを保証
    setTimeout(init, 100);
  });

  // 削除: window.onloadのフォールバックは不要（setupHamburgerで統一処理）

  /* ---------------- セクショントップに戻るボタン ---------------- */
  function setupBackToTop() {
    const button = document.getElementById('back-to-top');
    if (!button) return;

    function getScrollContainer(){
      const c = document.querySelector('.manual-content');
      if (c && c.scrollHeight > c.clientHeight) return c;
      return null;
    }
    function toggleStaticVisibility(){
      const container = document.querySelector('.manual-content');
      if (!container) {
        button.classList.add('is-static-hidden');
        return;
      }
      const hasScroll = container.scrollHeight > container.clientHeight + 4;
      button.classList.toggle('is-static-hidden', !hasScroll);
    }
    function getOffsetTopWithin(container, el){
      let y = 0; let node = el;
      while (node && node !== container){
        y += node.offsetTop || 0;
        node = node.offsetParent;
      }
      return y - (container.offsetTop || 0);
    }

    // クリック時に現在表示中のセクションのh2に戻る
    button.addEventListener('click', function(e) {
      e.preventDefault();

      // 現在表示中のセクションを探す
      const visibleSection = document.querySelector('.step-section:not(.is-hidden)');

      const container = getScrollContainer();

      if (visibleSection) {
        const h2 = visibleSection.querySelector('h2');
        if (h2) {
          if (container) {
            const targetY = Math.max(0, getOffsetTopWithin(container, h2) - 80);
            container.scrollTo({ top: targetY, behavior: 'smooth' });
          } else {
            const targetY = Math.max(0, h2.getBoundingClientRect().top + getWindowScrollY() - 80);
            fastSmoothScrollTo({ target: targetY });
          }
        } else {
          if (container) {
            const targetY = Math.max(0, getOffsetTopWithin(container, visibleSection));
            container.scrollTo({ top: targetY, behavior: 'smooth' });
          } else {
            const y = Math.max(0, visibleSection.getBoundingClientRect().top + getWindowScrollY());
            fastSmoothScrollTo({ target: y });
          }
        }
      } else {
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          fastSmoothScrollTo({ target: 0 });
        }
      }
    });

    function toggleVisibility() {
      const container = getScrollContainer();
      if (!container) {
        button.classList.remove('show');
        return;
      }
      const threshold = 200;
      const show = container.scrollTop > threshold;
      button.classList.toggle('show', show);
    }

    toggleStaticVisibility();
    toggleVisibility();

    const container = document.querySelector('.manual-content');
    if (container){
      container.addEventListener('scroll', toggleVisibility, { passive: true });
    }
    window.addEventListener('resize', () => {
      toggleStaticVisibility();
      toggleVisibility();
    });

    const observer = new MutationObserver(() => {
      toggleStaticVisibility();
      toggleVisibility();
    });
    observer.observe(document.querySelector('.content-panel') || document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    // 二重初期化ガード（重複読み込み/多重バインド防止）
    const INIT_FLAG = 'data-mb-manual-ui-init';
    const root = document.documentElement;
    if (root.getAttribute(INIT_FLAG) === '1') { 
      return; 
    }
    root.setAttribute(INIT_FLAG, '1');
    
  // ボタンラベルの変換を実行
  convertButtonLabels();
  
  // A-1, B-2, C-3などの文字装飾を実行
  decorateStepNumbers();
    
    const sidebar = document.getElementById('sidebarMenu');
    const resizer = document.getElementById('sidebarResizer');
    const hamburger = document.getElementById('hamburgerMenu');
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

    // 左TOCの一時的な強制状態（サブ項目クリック直後のチラつき抑止）
    const forcedTocState = { sectionHash: null, subHash: null, timer: null };
    let setScrollSyncManual = () => {};
    let triggerScrollSyncUpdate = () => {};

    // remove duplicate/外部クリア要素（安全に）
    removeExternalClearButtons();

    // ノーマライズ & placeholder & ダミーコンテンツ
    normalizeLabels();
    insertPlaceholders();
    addDummyContent();
    markEmptyInfoCards();
    setupSectionScopedSearch({
      sectionSelector: '#terminology',
      inputId: 'terminologySearch',
      clearButtonId: 'terminologySearchClear',
      searchButtonId: 'terminologySearchBtn',
      resultsContainerId: 'terminologySearchResults'
    });
    setupSectionScopedSearch({
      sectionSelector: '#faq',
      inputId: 'faqSearch',
      clearButtonId: 'faqSearchClear',
      searchButtonId: 'faqSearchBtn',
      resultsContainerId: 'faqSearchResults'
    });
    setupSectionScopedSearch({
      sectionSelector: '#product-specs',
      inputId: 'productSpecsSearch',
      clearButtonId: 'productSpecsSearchClear',
      searchButtonId: 'productSpecsSearchBtn',
      resultsContainerId: 'productSpecsSearchResults'
    });

    // 初期化時に✕ボタンを非表示
    const closeBtn = document.getElementById('sidebarCloseBtn');
    if (closeBtn) {
      closeBtn.style.display = 'none';
    }

    // 左TOCにサブ項目（右カラムの内容）を生成し、Expand More/Lessで開閉・永続化
    setupLeftTocSubitems({ tocLinks, subGroups });

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
          activateSection(href, { closeMobile: true, scrollToTop: false });
          // TOPセクションのh2にスクロール
          scrollToWhenStable('#top');
        }
      });
    }

    // 左TOCクリック - 基本のイベントリスナーは削除（setupLeftTocSubitems内で設定）
    // tocLinks.forEach(a => {
    //   a.addEventListener('click', (e) => {
    //     e.preventDefault();
    //     const href = a.getAttribute('href');
    //     if (!href) return;
    //     activateSection(href, { closeMobile: true, scrollToTop: true });
    //   });
    // });

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
        if (forcedTocState.timer) {
          console.log('右カラムサブリンク: 既存のforcedTocState.timerをクリア');
          clearTimeout(forcedTocState.timer);
        }
        forcedTocState.sectionHash = sectionHash;
        forcedTocState.subHash = anchor;
        setScrollSyncManual(true);
        console.log('右カラムサブリンク: forcedTocStateをセット', {sectionHash, anchor});
        forcedTocState.timer = setTimeout(() => {
          console.log('右カラムサブリンク: forcedTocStateタイマー終了');
          forcedTocState.sectionHash = null;
          forcedTocState.subHash = null;
          setScrollSyncManual(false);
          triggerScrollSyncUpdate();
        }, 2000);  // 1500ms → 2000msに延長

        applySubLinkActiveState(sectionHash, anchor);
        activateSection(sectionHash, {
          scrollToTop: false,
          parentHasActiveChild: true,
          activeSubHash: anchor
        });
        // レイアウト確定を待ってからスクロール（1回で決まらない問題の対策）
        scrollToWhenStable(anchor);
        if (window.innerWidth <= MOBILE_BREAKPOINT) closeMobileSidebar();
      });
    });

    // ハンバーガー（Material Symbolsを使った文字列切替）
    if (hamburger) {
      // Material Iconsフォントが読み込まれるまで少し待つ
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          setupHamburger(hamburger, sidebar, overlay);
        }).catch(() => {
          // フォントのロードに失敗した場合でも初期化
          setupHamburger(hamburger, sidebar, overlay);
        });
      } else {
        // fonts APIが利用できない古いブラウザの場合
        setTimeout(() => {
          setupHamburger(hamburger, sidebar, overlay);
        }, 100);
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

    // 内部リンクの処理
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[href="#"], a[href^="#"]');
      if (!link) return;
      
      // 左TOC（大項目/サブ項目）は個別ハンドラで処理するため除外
      if (link.closest('.toc-sublist') || link.closest('.toc-section')) {
        return;
      }
      
      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const isQueryTarget = href.startsWith('?target=');
      const normalizedHash = isQueryTarget ? `#${href.split('=')[1]}` : href;

      // target="_blank"の場合は新しいタブで開く
      if (link.getAttribute('target') === '_blank') {
        e.preventDefault();
        const baseUrl = window.location.href.split('#')[0].split('?')[0];
        const newUrl = isQueryTarget ? `${baseUrl}${href}` : `${baseUrl}${href}`;
        const newWindow = window.open(newUrl, '_blank');

        // 新しいウィンドウが読み込まれた後に表示処理を実行（スクロールなしで瞬時表示）
        if (newWindow) {
          newWindow.addEventListener('load', function() {
            setTimeout(() => {
              const targetElement = newWindow.document.querySelector(normalizedHash);
              if (targetElement) {
                const sectionElement = targetElement.closest('.step-section');
                if (sectionElement) {
                  // セクションを表示（直接DOM操作）
                  const allSections = newWindow.document.querySelectorAll('.step-section');
                  allSections.forEach(section => { section.classList.add('is-hidden'); });
                  sectionElement.classList.remove('is-hidden');
                  // 目的位置へ瞬時に移動
                  scrollToElementNoAnim(normalizedHash, newWindow.document);
                }
              }
            }, 300);
          });
        }
        return;
      }

      // 内部リンクの場合
      if (normalizedHash.startsWith('#') && normalizedHash !== '#top') {
        e.preventDefault();

        const targetElement = document.querySelector(normalizedHash);
        if (!targetElement) return;

        // 対象要素が属するセクションを特定
        const sectionElement = targetElement.closest('.step-section');
        if (sectionElement) {
          const sectionId = sectionElement.id;
          if (sectionId) {
            // まずセクションを表示
            activateSection(`#${sectionId}`, { scrollToTop: false });

            // レイアウト確定後にスクロール（位置ズレ対策）
            scrollToWhenStable(normalizedHash);
          }
        }
      }
    });

    const initialHandledByTarget = handleInitialTargetRequest();
    const initialHandledByHash = initialHandledByTarget ? true : handleInitialHash();
    if (!initialHandledByTarget && !initialHandledByHash) {
      activateSection('#top', { scrollToTop: false, updateUrl: false });
    }

    // スクロール連動機能
    setupScrollSync();

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

    // クエリパラメータによる初期表示調整（?target=xxx）

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

    function handleInitialTargetRequest() {
      const params = new URLSearchParams(window.location.search || '');
      const targetId = (params.get('target') || '').trim();
      if (!targetId) return false;
      const hash = `#${targetId.replace(/^#+/, '')}`;
      const targetEl = document.querySelector(hash);
      if (!targetEl) return false;

      const sectionEl = targetEl.closest('.step-section');
      const sectionHash = sectionEl && sectionEl.id ? `#${sectionEl.id}` : '#top';

      if (forcedTocState.timer) clearTimeout(forcedTocState.timer);
      forcedTocState.sectionHash = sectionHash;
      forcedTocState.subHash = hash;
      setScrollSyncManual(true);

      activateSection(sectionHash, { scrollToTop: false, parentHasActiveChild: true, activeSubHash: hash, updateUrl: false });
      scrollToWhenStable(hash);
      replaceUrlWithoutQuery(hash);

      // 一定時間後にスクロール連動を再開
      forcedTocState.timer = setTimeout(() => {
        console.log('handleInitialTargetRequest: forcedTocStateタイマー終了');
        forcedTocState.sectionHash = null;
        forcedTocState.subHash = null;
        setScrollSyncManual(false);
        triggerScrollSyncUpdate();
      }, 2000);  // 800ms → 2000msに延長

      return true;
    }

    function handleInitialHash() {
      let hash = (window.location.hash || '').trim();
      if (!hash || hash === '#top') return false;

      const targetEl = document.querySelector(hash);
      let sectionEl = null;
      if (targetEl) {
        sectionEl = targetEl.classList.contains('step-section') ? targetEl : targetEl.closest('.step-section');
      } else {
        const id = hash.replace(/^#/, '');
        const possibleSection = document.getElementById(id);
        if (possibleSection && possibleSection.classList.contains('step-section')) {
          sectionEl = possibleSection;
        } else {
          return false;
        }
      }

      const sectionHash = sectionEl && sectionEl.id ? `#${sectionEl.id}` : '#top';
      const isSectionAnchor = sectionHash === hash;
      const subHash = isSectionAnchor ? null : hash;

      if (forcedTocState.timer) clearTimeout(forcedTocState.timer);
      forcedTocState.sectionHash = sectionHash;
      forcedTocState.subHash = subHash;
      setScrollSyncManual(true);

      activateSection(sectionHash, {
        scrollToTop: false,
        parentHasActiveChild: Boolean(subHash),
        activeSubHash: subHash,
        updateUrl: false
      });

      const targetHash = subHash || sectionHash;
      scrollToWhenStable(targetHash);

      forcedTocState.timer = setTimeout(() => {
        console.log('handleInitialHash: forcedTocStateタイマー終了');
        forcedTocState.sectionHash = null;
        forcedTocState.subHash = null;
        setScrollSyncManual(false);
        triggerScrollSyncUpdate();
      }, 2000);  // 800ms → 2000msに延長

      return true;
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
    
    // スクロール連動機能
    function setupScrollSync() {
      const manualContent = document.querySelector('.manual-content');
      if (!manualContent) {
        setScrollSyncManual = () => {};
        triggerScrollSyncUpdate = () => {};
        return;
      }

      let isScrolling = false;
      let scrollTimeout;
      let lastScrollTop = 0;

      setScrollSyncManual = (flag) => { 
        console.log('setScrollSyncManual:', flag, 'isScrolling:', isScrolling, '→', !!flag);
        isScrolling = !!flag; 
      };

      const updateActiveSection = () => {
        if (isScrolling) {
          console.log('updateActiveSection: スキップ（isScrolling = true）');
          return;
        }
        // forcedTocStateがアクティブな場合もスキップ
        if (forcedTocState.sectionHash || forcedTocState.subHash) {
          console.log('updateActiveSection: スキップ（forcedTocState有効）', forcedTocState);
          return;
        }
        console.log('updateActiveSection: 実行中');
        
        // スクロール方向を検出
        const currentScrollTop = manualContent.scrollTop;
        const isScrollingDown = currentScrollTop > lastScrollTop;
        lastScrollTop = currentScrollTop;
        
        // 現在表示されているセクションを特定
        // スクロール方向に関わらず、ビューポート中心に最も近いタイトルを基準に選択
        let activeSection = null;
        let activeProcedureItem = null;
        let closestToCenter = Infinity;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportCenter = viewportHeight / 2;
        
        sections.forEach(section => {
          if (section.classList.contains('is-hidden')) return;
          
          const rect = section.getBoundingClientRect();
          
          // セクションが画面外の場合はスキップ
          if (rect.bottom < 0 || rect.top > viewportHeight) return;
          
          // セクションのタイトル（h2）の位置を取得
          const title = section.querySelector('h2');
          if (!title) return;
          
          const titleRect = title.getBoundingClientRect();
          
          // タイトルの中心とビューポート中心の距離を計算
          const titleCenter = titleRect.top + (titleRect.height / 2);
          const distanceToCenter = Math.abs(titleCenter - viewportCenter);
          
          // ビューポート中心に最も近いタイトルを持つセクションを選択
          if (distanceToCenter < closestToCenter) {
            closestToCenter = distanceToCenter;
            activeSection = section;
          }
        });
        
        // アクティブセクション内の procedure-item を特定
        if (activeSection) {
          const procedureItems = activeSection.querySelectorAll('.procedure-item');
          let closestItemDistance = Infinity;
          const targetPosition = 150; // 画面上部から150pxの位置を基準
          
          procedureItems.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            
            // 画面外のアイテムはスキップ
            if (itemRect.bottom < 0 || itemRect.top > viewportHeight) return;
            
            // アイテムのタイトル（h4）の位置を取得
            const itemTitle = item.querySelector('h4');
            if (!itemTitle) return;
            
            const itemTitleRect = itemTitle.getBoundingClientRect();
            
            // タイトルが画面内に見えている場合
            if (itemTitleRect.top <= viewportHeight && itemTitleRect.bottom >= 0) {
              // タイトルの上端と目標位置（上部150px）との距離を計算
              const distance = Math.abs(itemTitleRect.top - targetPosition);
              
              // 上部150pxに最も近いタイトルを選択
              if (distance < closestItemDistance) {
                closestItemDistance = distance;
                activeProcedureItem = item;
              }
            }
          });
        }
        
        // 左TOCの選択状態を更新
        if (activeSection) {
          const sectionId = activeSection.id;
          const sectionHash = `#${sectionId}`;
          
          // 事前にアクティブなサブアイテムのハッシュを算出
          let itemHash = null;
          if (forcedTocState.sectionHash === sectionHash) {
            // クリック直後は強制状態を優先してチラつきを抑止
            itemHash = forcedTocState.subHash;
          } else if (activeProcedureItem) {
            const itemId = activeProcedureItem.querySelector('h4')?.id;
            if (itemId) itemHash = `#${itemId}`;
          }
          
          // メイン/サブのハイライトを更新
          requestAnimationFrame(() => {
            if (itemHash) {
              applySubLinkActiveState(sectionHash, itemHash);
            } else {
              applySubLinkActiveState(sectionHash, null, { preserveExisting: true });
            }
          });
        }
      };

      triggerScrollSyncUpdate = () => { updateActiveSection(); };
      
      // スクロールイベントのデバウンス処理（高速化）
      const handleScroll = debounce(() => {
        clearTimeout(scrollTimeout);
        // サブ項目クリック直後はアップデートを停止
        if (forcedTocState.sectionHash) {
          return;
        }
        scrollTimeout = setTimeout(() => {
          setScrollSyncManual(false);
          updateActiveSection();
        }, 20);  // 100ms → 20msに短縮
      }, 10);  // 50ms → 10msに短縮
      
      // スクロールイベントリスナー
      manualContent.addEventListener('scroll', handleScroll);
      // 初回実行
      updateActiveSection();
      
      // activateSection関数を拡張して、スクロール連動を一時的に無効化
      const originalActivateSection = window.activateSection || activateSection;
      const enhancedActivateSection = function(targetHash, opts = {}) {
        // forcedTocStateが有効な場合は、そちらのタイマーを優先
        const hasForcedState = forcedTocState.sectionHash || forcedTocState.subHash;
        
        console.log('enhancedActivateSection 呼び出し:', {
          targetHash,
          hasForcedState,
          forcedTocState: {...forcedTocState}
        });
        
        if (!hasForcedState) {
          setScrollSyncManual(true);
          console.log('enhancedActivateSection: スクロール連動を無効化（forcedTocStateなし）');
        } else {
          console.log('enhancedActivateSection: forcedTocState有効のためスクロール連動はそのまま');
        }
        
        originalActivateSection.call(this, targetHash, opts);
        
        // forcedTocStateがある場合はタイマーを設定しない（そちらが管理）
        if (!hasForcedState) {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            // 再度forcedTocStateをチェック（タイマー設定後に状態が変わった可能性）
            if (!forcedTocState.sectionHash && !forcedTocState.subHash) {
              console.log('enhancedActivateSection: タイマー終了でスクロール連動を再開');
              setScrollSyncManual(false);
            } else {
              console.log('enhancedActivateSection: forcedTocState有効なのでスクロール連動は再開しない');
            }
          }, 2000);  // 500ms → 2000msに延長（forcedTocStateより長く）
        } else {
          console.log('enhancedActivateSection: forcedTocState有効のためタイマー設定なし');
        }
      };
      
      // グローバルに公開（デバッグ用）
      window.activateSection = enhancedActivateSection;
    }

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
        // 新しいID形式に対応
        const idMap = {
          '#account-setup': 'account-setup-items',
          '#screen-layout': 'screen-layout-items',
          '#operation-guide': 'operation-guide-items',
          '#mic-usage-tips': 'mic-usage-tips-items',
          '#terminology': 'terminology-items',
          '#faq': 'faq-items',
          '#product-specs': 'product-specs-items'
        };
        return idMap[hash] || null;
      };

      tocLinks.forEach(link => {
        const hash = link.getAttribute('href');
        const groupId = getGroupIdByHash(hash);
        
        // デフォルトのクリックイベントを設定（すべてのリンクに必要）
        const defaultClickHandler = (e) => {
          e.preventDefault();
          const href = link.getAttribute('href');
          if (href) {
            const activateFn = window.activateSection || activateSection;
            activateFn(href, { closeMobile: true, scrollToTop: true });
          }
        };
        
        if (!groupId) {
          // groupIdがない場合
          link.addEventListener('click', defaultClickHandler);
          return;
        }
        const rightGroup = document.getElementById(groupId);
        if (!rightGroup) {
          // サブ項目グループがない場合
          link.addEventListener('click', defaultClickHandler);
          return;
        }
        const items = Array.from(rightGroup.querySelectorAll('a'));
        if (!items.length) {
          // サブ項目がない場合
          link.addEventListener('click', defaultClickHandler);
          return;
        }

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
            // section1の場合は数字を残す、それ以外は数字を削除
            const text = a.textContent || '';
            if (groupId === 'account-setup-items') {
              // アカウント設定セクションは番号をそのまま残す
              na.textContent = text.trim(); // 数字を残す
            } else {
              // その他のセクションは数字を削除
              na.textContent = text.replace(/^\s*\d+[\.\)\s-]*\s*/, '').trim(); // 数字を削除
            }
            // イベントリスナーの重複登録を防止
            if (!na.hasAttribute('data-click-handler')) {
              na.setAttribute('data-click-handler', 'true');
              na.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const anchor = na.getAttribute('href');
                console.log('=== TOCサブアイテムクリック ===', anchor);
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

                // 強制状態をセット（2000ms程度維持）
                if (forcedTocState.timer) {
                  console.log('TOCサブアイテム: 既存のforcedTocState.timerをクリア');
                  clearTimeout(forcedTocState.timer);
                }
                forcedTocState.sectionHash = sectionHash;
                forcedTocState.subHash = anchor;
                setScrollSyncManual(true);
                console.log('TOCサブアイテム: forcedTocStateをセット', {sectionHash, anchor});
                forcedTocState.timer = setTimeout(() => {
                  console.log('TOCサブアイテム: forcedTocStateタイマー終了');
                  forcedTocState.sectionHash = null;
                  forcedTocState.subHash = null;
                  setScrollSyncManual(false);
                  triggerScrollSyncUpdate();
                }, 2000);  // 1500ms → 2000msに延長

                applySubLinkActiveState(sectionHash, anchor);
                activateSection(sectionHash, {
                  scrollToTop: false,
                  parentHasActiveChild: true,
                  activeSubHash: anchor
                });
                
                scrollToWhenStable(anchor);
                if (window.innerWidth <= MOBILE_BREAKPOINT) closeMobileSidebar();
              });
            }
            li.appendChild(na);
            sublist.appendChild(li);
          });
        }

        // 初期状態の反映
        const key = groupId;
        const isOpen = Boolean(state[key]);
        // toggleIconは既に上で宣言済み
        applyTocOpenState({ sublist, toggleIcon, open: isOpen });

        // リンククリック時の処理
        link.addEventListener('click', (e) => {
          e.preventDefault();
          
          // サブ項目がある場合はトグルのみ（画面遷移なし）
          if (items.length > 0) {
            const nowOpen = !sublist.classList.contains('show');
            applyTocOpenState({ sublist, toggleIcon, open: nowOpen });
            state[key] = nowOpen;
            saveTocOpenState(state);
          } else {
            // サブ項目がない場合のみ画面遷移
            const href = link.getAttribute('href');
            if (href) {
              const activateFn = window.activateSection || activateSection;
              activateFn(href, { closeMobile: true, scrollToTop: true });
            }
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
      if (!hamburgerEl) {
        return;
      }
      
      // 既に初期化済みかチェック（重複防止）
      if (hamburgerEl.hasAttribute('data-initialized')) {
        console.log('Hamburger already initialized, skipping...');
        return;
      }
      hamburgerEl.setAttribute('data-initialized', 'true');
      
      // ensure icon child
      let mi = hamburgerEl.querySelector('.mi, .material-icons');
      if (!mi) {
        mi = document.createElement('i');
        mi.className = 'material-icons mi';
        mi.setAttribute('aria-hidden', 'true');
        mi.textContent = 'menu';
        hamburgerEl.appendChild(mi);
      }
      
      // initialize aria-expanded according to classes
      const isActive = hamburgerEl.classList.contains('active');
      hamburgerEl.setAttribute('aria-expanded', String(isActive));
      mi.textContent = isActive ? 'close' : 'menu';

      // イベントリスナーを一度だけ追加
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

    function applySubLinkActiveState(sectionHash, subHash, opts = {}) {
      const { fallbackToFirst = false, preserveExisting = false } = opts;
      const normalizedSection = (sectionHash || '').trim();
      const requestedSub = subHash ? (subHash.startsWith('#') ? subHash : `#${subHash}`) : '';
      
      console.log('applySubLinkActiveState 呼び出し:', {
        sectionHash,
        subHash,
        fallbackToFirst,
        preserveExisting,
        normalizedSection,
        requestedSub
      });

      const sectionLink = normalizedSection
        ? document.querySelector(`.toc .toc-link[href="${normalizedSection}"]`)
        : null;
      const tocSectionEl = sectionLink ? sectionLink.closest('.toc-section') : null;
      const availableSubLinks = tocSectionEl ? Array.from(tocSectionEl.querySelectorAll('.toc-sublist a')) : [];
      const cachedSub = tocLastActiveSub.get(normalizedSection) || '';

      let resolvedSub = requestedSub;
      if (!resolvedSub && preserveExisting && cachedSub) {
        resolvedSub = cachedSub;
      }
      if (!resolvedSub && fallbackToFirst && availableSubLinks.length) {
        resolvedSub = availableSubLinks[0].getAttribute('href') || '';
      }
      if (resolvedSub && availableSubLinks.length && !availableSubLinks.some(a => a.getAttribute('href') === resolvedSub)) {
        if (fallbackToFirst && availableSubLinks.length) {
          resolvedSub = availableSubLinks[0].getAttribute('href') || '';
        } else if (!preserveExisting) {
          resolvedSub = '';
        }
      }

      document.querySelectorAll('.toc .toc-link').forEach(link => {
        const href = link.getAttribute('href');
        const isTarget = normalizedSection && href === normalizedSection;
        if (!isTarget) {
          link.classList.remove('active');
          link.classList.remove('has-active-child');
          return;
        }
        if (resolvedSub) {
          link.classList.remove('active');
          link.classList.add('has-active-child');
        } else {
          link.classList.add('active');
          link.classList.remove('has-active-child');
        }
      });

      if (resolvedSub) {
        document.querySelectorAll('.toc .toc-sublist a').forEach(a => {
          const isMatch = a.getAttribute('href') === resolvedSub;
          a.classList.toggle('active', isMatch);
        });
        tocLastActiveSub.set(normalizedSection, resolvedSub);
      } else if (!preserveExisting) {
        if (tocSectionEl) {
          tocSectionEl.querySelectorAll('.toc-sublist a.active').forEach(a => a.classList.remove('active'));
        } else {
          document.querySelectorAll('.toc .toc-sublist a.active').forEach(a => a.classList.remove('active'));
        }
        tocLastActiveSub.delete(normalizedSection);
      }

      subGroups.forEach(g => g.classList.remove('active'));
      document.querySelectorAll('.sub-items-group a.active').forEach(a => a.classList.remove('active'));

      const activateGroup = (group) => {
        if (!group) return;
        group.classList.add('active');
        let targetLink = null;
        if (resolvedSub) targetLink = group.querySelector(`a[href="${resolvedSub}"]`);
        if (!targetLink) targetLink = group.querySelector('a');
        if (targetLink) targetLink.classList.add('active');
      };

      if (normalizedSection === '#top') {
        activateGroup(document.getElementById('sub-items-top'));
      } else if (normalizedSection) {
        const num = getSectionNum(normalizedSection);
        activateGroup(document.getElementById(`sub-items-section${num}`));
      }
    }

    function activateSection(targetHash, opts = {}) {
      if (!targetHash) return;
      const normalizedTarget = targetHash.trim();
      let activeSubHash = opts.activeSubHash || null;
      if (!activeSubHash && forcedTocState.sectionHash === normalizedTarget && forcedTocState.subHash) {
        activeSubHash = forcedTocState.subHash;
      }
      if (activeSubHash && !activeSubHash.startsWith('#')) {
        activeSubHash = `#${activeSubHash}`;
      }
      const shouldMarkParentHasChild = opts.parentHasActiveChild || Boolean(activeSubHash);
      
      tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-target') === normalizedTarget));
      sections.forEach(sec => {
        const shouldBeHidden = `#${sec.id}` !== normalizedTarget;
        if (shouldBeHidden) {
          sec.classList.add('is-hidden');
        } else {
          sec.classList.remove('is-hidden');
        }
      });
      const applyOpts = shouldMarkParentHasChild ? {} : { fallbackToFirst: true };
      console.log('activateSection: applySubLinkActiveState呼び出し', {
        normalizedTarget,
        activeSubHash,
        shouldMarkParentHasChild,
        applyOpts
      });
      applySubLinkActiveState(normalizedTarget, shouldMarkParentHasChild ? activeSubHash : null, applyOpts);

      if (opts.scrollToTop !== false) {
        const container = document.querySelector('.manual-content');
        if (container) {
          // セクション切り替え時は先頭にスクロール
          container.scrollTop = 0;
        }
      }
      if (opts.closeMobile && window.innerWidth <= MOBILE_BREAKPOINT) closeMobileSidebar();

      if (opts.updateUrl !== false) {
        const hashForUrl = (activeSubHash && activeSubHash.trim()) || normalizedTarget;
        updateUrlHash(hashForUrl);
      }
    }

    function scrollToElement(hash) {
      if (!hash) return;
      const el = document.querySelector(hash);
      if (!el) return;
      
      const container = document.querySelector('.manual-content');
      if (!container) return;
      
      // 要素のコンテナからの相対位置を計算
      const containerRect = container.getBoundingClientRect();
      const elementRect = el.getBoundingClientRect();
      const elementRelativeTop = elementRect.top - containerRect.top + container.scrollTop;
      
      // モバイル時のオフセット
      const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      const mobileOffset = isMobile ? 70 : 20;
      
      const targetScrollTop = Math.max(0, elementRelativeTop - mobileOffset);
      
      // スムーズスクロール
      fastSmoothScrollTo({ container, target: targetScrollTop });
      
      updateUrlHash(hash, { replace: true });
    }

    // スクロールアニメーションなしで瞬時に目的位置へ移動（シンプル版）
    function scrollToElementNoAnim(hash, docRef) {
      const doc = docRef || document;
      if (!hash) return;
      const el = doc.querySelector(hash);
      if (!el) {
        console.warn('scrollToElementNoAnim: 要素が見つかりません', hash);
        return;
      }
      
      const container = doc.querySelector('.manual-content');
      if (!container) {
        console.warn('scrollToElementNoAnim: コンテナが見つかりません');
        return;
      }
      
      // 要素のコンテナからの相対位置を計算
      const containerRect = container.getBoundingClientRect();
      const elementRect = el.getBoundingClientRect();
      const elementRelativeTop = elementRect.top - containerRect.top + container.scrollTop;
      
      // モバイル時のオフセット
      const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      const mobileOffset = isMobile ? 70 : 20;
      
      // 目標スクロール位置
      const targetScrollTop = Math.max(0, elementRelativeTop - mobileOffset);
      
      console.log('scrollToElementNoAnim:', {
        hash,
        elementTag: el.tagName,
        elementId: el.id,
        elementRelativeTop,
        mobileOffset,
        targetScrollTop,
        currentScrollTop: container.scrollTop
      });
      
      // 瞬時にスクロール
      container.scrollTop = targetScrollTop;
      
      if (!docRef) updateUrlHash(hash, { replace: true });
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
    
    // ページトップに戻るボタンの初期化
    setupBackToTop();
  } // end init

  /* ---------------- sidebar resizer ---------------- */
  function setupSidebarResizer(sidebar, resizer) {
    const MIN = 240, MAX = 520;
    let dragging = false, startX = 0, startW = sidebar.getBoundingClientRect().width;
    
    // 既存のlocalStorageデータをクリア
    try {
      localStorage.removeItem(SIDEBAR_WIDTH_KEY);
    } catch (e) {}
    
    // localStorage からの読み込みを無効化（常に初期値350pxを使用）
    // try {
    //   const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY) || 0);
    //   if (saved && saved >= MIN && saved <= MAX) {
    //     sidebar.style.flexBasis = saved + 'px';
    //     sidebar.style.maxWidth = saved + 'px';
    //   }
    // } catch (e) {}
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
      // localStorage への保存を無効化
      // try { const w = Math.round(sidebar.getBoundingClientRect().width); localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w)); } catch (e) {}
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
      // localStorage への保存を無効化
      // try { const w = Math.round(sidebar.getBoundingClientRect().width); localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w)); } catch (e) {}
    });
  }

  function setupSectionScopedSearch({ sectionSelector, inputId, clearButtonId, searchButtonId, resultsContainerId }) {
    const sectionEl = document.querySelector(sectionSelector);
    const input = document.getElementById(inputId);
    const resultsPanel = document.getElementById(resultsContainerId);
    const searchBtn = document.getElementById(searchButtonId);
    if (!sectionEl || !input || !resultsPanel || !searchBtn) return;
    const clearBtn = clearButtonId ? document.getElementById(clearButtonId) : null;
    const sectionHash = sectionEl.id ? `#${sectionEl.id}` : sectionSelector;

    const searchModule = createSearchModule({
      sectionsSelector: sectionSelector,
      procedureSelector: '.procedure-item',
      searchInput: input,
      resultsPanel,
      onJump(anchorId, targetHash) {
        const sectionTarget = targetHash || sectionHash;
        const subHash = anchorId ? `#${anchorId}` : null;
        activateSection(sectionTarget, {
          scrollToTop: false,
          parentHasActiveChild: Boolean(subHash),
          activeSubHash: subHash,
          updateUrl: true
        });
        setTimeout(() => searchModule.jumpTo(anchorId, sectionTarget), 40);
      }
    });

    let cycleIndex = -1;
    let lastQueryValue = '';

    const focusInput = () => { try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); } };

    const handleSearchTrigger = () => {
      const q = (input.value || '').trim();
      if (!q) return;
      const needNewSearch = !resultsPanel.classList.contains('show') || q !== lastQueryValue;
      if (needNewSearch) {
        const results = searchModule.search(q);
        lastQueryValue = q;
        if (results && results.length) {
          cycleIndex = 0;
          setTimeout(() => {
            const items = resultsPanel.querySelectorAll('.sr-item');
            if (!items.length) return;
            const first = items[0];
            const anchorId = first.getAttribute('data-anchor-id');
            const targetSection = first.getAttribute('data-target') || sectionHash;
            activateSection(targetSection, {
              scrollToTop: false,
              parentHasActiveChild: Boolean(anchorId),
              activeSubHash: anchorId ? `#${anchorId}` : null,
              updateUrl: true
            });
            setTimeout(() => searchModule.jumpTo(anchorId, targetSection), 40);
            focusInput();
          }, 20);
        } else {
          cycleIndex = -1;
        }
        return;
      }

      const items = resultsPanel.querySelectorAll('.sr-item');
      if (!items.length) return;
      cycleIndex = (cycleIndex + 1 + items.length) % items.length;
      const target = items[cycleIndex];
      if (!target) return;
      const anchorId = target.getAttribute('data-anchor-id');
      const targetSection = target.getAttribute('data-target') || sectionHash;
      activateSection(targetSection, {
        scrollToTop: false,
        parentHasActiveChild: Boolean(anchorId),
        activeSubHash: anchorId ? `#${anchorId}` : null,
        updateUrl: true
      });
      setTimeout(() => searchModule.jumpTo(anchorId, targetSection), 40);
      focusInput();
    };

    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSearchTrigger();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearchTrigger();
      }
    });

    input.addEventListener('input', () => {
      cycleIndex = -1;
      if (!(input.value || '').trim()) {
        lastQueryValue = '';
      }
    });

    if (clearBtn) {
      const updateClearVisibility = () => {
        const hasText = (input.value || '').trim().length > 0;
        clearBtn.style.display = hasText ? 'flex' : 'none';
        if (!hasText) {
          cycleIndex = -1;
          lastQueryValue = '';
        }
      };
      updateClearVisibility();
      input.addEventListener('input', updateClearVisibility);
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        cycleIndex = -1;
        lastQueryValue = '';
        searchModule.clearSearch();
        updateClearVisibility();
      });
    }

    resultsPanel.addEventListener('click', () => { cycleIndex = -1; });
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
    // 右カラム（現在非表示）のテキストも数字削除（section1以外）
    document.querySelectorAll('.sub-items-group h4').forEach(el => el.textContent = strip(el.textContent));
    document.querySelectorAll('.sub-items-group a').forEach(el => {
      // section1のリンクは数字を残す
      const parent = el.closest('.sub-items-group');
      if (parent && parent.id === 'sub-items-section1') {
        return; // スキップ
      }
      el.textContent = strip(el.textContent);
    });
    // 手順項目の数字削除（section1以外）
    document.querySelectorAll('.content-panel .procedure-item h4').forEach(el => {
      // section1のh4は数字を残す
      if (el.id && (el.id === 'signin-process' || el.id === 'setup-authenticator' || el.id === 'authenticate-with-app')) {
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

  /* ---------------- ダミーのワンポイントアドバイスと注意事項を追加 ---------------- */
  function addDummyContent() {
    // この関数は無効化（ダミーコンテンツは不要）
    return;
    
    // 以下は実行されない（将来的に必要になった場合のために残す）
    const steps = document.querySelectorAll('.content-panel .step-with-image');
    steps.forEach((step, index) => {
      const stepText = step.querySelector('.step-text');
      if (!stepText) return;
      
      // 既存のnote-cardがない場合は追加
      if (!stepText.querySelector('.note-card')) {
        const noteCard = document.createElement('aside');
        noteCard.className = 'note-card is-empty';
        noteCard.setAttribute('role', 'note');
        noteCard.innerHTML = `
          <h5>⚠ 注意</h5>
          <p>ダミーの注意事項です。ここに注意事項が入ります。</p>
        `;
        stepText.appendChild(noteCard);
      }
      
      // 既存のstep-adviceがない場合は追加
      if (!step.querySelector('.step-advice')) {
        const stepAdvice = document.createElement('div');
        stepAdvice.className = 'step-advice is-empty';
        stepAdvice.innerHTML = `
          <h5>ワンポイントアドバイス</h5>
          <p>ダミーのワンポイントアドバイスです。ここに役立つヒントやコツが入ります。</p>
        `;
        step.appendChild(stepAdvice);
      }
    });
  }

  // ダミー/空の注意事項・アドバイスを自動でis-emptyに
  function markEmptyInfoCards() {
    const isEmptyText = (txt) => {
      const t = (txt || '').replace(/\s+/g, '').trim();
      if (!t) return true;
      if (/ダミー/.test(t)) return true;
      if (/後日追記予定/.test(t)) return true;
      if (/詳細は後日追記/.test(t)) return true;
      if (/併用時の制限など/.test(t)) return true;
      if (/トランスクリプト機能利用時のしゃべり描き&reg;の制限など/.test(t)) return true;
      if (/可能回数の制限/.test(t)) return true;
      if (/左のマイクボタンを押して入力したら左吹き出し/.test(t)) return true;
      if (/しゃべり描き&reg;マイクとトランスクリプトマイクの言語は連動/.test(t)) return true;
      if (/よく失敗するところを詳細に書いてあげる/.test(t)) return true;
      if (/よくある質問と回答/.test(t)) return true;
      return false;
    };

    document.querySelectorAll('.note-card').forEach(card => {
      // pタグとliタグの両方を探す
      const ps = Array.from(card.querySelectorAll('p'));
      const lis = Array.from(card.querySelectorAll('li'));
      const content = [...ps, ...lis].map(el => (el.textContent || '').trim()).join('\n');
      
      // ダミーコンテンツや空の場合はis-emptyを追加、そうでなければ削除
      if (isEmptyText(content)) {
        card.classList.add('is-empty');
      } else {
        card.classList.remove('is-empty');
      }
    });

    document.querySelectorAll('.step-advice').forEach(card => {
      // pタグとliタグの両方を探す
      const ps = Array.from(card.querySelectorAll('p'));
      const lis = Array.from(card.querySelectorAll('li'));
      const content = [...ps, ...lis].map(el => (el.textContent || '').trim()).join('\n');
      
      // ダミーコンテンツや空の場合はis-emptyを追加、そうでなければ削除
      if (isEmptyText(content)) {
        card.classList.add('is-empty');
      } else {
        card.classList.remove('is-empty');
      }
    });
  }

  /* ---------------- 注意事項とワンポイントアドバイスの表示/非表示切り替え ---------------- */
  function toggleContentVisibility(type, show) {
    if (type === 'notes') {
      document.querySelectorAll('.note-card').forEach(el => {
        if (show) {
          // ダミー(is-empty)は表示しない
          el.style.display = el.classList.contains('is-empty') ? 'none' : '';
        } else {
          el.style.display = 'none';
        }
      });
    } else if (type === 'advice') {
      document.querySelectorAll('.step-advice').forEach(el => {
        if (show) {
          el.style.display = el.classList.contains('is-empty') ? 'none' : '';
        } else {
          el.style.display = 'none';
        }
      });
    }
  }
  
  // グローバルに公開（コンソールから呼び出し可能）
  window.toggleNotes = (show = true) => toggleContentVisibility('notes', show);
  window.toggleAdvice = (show = true) => toggleContentVisibility('advice', show);

  /* ---------------- 印刷時にh3をh4の横に追加 ---------------- */
  function addPrintH3() {
    // 既存のprint-h3を削除
    document.querySelectorAll('.print-h3').forEach(el => el.remove());
    
    // 各procedure-itemにh3を追加
    document.querySelectorAll('.procedure-item').forEach(item => {
      const h4 = item.querySelector('h4');
      if (!h4) return;
      
      // h4が属するセクションを特定
      const section = h4.closest('.step-section');
      if (!section) return;
      
      // セクションのh2を取得
      const h2 = section.querySelector('.step-header h2');
      if (!h2) return;
      
      // 先頭の数字や記号（01. / 1) / 1- など）を除去
      const raw = (h2.textContent || '').trim();
      const cleaned = raw.replace(/^\s*\d+\s*[\.|\)\-]?\s*/, '');
      
      // h3要素を作成してh4の中に追加
      const h3 = document.createElement('span');
      h3.className = 'print-h3';
      h3.textContent = cleaned;
      
      // h4の中に追加（h4の最後に）
      h4.appendChild(h3);
    });
  }
  
  // 印刷前にh3を追加
  window.addEventListener('beforeprint', addPrintH3);
  
  // 印刷用目次を生成する関数
  let isPrintTOCGenerating = false;
  function generatePrintTOC() {
    const tocContainer = document.querySelector('.print-toc-content');
    if (!tocContainer) {
      return;
    }
    
    // 重複実行を防ぐ（既に内容がある場合はスキップ）
    if (isPrintTOCGenerating || tocContainer.children.length > 0) {
      console.log('Skipping TOC generation: already generating or has content'); // デバッグ用
      return;
    }
    
    isPrintTOCGenerating = true;
    
    // 既存の内容をクリア
    tocContainer.innerHTML = '';
    console.log('Cleared container, current HTML:', tocContainer.innerHTML); // デバッグ用
    
    // TOCセクションが生成されるまで待機
    setTimeout(() => {
      // 再度チェック（タイミングの問題を回避）
      if (tocContainer.children.length > 0) {
        console.log('Content already added, skipping'); // デバッグ用
        isPrintTOCGenerating = false;
        return;
      }
      
      const tocSections = document.querySelectorAll('.toc-section');
      console.log('Found toc-sections:', tocSections.length); // デバッグ用
      console.log('Container before adding:', tocContainer.children.length, 'children'); // デバッグ用
    
    // TOPセクションを追加
    const topSection = document.createElement('div');
    topSection.className = 'print-toc-section';
    const topH3 = document.createElement('h3');
    const topLink = document.createElement('a');
    topLink.href = '#top';
    topLink.innerHTML = '<span class="toc-icon">📝</span> TOP - しゃべり描き翻訳&trade;でできること';
    topH3.appendChild(topLink);
    topSection.appendChild(topH3);
    
    // TOPのサブ項目を追加（リンク付き）
    const topSubList = document.createElement('ul');
    topSubList.className = 'print-toc-sublist';
    const topItems = [
      { text: '２言語間のコミュニケーション', href: '#top' },
      { text: 'しゃべり描き&reg;（音声＋お絵描き）で翻訳', href: '#top' },
      { text: 'トランスクリプト（会話）の翻訳', href: '#top' }
    ];
    topItems.forEach((item) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.text;
      li.appendChild(link);
      topSubList.appendChild(li);
    });
    topSection.appendChild(topSubList);
    tocContainer.appendChild(topSection);
    
    tocSections.forEach((section, index) => {
      const tocLink = section.querySelector('.toc-link');
      if (!tocLink) return;
      
      // セクションのタイトルとhrefを取得
      const titleText = tocLink.querySelector('span')?.textContent || '';
      const icon = tocLink.querySelector('i')?.className || '';
      const sectionHref = tocLink.getAttribute('href') || '#';
      
      // 印刷用セクションを作成
      const printSection = document.createElement('div');
      printSection.className = 'print-toc-section';
      
      // タイトルを作成（リンク付き）
      const h3 = document.createElement('h3');
      const h3Link = document.createElement('a');
      h3Link.href = sectionHref;
      
      if (icon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'toc-icon';
        iconSpan.innerHTML = '●'; // シンプルな記号に置き換え
        h3Link.appendChild(iconSpan);
      }
      h3Link.appendChild(document.createTextNode(' ' + titleText));
      h3.appendChild(h3Link);
      printSection.appendChild(h3);
      
      // サブリストがある場合
      const sublist = section.querySelector('.toc-sublist');
      if (sublist && sublist.children.length > 0) {
        const printSublist = document.createElement('ul');
        printSublist.className = 'print-toc-sublist';
        
        Array.from(sublist.children).forEach(li => {
          const link = li.querySelector('a');
          if (link) {
            const printLi = document.createElement('li');
            const printLink = document.createElement('a');
            printLink.href = link.getAttribute('href') || '#';
            printLink.textContent = link.textContent;
            printLi.appendChild(printLink);
            printSublist.appendChild(printLi);
          }
        });
        
        printSection.appendChild(printSublist);
      }
      
      tocContainer.appendChild(printSection);
    });
    
    console.log('Final container children:', tocContainer.children.length); // デバッグ用
    console.log('Final container HTML length:', tocContainer.innerHTML.length); // デバッグ用
    
    // フラグをリセット（次回の印刷に備えて）
    setTimeout(() => {
      isPrintTOCGenerating = false;
    }, 500);
    
    }, 100); // 100ms待機
  }
  
  // 印刷前に新しい目次を生成
  window.addEventListener('beforeprint', generatePrintTOC);
  
  // 印刷後にh3を削除（画面表示を元に戻す）
  window.addEventListener('afterprint', () => {
    document.querySelectorAll('.print-h3').forEach(el => el.remove());
    
    // 印刷用目次をクリア（次回の印刷に備えて）
    const tocContainer = document.querySelector('.print-toc-content');
    if (tocContainer) {
      tocContainer.innerHTML = '';
      console.log('Cleared TOC after print'); // デバッグ用
    }
    isPrintTOCGenerating = false;
  });

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
      
      // anchorIdが存在する場合はそれを、なければsectionHashを使用
      const targetHash = anchorId ? `#${anchorId.replace(/^#/, '')}` : sectionHash;
      scrollToWhenStable(targetHash);
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
      p, li, dt, dd
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


  /* ---------------- モバイル時のレイアウト調整 ---------------- */
  function adjustMobileLayout() {
    const isMobile = window.innerWidth <= 768;
    
    document.querySelectorAll('.step-with-image').forEach(container => {
      const noteCard = container.querySelector('.step-text .note-card');
      const stepText = container.querySelector('.step-text');
      
      if (noteCard && stepText) {
        if (isMobile) {
          // モバイル時：note-cardをstep-with-imageの最後に移動
          if (noteCard.parentElement === stepText) {
            container.appendChild(noteCard);
            noteCard.dataset.movedFromText = 'true';
          }
        } else {
          // デスクトップ時：note-cardを元の位置（step-text内）に戻す
          if (noteCard.dataset.movedFromText === 'true') {
            stepText.appendChild(noteCard);
            delete noteCard.dataset.movedFromText;
          }
        }
      }
    });
  }
  
  // 初回実行とリサイズ時に実行
  adjustMobileLayout();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(adjustMobileLayout, 250);
  });

})(); // EOF
