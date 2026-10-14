import { useNavigate } from 'react-router-dom';
import Icon from './icons/Icon';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useWorkflowState } from '../context/WorkflowContext';
import { PORTAL_PROFILE } from '../routes/paths';
import { ROLE_LABELS } from '../services/session';
import { initialsFor } from '../services/workflow';
import { fileUrl } from '../services/api';
import { useLogout } from '../hooks/usePortal';

/** Profile picture stored on the session or on the matching user record. */
export function useSessionAvatar() {
    const { session } = useAuth();
    const state = useWorkflowState();
    if (session.picUrl || session.avatar) return fileUrl(session.picUrl || session.avatar);
    const key = String(session.email || session.name || '').toLowerCase();
    const user = (state.users || []).find((u) => (u.email && u.email.toLowerCase() === key) || (u.name && u.name.toLowerCase() === key));
    return user && (user.avatar || user.picUrl) ? fileUrl(user.avatar || user.picUrl) : '';
}

/** Avatar circle used by the header pill and profile cards (renderSessionHeader). */
export function SessionAvatar({ className, style, fallback }) {
    const { session } = useAuth();
    const pic = useSessionAvatar();
    if (pic) {
        return (
            <div className={className} style={{ ...style, padding: 0, overflow: 'hidden' }}>
                <img src={pic} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} alt="User Avatar" />
            </div>
        );
    }
    return <div className={className} style={style}>{session.name ? initialsFor(session.name) : fallback}</div>;
}

/**
 * Top header shared by every portal: hamburger, search, mobile logout,
 * theme toggle, notification bell and the session user pill.
 */
export default function Header({ role, onToggleSidebar, search }) {
    const { session } = useAuth();
    const navigate = useNavigate();
    const logout = useLogout();

    return (
        <header className="top-header">
            <button type="button" className="hamburger-btn" title="Toggle Sidebar" aria-label="Toggle Navigation Sidebar" onClick={(e) => { e.stopPropagation(); onToggleSidebar(); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
            </button>
            <div className="search-bar">
                <Icon name="search" />
                <input
                    type="text"
                    id={search?.id}
                    placeholder={search?.placeholder || 'Search trips, issues, or notifications...'}
                    value={search ? search.value : undefined}
                    onChange={search ? (e) => search.onChange(e.target.value) : undefined}
                    aria-label="Search"
                />
            </div>
            <div className="header-right">
                <a className="mobile-header-logout logout" href="/login" title="Log Out" aria-label="Log Out" onClick={logout}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                </a>
                <ThemeToggle />
                <NotificationBell role={role} />
                <div
                    className="user-pill"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(PORTAL_PROFILE[role])}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(PORTAL_PROFILE[role]); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.35rem 0.75rem 0.35rem 1rem', borderLeft: '1.5px solid var(--border-color, #E2E8F0)', borderRadius: 99, cursor: 'pointer' }}
                >
                    <SessionAvatar
                        className="support-avatar"
                        fallback="U"
                        style={{ width: '2.35rem', height: '2.35rem', borderRadius: '50%', background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 2px 6px rgba(14, 165, 233, 0.25)' }}
                    />
                    <div className="user-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'left' }}>
                        <div className="user-info-bold" data-session-name="true" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary, #0f172a)', lineHeight: 1.2 }}>{session.name || 'User'}</div>
                        <div data-session-role="true" style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.2 }}>{ROLE_LABELS[role]}</div>
                    </div>
                </div>
            </div>
        </header>
    );
}
