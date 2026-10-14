import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { readStoredSession } from '../services/session';

/**
 * Dark / Light theme manager (React port of js/theme.js).
 * Each portal persists its own theme under `travelhub_theme_<portal>`; dark is the default.
 */
const ThemeContext = createContext(null);

const PORTAL_PREFIXES = [
    ['/traveler/', 'traveler'],
    ['/travel-partner/', 'partner'],
    ['/guide/', 'guide'],
    ['/vendor/', 'vendor'],
    ['/superuser/', 'superuser'],
    ['/support/', 'support'],
];

export function portalKeyFor(pathname) {
    const path = String(pathname || '').toLowerCase();
    const match = PORTAL_PREFIXES.find(([prefix]) => path.startsWith(prefix));
    if (match) return `travelhub_theme_${match[1]}`;
    const role = String(readStoredSession().role || '').toLowerCase();
    if (role.includes('traveler')) return 'travelhub_theme_traveler';
    if (role.includes('partner')) return 'travelhub_theme_partner';
    if (role.includes('guide')) return 'travelhub_theme_guide';
    if (role.includes('vendor')) return 'travelhub_theme_vendor';
    if (role.includes('super')) return 'travelhub_theme_superuser';
    if (role.includes('support')) return 'travelhub_theme_support';
    return 'travelhub_theme_global';
}

function readTheme(key) {
    try {
        return localStorage.getItem(key) || localStorage.getItem('travelhub_theme') || 'dark';
    } catch {
        return 'dark';
    }
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    const root = document.documentElement;
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.classList.toggle('dark-theme', isDark);
    root.classList.toggle('light-theme', !isDark);
    document.body.classList.toggle('dark-theme', isDark);
    document.body.classList.toggle('light-theme', !isDark);
}

export function ThemeProvider({ children, onToggleNotice }) {
    const location = useLocation();
    const portalKey = portalKeyFor(location.pathname);
    const [theme, setThemeState] = useState(() => readTheme(portalKey));
    const lastToggle = useRef(0);

    // Switching portals loads that portal's own saved theme.
    useEffect(() => {
        setThemeState(readTheme(portalKey));
    }, [portalKey]);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    // Cross-tab sync for this portal only.
    useEffect(() => {
        const onStorage = (event) => {
            if (event.key === portalKey) setThemeState(event.newValue || 'dark');
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [portalKey]);

    const setTheme = useCallback((next, notify = false) => {
        const active = next === 'dark' ? 'dark' : 'light';
        try { localStorage.setItem(portalKey, active); } catch { /* ignore */ }
        setThemeState(active);
        if (notify && onToggleNotice) {
            onToggleNotice(active === 'dark' ? '🌙 Obsidian Black theme activated' : '☀️ Light theme activated');
        }
    }, [portalKey, onToggleNotice]);

    const toggle = useCallback(() => {
        const now = Date.now();
        if (lastToggle.current && now - lastToggle.current < 300) return;
        lastToggle.current = now;
        setTheme(theme === 'dark' ? 'light' : 'dark', true);
    }, [theme, setTheme]);

    const value = useMemo(() => ({ theme, isDark: theme === 'dark', setTheme, toggle }), [theme, setTheme, toggle]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
}
