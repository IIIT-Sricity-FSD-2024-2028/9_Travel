/**
 * auth_guard.js
 * =============
 * Enforces role-based access control on every portal page.
 * Loaded as the FIRST script in every portal HTML (before icons / workflow).
 *
 * Flow:
 *  1. Determines the required role from the page URL path segment.
 *  2. Reads dd_session from localStorage.
 *  3. No session → redirect to login.html
 *  4. Wrong role → redirect to the user's own portal home page.
 */
(function () {
    'use strict';

    // ── Session helper ──────────────────────────────────────────────────────────
    // sessionStorage is tab-specific; localStorage is the persistent fallback.
    // Reading sessionStorage first lets each tab have its own independent user.
    function getSession() {
        try {
            var tabSession = JSON.parse(sessionStorage.getItem('dd_session') || 'null');
            if (tabSession && tabSession.email) return tabSession;
            return JSON.parse(localStorage.getItem('dd_session') || '{}');
        } catch (_) { return {}; }
    }

    // ── Resolve login.html path from the current URL ────────────────────────────
    // Pages are always at: /...root.../front-end/pages/<role>/<page>.html
    // login.html is at:    /...root.../front-end/login.html
    function getLoginPath() {
        var pathname = window.location.pathname.replace(/\\/g, '/');
        var pagesIdx = pathname.lastIndexOf('/pages/');
        if (pagesIdx !== -1) {
            // Everything before /pages/ is the front-end root, e.g. /front-end
            return pathname.substring(0, pagesIdx) + '/login.html';
        }
        // Generic fallback: 2 directories up from current file
        return '../../login.html';
    }

    // ── Role → portal home path (relative to /pages/) ──────────────────────────
    var ROLE_HOME = {
        traveler:  'traveler/traveler_dashboard.html',
        partner:   'travelPartner/travelPartner_dashboard.html',
        guide:     'guide/dashboard.html',
        vendor:    'vendor/vendor_dashboard.html',
        superuser: 'superuser/superuser_dashboard.html',
        support:   'support/dashboard.html',
    };

    // ── URL segment → required role ─────────────────────────────────────────────
    var PATH_ROLE_MAP = [
        { segment: '/pages/traveler/',       role: 'traveler'  },
        { segment: '/pages/travelpartner',   role: 'partner'   },  // case-insensitive match
        { segment: '/pages/guide/',          role: 'guide'     },
        { segment: '/pages/vendor/',         role: 'vendor'    },
        { segment: '/pages/superuser/',      role: 'superuser' },
        { segment: '/pages/support/',        role: 'support'   },
    ];

    // ── Detect required role for this page ─────────────────────────────────────
    var pathname = window.location.pathname.replace(/\\/g, '/').toLowerCase();
    var requiredRole = null;
    for (var i = 0; i < PATH_ROLE_MAP.length; i++) {
        if (pathname.indexOf(PATH_ROLE_MAP[i].segment) !== -1) {
            requiredRole = PATH_ROLE_MAP[i].role;
            break;
        }
    }

    // Not a protected portal page → skip guard entirely
    if (!requiredRole) return;

    // ── Role normalization helper ──────────────────────────────────────────────
    function normRole(r) {
        if (!r) return '';
        var s = String(r).toLowerCase().trim();
        if (s === 'travel partner' || s === 'partner') return 'partner';
        if (s === 'tour guide' || s === 'guide') return 'guide';
        if (s === 'support executive' || s === 'support') return 'support';
        if (s === 'super user' || s === 'super admin' || s === 'superuser') return 'superuser';
        if (s === 'traveler' || s === 'traveller') return 'traveler';
        if (s === 'vendor') return 'vendor';
        return s;
    }

    // ── Validate session ────────────────────────────────────────────────────────
    var session = getSession();

    // No valid session → send to login
    if (!session.email || !session.role) {
        window.location.replace(getLoginPath());
        return;
    }

    var userRole = normRole(session.role);

    // ── Authorised → do nothing ─────────────────────────────────────────────────
    if (userRole === requiredRole) return;

    // ── Wrong portal → bounce to the user's own portal ─────────────────────────
    var homePath = ROLE_HOME[userRole];
    if (homePath) {
        var rawPath = window.location.pathname.replace(/\\/g, '/');
        var pagesIdx = rawPath.lastIndexOf('/pages/');
        var base = pagesIdx !== -1
            ? rawPath.substring(0, pagesIdx + '/pages/'.length)
            : '';
        // Store a brief flash message so the redirected page can show a toast
        try { sessionStorage.setItem('dd_access_denied', '1'); } catch (_) {}
        window.location.replace(base + homePath);
    } else {
        // Unknown role → login
        window.location.replace(getLoginPath());
    }

    // ── Status polling: detect suspension/deactivation in real-time ────────────
    // Runs every 30 seconds once the page is loaded to catch admin changes.
    function doStatusCheck() {
        var currentSession = getSession();
        if (!currentSession || !currentSession.email) return;
        var apiHost = (typeof window !== 'undefined' && window.location.hostname) ? window.location.hostname : 'localhost';
        fetch('http://' + apiHost + ':3000/users/' + encodeURIComponent(currentSession.email), {
            headers: { 'x-role': 'Super User', 'x-user-email': '' }
        })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(payload) {
            if (!payload || !payload.data) return;
            var user = payload.data;
            if (user.status === 'Suspended') {
                // Show alert and force logout
                try { sessionStorage.removeItem('dd_session'); localStorage.removeItem('dd_session'); } catch(_) {}
                alert('\u26a0\ufe0f Your account has been suspended by the Super Admin. You will be logged out.');
                window.location.replace(getLoginPath());
            } else if (user.status === 'Inactive') {
                // Show or update the inactive banner
                var existing = document.getElementById('__dd-inactive-banner');
                if (!existing) {
                    var banner = document.createElement('div');
                    banner.id = '__dd-inactive-banner';
                    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#f59e0b;color:#fff;text-align:center;padding:8px 16px;font-size:13px;font-weight:600;letter-spacing:0.02em;';
                    banner.textContent = '\u26a0\ufe0f Your account is inactive. You can view pages but cannot perform any actions until the Super Admin reactivates your account.';
                    document.body.prepend(banner);
                }
            } else {
                // Active — remove banner if it exists
                var b = document.getElementById('__dd-inactive-banner');
                if (b) b.remove();
            }
        })
        .catch(function() {}); // Silently fail — don't disrupt UX on network error
    }

    // Delay initial check so the page loads first, then poll every 30 seconds
    setTimeout(doStatusCheck, 5000);
    setInterval(doStatusCheck, 300000);
}());
