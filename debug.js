// ブラウザのコンソールで実行するデバッグコード

// 1. すべてのセクションの状態を確認
function checkAllSections() {
    console.log('=== セクション状態確認 ===');
    const sections = document.querySelectorAll('.step-section');
    sections.forEach(sec => {
        const isHidden = sec.classList.contains('is-hidden');
        const display = window.getComputedStyle(sec).display;
        console.log(`${sec.id}: is-hidden=${isHidden}, display=${display}`);
    });
}

// 2. セクション4を強制的に表示
function forceShowSection4() {
    console.log('=== セクション4を強制表示 ===');
    
    // すべてのセクションを非表示
    document.querySelectorAll('.step-section').forEach(sec => {
        sec.classList.add('is-hidden');
        console.log(`${sec.id}: 非表示にしました`);
    });
    
    // セクション4だけ表示
    const section4 = document.querySelector('#section4');
    if (section4) {
        section4.classList.remove('is-hidden');
        console.log('section4: is-hiddenクラスを削除');
        console.log('section4の現在のクラス:', section4.className);
        console.log('section4の表示状態:', window.getComputedStyle(section4).display);
    } else {
        console.log('ERROR: section4が見つかりません');
    }
}

// 3. activateSection関数を直接呼び出し
function testActivateSection() {
    console.log('=== activateSection テスト ===');
    if (typeof activateSection === 'function') {
        activateSection('#section4', { scrollToTop: true });
        console.log('activateSection("#section4") を実行しました');
    } else {
        console.log('ERROR: activateSection関数が見つかりません');
    }
}

// 4. TOCリンクを確認
function checkTocLinks() {
    console.log('=== TOCリンク確認 ===');
    const tocLinks = document.querySelectorAll('.toc .toc-link');
    tocLinks.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent.trim();
        console.log(`${text}: href=${href}`);
        
        // イベントリスナーの確認
        const listeners = getEventListeners ? getEventListeners(link) : null;
        if (listeners && listeners.click) {
            console.log(`  -> clickリスナー数: ${listeners.click.length}`);
        }
    });
}

// 5. 手動でセクション切り替え
function manualSwitchToSection(sectionId) {
    const targetSection = document.querySelector(`#${sectionId}`);
    if (!targetSection) {
        console.log(`ERROR: ${sectionId}が見つかりません`);
        return;
    }
    
    // すべて非表示
    document.querySelectorAll('.step-section').forEach(sec => {
        sec.style.display = 'none';
    });
    
    // 対象セクションだけ表示
    targetSection.style.display = 'block';
    console.log(`${sectionId}を表示しました (styleで直接設定)`);
}

console.log('デバッグ関数をロードしました。以下の関数が使用可能です:');
console.log('- checkAllSections(): すべてのセクションの状態を確認');
console.log('- forceShowSection4(): セクション4を強制的に表示');
console.log('- testActivateSection(): activateSection関数をテスト');
console.log('- checkTocLinks(): TOCリンクを確認');
console.log('- manualSwitchToSection("section4"): 手動でセクション切り替え');
