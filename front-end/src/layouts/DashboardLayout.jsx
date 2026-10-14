import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import PageStyles from '../components/PageStyles';
import NotificationPopups from '../components/NotificationPopups';
import Loading from '../components/Loading';
import { PortalContext } from '../hooks/usePortal';
import { useAuth } from '../context/AuthContext';
import { useSyncStatus } from '../context/WorkflowContext';
import { configureWorkflow } from '../services/workflow';

const HeaderSearchContext = createContext('');

/** Text typed in the header search bar (setupScheduleFilters() filtered page cards with it). */
export function useHeaderSearch() {
    return useContext(HeaderSearchContext);
}

function InactiveBanner() {
    return (
        <div id="__dd-inactive-banner" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, background: '#f59e0b', color: '#fff', textAlign: 'center', padding: '8px 16px', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em' }}>
            ⚠️ Your account is inactive. You can view pages but cannot perform any actions until the Super Admin reactivates your account.
        </div>
    );
}

/**
 * Portal shell: sidebar + header + page content, with the original page's stylesheets.
 *
 * Props
 *  - role:       portal role (traveler, partner, vendor, guide, support, superuser)
 *  - page:       original page key used to load its stylesheets (see styles/manifest.js)
 *  - activeNav:  sidebar entry to highlight (defaults to the current path)
 *  - search:     optional controlled header search ({ value, onChange, placeholder, id })
 *  - waitForData: show a loading state until the first backend sync finished
 */
export default function DashboardLayout({ role, page, activeNav, search, waitForData = true, children }) {
    const { isInactive } = useAuth();
    const sync = useSyncStatus();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [headerQuery, setHeaderQuery] = useState('');

    // Selectors read the portal role while rendering (roleFromPath in the original).
    configureWorkflow({ role });

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const toggleSidebar = useCallback(() => {
        if (window.innerWidth > 1024) setCollapsed((v) => !v);
        else setMobileOpen((v) => !v);
    }, []);

    const closeSidebar = useCallback(() => {
        if (window.innerWidth > 1024) setCollapsed(true);
        else setMobileOpen(false);
    }, []);

    const portal = useMemo(() => ({ role }), [role]);
    const headerSearch = search || { value: headerQuery, onChange: setHeaderQuery };
    const showLoading = waitForData && !sync.hydrated;

    return (
        <PortalContext.Provider value={portal}>
            <HeaderSearchContext.Provider value={search ? '' : headerQuery.trim().toLowerCase()}>
                <PageStyles page={page} />
                {isInactive && <InactiveBanner />}
                <div className="app-layout">
                    <Sidebar role={role} activeNav={activeNav} collapsed={collapsed} open={mobileOpen} onClose={closeSidebar} />
                    <main className="main-content">
                        <Header role={role} onToggleSidebar={toggleSidebar} search={headerSearch} />
                        {sync.hydrated && sync.lastError && (
                            <div className="dd-sync-warning" role="alert">
                                ⚠️ Live backend data is unavailable ({sync.lastError}). Showing the last cached data — changes will sync once the server is reachable.
                            </div>
                        )}
                        {showLoading ? <Loading message="Loading live data from the backend..." /> : children}
                    </main>
                </div>
                <div className={`sidebar-overlay${mobileOpen ? ' open' : ''}`} onClick={closeSidebar} />
                <NotificationPopups role={role} />
            </HeaderSearchContext.Provider>
        </PortalContext.Provider>
    );
}

/** True when a card's text matches the header search query (setupScheduleFilters). */
export function matchesHeaderSearch(query, ...parts) {
    if (!query) return true;
    return parts.join(' ').toLowerCase().includes(query);
}
