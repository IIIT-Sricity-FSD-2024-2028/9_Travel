/**
 * DREAM DESTINATION - LUXURY THEME ENGINE & TOP SWITCHER MANAGER
 * Handles persistent Dark/Light mode switching with zero-flicker initialization.
 */

// Immediate pre-render theme application (Zero-Flicker Execution - Per Portal)
(function () {
    try {
        var pathname = window.location.pathname.replace(/\\/g, '/').toLowerCase();
        var role = 'global';
        if (pathname.indexOf('/pages/traveler/') !== -1) role = 'traveler';
        else if (pathname.indexOf('/pages/travelpartner') !== -1) role = 'partner';
        else if (pathname.indexOf('/pages/guide/') !== -1) role = 'guide';
        else if (pathname.indexOf('/pages/vendor/') !== -1) role = 'vendor';
        else if (pathname.indexOf('/pages/superuser/') !== -1) role = 'superuser';
        else if (pathname.indexOf('/pages/support/') !== -1) role = 'support';
        else {
            try {
                var sess = JSON.parse(sessionStorage.getItem('dd_session') || localStorage.getItem('dd_session') || '{}');
                if (sess && sess.role) {
                    var s = String(sess.role).toLowerCase().trim();
                    if (s.indexOf('traveler') !== -1) role = 'traveler';
                    else if (s.indexOf('partner') !== -1) role = 'partner';
                    else if (s.indexOf('guide') !== -1) role = 'guide';
                    else if (s.indexOf('vendor') !== -1) role = 'vendor';
                    else if (s.indexOf('super') !== -1) role = 'superuser';
                    else if (s.indexOf('support') !== -1) role = 'support';
                }
            } catch (_) {}
        }
        var key = 'travelhub_theme_' + role;
        var savedTheme = localStorage.getItem(key) || localStorage.getItem('travelhub_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark-theme');
            document.documentElement.classList.remove('light-theme');
        } else {
            document.documentElement.classList.add('light-theme');
            document.documentElement.classList.remove('dark-theme');
        }
        if (document.body) {
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-theme');
                document.body.classList.remove('light-theme');
            } else {
                document.body.classList.add('light-theme');
                document.body.classList.remove('dark-theme');
            }
        }
    } catch (e) {
        console.warn('Theme pre-init error:', e);
    }
})();

