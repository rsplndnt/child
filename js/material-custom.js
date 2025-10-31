/**
 * Custom Material Design JavaScript for しゃべり描き翻訳™
 * Handles interactive components and Material Design behaviors
 */

(function() {
    'use strict';

    // ========================================
    // Material Components Initialization
    // ========================================

    /**
     * Initialize all Material Design components
     */
    function initializeMaterialComponents() {
        console.log('Initializing Material Design components...');

        // Initialize Drawer
        const drawerEl = document.querySelector('.mdc-drawer');
        if (drawerEl && typeof mdc !== 'undefined' && mdc.drawer) {
            window.mdcDrawer = new mdc.drawer.MDCDrawer(drawerEl);
            console.log('✓ Drawer initialized');
        }

        // Initialize Dialog
        const dialogEl = document.querySelector('.mdc-dialog');
        if (dialogEl && typeof mdc !== 'undefined' && mdc.dialog) {
            window.mdcDialog = new mdc.dialog.MDCDialog(dialogEl);
            console.log('✓ Dialog initialized');
        }

        // Initialize all Buttons with Ripple
        const buttons = document.querySelectorAll('.mdc-button');
        if (buttons.length > 0 && typeof mdc !== 'undefined' && mdc.ripple) {
            buttons.forEach(button => {
                mdc.ripple.MDCRipple.attachTo(button);
            });
            console.log(`✓ ${buttons.length} buttons initialized with ripple`);
        }

        // Initialize all Icon Buttons
        const iconButtons = document.querySelectorAll('.mdc-icon-button');
        if (iconButtons.length > 0 && typeof mdc !== 'undefined' && mdc.ripple) {
            iconButtons.forEach(button => {
                const ripple = mdc.ripple.MDCRipple.attachTo(button);
                ripple.unbounded = true;
            });
            console.log(`✓ ${iconButtons.length} icon buttons initialized`);
        }

        // Initialize all List Items with Ripple
        const listItems = document.querySelectorAll('.mdc-list-item');
        if (listItems.length > 0 && typeof mdc !== 'undefined' && mdc.ripple) {
            listItems.forEach(item => {
                mdc.ripple.MDCRipple.attachTo(item);
            });
            console.log(`✓ ${listItems.length} list items initialized`);
        }

        // Initialize Text Fields
        const textFields = document.querySelectorAll('.mdc-text-field');
        if (textFields.length > 0 && typeof mdc !== 'undefined' && mdc.textField) {
            textFields.forEach(field => {
                new mdc.textField.MDCTextField(field);
            });
            console.log(`✓ ${textFields.length} text fields initialized`);
        }

        // Initialize FABs
        const fabs = document.querySelectorAll('.mdc-fab');
        if (fabs.length > 0 && typeof mdc !== 'undefined' && mdc.ripple) {
            fabs.forEach(fab => {
                mdc.ripple.MDCRipple.attachTo(fab);
            });
            console.log(`✓ ${fabs.length} FABs initialized`);
        }

        // Initialize Chips
        const chips = document.querySelectorAll('.mdc-chip');
        if (chips.length > 0 && typeof mdc !== 'undefined' && mdc.chips) {
            chips.forEach(chip => {
                new mdc.chips.MDCChip(chip);
            });
            console.log(`✓ ${chips.length} chips initialized`);
        }
    }

    // ========================================
    // Navigation Drawer Logic
    // ========================================

    /**
     * Setup navigation drawer behavior
     */
    function setupDrawer() {
        const menuButton = document.getElementById('menuButton');
        const drawer = window.mdcDrawer;

        if (menuButton && drawer) {
            menuButton.addEventListener('click', () => {
                drawer.open = !drawer.open;
            });

            // Update active navigation item on scroll
            const sections = document.querySelectorAll('section[id]');
            const navLinks = document.querySelectorAll('.mdc-list-item');

            const observerOptions = {
                root: null,
                rootMargin: '-100px 0px -66%',
                threshold: 0
            };

            const observerCallback = (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        navLinks.forEach(link => {
                            const href = link.getAttribute('href');
                            if (href === `#${id}`) {
                                navLinks.forEach(l => l.classList.remove('mdc-list-item--activated'));
                                link.classList.add('mdc-list-item--activated');
                            }
                        });
                    }
                });
            };

            const observer = new IntersectionObserver(observerCallback, observerOptions);
            sections.forEach(section => observer.observe(section));

            console.log('✓ Drawer navigation setup complete');
        }
    }

    // ========================================
    // Dialog Logic
    // ========================================

    /**
     * Setup What's New dialog
     */
    function setupDialog() {
        const whatsNewBtn = document.getElementById('whatsNewBtn');
        const dialog = window.mdcDialog;

        if (whatsNewBtn && dialog) {
            whatsNewBtn.addEventListener('click', () => {
                dialog.open();
            });
            console.log('✓ Dialog setup complete');
        }
    }

    // ========================================
    // Floating Action Button (FAB)
    // ========================================

    /**
     * Setup back to top FAB
     */
    function setupBackToTop() {
        const fab = document.getElementById('backToTop');
        const mainContent = document.querySelector('.main-content');

        if (fab && mainContent) {
            // Show/hide FAB based on scroll position
            mainContent.addEventListener('scroll', () => {
                if (mainContent.scrollTop > 300) {
                    fab.style.display = 'flex';
                    fab.style.opacity = '1';
                    fab.style.transform = 'scale(1)';
                } else {
                    fab.style.opacity = '0';
                    fab.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        if (mainContent.scrollTop <= 300) {
                            fab.style.display = 'none';
                        }
                    }, 300);
                }
            });

            // Scroll to top on click
            fab.addEventListener('click', () => {
                mainContent.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });

            console.log('✓ Back to top FAB setup complete');
        }
    }

    // ========================================
    // Search Functionality
    // ========================================

    /**
     * Setup search functionality
     */
    function setupSearch() {
        const searchInput = document.querySelector('.mdc-text-field__input');

        if (searchInput) {
            searchInput.addEventListener('input', debounce(function(e) {
                const query = e.target.value.toLowerCase().trim();

                if (query.length > 0) {
                    performSearch(query);
                } else {
                    clearSearchResults();
                }
            }, 300));

            console.log('✓ Search functionality setup complete');
        }
    }

    /**
     * Perform search across page content
     */
    function performSearch(query) {
        const sections = document.querySelectorAll('section[id]');
        const results = [];

        sections.forEach(section => {
            const text = section.textContent.toLowerCase();
            if (text.includes(query)) {
                const id = section.getAttribute('id');
                const title = section.querySelector('h2, h3')?.textContent || id;
                results.push({ id, title });
            }
        });

        displaySearchResults(results);
    }

    /**
     * Display search results
     */
    function displaySearchResults(results) {
        // This is a placeholder - implement based on your needs
        console.log('Search results:', results);
    }

    /**
     * Clear search results
     */
    function clearSearchResults() {
        // This is a placeholder - implement based on your needs
    }

    // ========================================
    // Smooth Scrolling
    // ========================================

    /**
     * Setup smooth scrolling for anchor links
     */
    function setupSmoothScrolling() {
        const links = document.querySelectorAll('a[href^="#"]');

        links.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');

                if (href === '#' || href === '#top') {
                    e.preventDefault();
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                        mainContent.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    }
                    return;
                }

                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    e.preventDefault();
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                        const targetPosition = targetElement.offsetTop - 80; // Account for header
                        mainContent.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }

                    // Close drawer on mobile after navigation
                    if (window.mdcDrawer && window.mdcDrawer.open) {
                        window.mdcDrawer.open = false;
                    }
                }
            });
        });

        console.log('✓ Smooth scrolling setup complete');
    }

    // ========================================
    // Utility Functions
    // ========================================

    /**
     * Debounce function for performance
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function for scroll events
     */
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // ========================================
    // Responsive Behavior
    // ========================================

    /**
     * Handle responsive behaviors
     */
    function setupResponsiveBehavior() {
        const mediaQuery = window.matchMedia('(max-width: 1024px)');

        function handleResponsive(e) {
            if (window.mdcDrawer) {
                if (e.matches) {
                    // Mobile/Tablet: Use modal drawer
                    window.mdcDrawer.open = false;
                } else {
                    // Desktop: Show drawer by default
                    // Note: Material drawer doesn't have persistent mode in this version
                    // You may want to use a different approach for desktop
                }
            }
        }

        mediaQuery.addListener(handleResponsive);
        handleResponsive(mediaQuery);

        console.log('✓ Responsive behavior setup complete');
    }

    // ========================================
    // Accessibility Enhancements
    // ========================================

    /**
     * Setup accessibility features
     */
    function setupAccessibility() {
        // Keyboard navigation for drawer
        document.addEventListener('keydown', (e) => {
            // Close drawer on Escape
            if (e.key === 'Escape' && window.mdcDrawer && window.mdcDrawer.open) {
                window.mdcDrawer.open = false;
            }

            // Close dialog on Escape (handled by MDC Dialog by default)
        });

        // Add aria-labels where needed
        const menuButton = document.getElementById('menuButton');
        if (menuButton) {
            menuButton.setAttribute('aria-label', 'メニューを開く');
        }

        console.log('✓ Accessibility enhancements setup complete');
    }

    // ========================================
    // Performance Optimizations
    // ========================================

    /**
     * Setup lazy loading for images
     */
    function setupLazyLoading() {
        if ('loading' in HTMLImageElement.prototype) {
            // Browser supports native lazy loading
            const images = document.querySelectorAll('img[loading="lazy"]');
            console.log(`✓ Native lazy loading enabled for ${images.length} images`);
        } else {
            // Fallback to Intersection Observer
            const images = document.querySelectorAll('img[loading="lazy"]');

            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
            console.log(`✓ Intersection Observer lazy loading enabled for ${images.length} images`);
        }
    }

    // ========================================
    // Initialization
    // ========================================

    /**
     * Initialize all functionality when DOM is ready
     */
    function init() {
        console.log('🚀 Initializing Material Design Manual...');

        initializeMaterialComponents();
        setupDrawer();
        setupDialog();
        setupBackToTop();
        setupSearch();
        setupSmoothScrolling();
        setupResponsiveBehavior();
        setupAccessibility();
        setupLazyLoading();

        console.log('✅ Material Design Manual initialization complete!');
    }

    // Wait for DOM and MDC library to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOMContentLoaded already fired
        if (typeof mdc !== 'undefined') {
            init();
        } else {
            // Wait for MDC library to load
            window.addEventListener('load', init);
        }
    }

})();