const ThemeManager = {
    _lastToggle: 0,

    getPortalKey() {
        try {
            var pathname = window.location.pathname.replace(/\\/g, '/').toLowerCase();
            if (pathname.indexOf('/pages/traveler/') !== -1) return 'travelhub_theme_traveler';
            if (pathname.indexOf('/pages/travelpartner') !== -1) return 'travelhub_theme_partner';
            if (pathname.indexOf('/pages/guide/') !== -1) return 'travelhub_theme_guide';
            if (pathname.indexOf('/pages/vendor/') !== -1) return 'travelhub_theme_vendor';
            if (pathname.indexOf('/pages/superuser/') !== -1) return 'travelhub_theme_superuser';
            if (pathname.indexOf('/pages/support/') !== -1) return 'travelhub_theme_support';

            var session = JSON.parse(sessionStorage.getItem('dd_session') || localStorage.getItem('dd_session') || '{}');
            if (session && session.role) {
                var s = String(session.role).toLowerCase().trim();
                if (s.indexOf('traveler') !== -1) return 'travelhub_theme_traveler';
                if (s.indexOf('partner') !== -1) return 'travelhub_theme_partner';
                if (s.indexOf('guide') !== -1) return 'travelhub_theme_guide';
                if (s.indexOf('vendor') !== -1) return 'travelhub_theme_vendor';
                if (s.indexOf('super') !== -1) return 'travelhub_theme_superuser';
                if (s.indexOf('support') !== -1) return 'travelhub_theme_support';
            }
        } catch (_) {}
        return 'travelhub_theme_global';
    },

    getTheme() {
        try {
            const key = this.getPortalKey();
            return localStorage.getItem(key) || localStorage.getItem('travelhub_theme') || 'dark';
        } catch (e) {
            return 'dark';
        }
    },

    setTheme(theme, notify = false) {
        const isDark = theme === 'dark';
        const activeTheme = isDark ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', activeTheme);
        if (isDark) {
            document.documentElement.classList.add('dark-theme');
            document.documentElement.classList.remove('light-theme');
        } else {
            document.documentElement.classList.add('light-theme');
            document.documentElement.classList.remove('dark-theme');
        }

        if (document.body) {
            if (isDark) {
                document.body.classList.add('dark-theme');
                document.body.classList.remove('light-theme');
            } else {
                document.body.classList.add('light-theme');
                document.body.classList.remove('dark-theme');
            }
        }

        try {
            const key = this.getPortalKey();
            localStorage.setItem(key, activeTheme);
        } catch (e) {
            console.error('Failed to save theme to localStorage:', e);
        }

        this.updateAllButtons(isDark);
        this.syncSuperuserSettings(isDark);

        if (notify && typeof Toast !== 'undefined' && Toast.info) {
            Toast.info(isDark ? '🌙 Obsidian Black theme activated' : '☀️ Light theme activated');
        }

        window.dispatchEvent(new CustomEvent('travelhub_theme_change', { detail: { theme: activeTheme } }));
    },

    toggle() {
        const now = Date.now();
        if (this._lastToggle && (now - this._lastToggle) < 300) {
            return;
        }
        this._lastToggle = now;

        const current = this.getTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        this.setTheme(next, true);
    },

    getButtonInnerHTML(isDark) {
        const iconSvg = isDark
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

        const labelText = isDark ? 'Light Mode' : 'Dark Mode';

        return `<span class="theme-toggle-icon">${iconSvg}</span><span class="theme-toggle-text">${labelText}</span>`;
    },

    createToggleButton(isFloating = false) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `theme-toggle-btn ${isFloating ? 'theme-toggle-floating' : ''}`;
        btn.id = 'theme-toggle-btn';
        btn.setAttribute('aria-label', 'Toggle Dark/Light Mode');
        btn.setAttribute('title', 'Switch between Obsidian Black and Light themes');

        const isDark = this.getTheme() === 'dark';
        btn.innerHTML = this.getButtonInnerHTML(isDark);

        btn.onclick = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.toggle();
        };

        return btn;
    },

    updateAllButtons(isDark) {
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            btn.innerHTML = this.getButtonInnerHTML(isDark);
            btn.onclick = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                this.toggle();
            };
        });
    },

    syncSuperuserSettings(isDark) {
        const themeCards = document.querySelectorAll('.theme-btn');
        if (themeCards.length > 0) {
            themeCards.forEach(card => {
                const cardIsDark = card.classList.contains('theme-dark');
                if (cardIsDark === isDark) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });
        }
    },

    initAutoInjection() {
        // If button already exists, do not inject duplicate
        if (document.getElementById('theme-toggle-btn') || document.querySelector('.theme-toggle-btn')) {
            return;
        }

        // 1. Landing Page Navbar (.nav-actions)
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            const toggle = this.createToggleButton(false);
            navActions.insertBefore(toggle, navActions.firstChild);
            return;
        }

        // 2. Portal Header (.top-header .header-right, .top-header .header-icons, etc.)
        const headerRight = document.querySelector('.top-header .header-right, .top-header .header-icons, .header-right, .header-icons, .top-nav-right, .super-header-right');
        if (headerRight) {
            const toggle = this.createToggleButton(false);
            headerRight.insertBefore(toggle, headerRight.firstChild);
            return;
        }

        // 3. General Top Header fallback
        const topHeader = document.querySelector('.top-header, .main-header, .app-header');
        if (topHeader) {
            const toggle = this.createToggleButton(false);
            topHeader.appendChild(toggle);
            return;
        }

        // 4. Auth Screens (Login / Register)
        const isAuthScreen = document.querySelector('.login-wrapper') || document.querySelector('.left-panel') || document.querySelector('.auth-container');
        if (isAuthScreen) {
            const toggle = this.createToggleButton(true);
            document.body.appendChild(toggle);
            return;
        }
    },

    bindGlobalClick() {
        if (window.__travelhub_theme_bound) return;
        window.__travelhub_theme_bound = true;

        // Capturing listener so it intercepts clicks even if propagation is stopped
        document.addEventListener('click', (e) => {
            const toggleBtn = e.target && e.target.closest && e.target.closest('.theme-toggle-btn');
            if (toggleBtn) {
                e.preventDefault();
                e.stopPropagation();
                ThemeManager.toggle();
            }
        }, true);
    },

    init() {
        const theme = this.getTheme();
        this.setTheme(theme, false);
        this.initAutoInjection();
        this.bindGlobalClick();

        // Listen for Cross-Tab Sync for THIS portal only
        window.addEventListener('storage', (e) => {
            if (e.key === this.getPortalKey()) {
                const newTheme = e.newValue || 'dark';
                this.setTheme(newTheme, false);
            }
        });
    }
};

// Auto-run on DOM Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}

// Global exposure
window.ThemeManager = ThemeManager;
