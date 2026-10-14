import { Link, useLocation } from 'react-router-dom';
import Icon from './icons/Icon';
import { NAV_ITEMS } from '../routes/paths';
import { useLogout } from '../hooks/usePortal';

function CloseButton({ onClose }) {
    return (
        <button type="button" className="sidebar-close-btn" title="Close Sidebar" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
    );
}

/** Role specific logo blocks – identical markup to the original sidebars. */
function SidebarLogo({ role, onClose }) {
    switch (role) {
        case 'traveler':
            return (
                <div className="sidebar-logo">
                    <div className="brand-icon">DD</div>
                    <div className="sidebar-logo-text"><div>Dream<br />Destination</div></div>
                    <CloseButton onClose={onClose} />
                </div>
            );
        case 'support':
            return (
                <div className="sidebar-logo">
                    <div className="brand-icon">DD</div>
                    <div className="sidebar-logo-text"><div>Support<br />Portal</div></div>
                    <CloseButton onClose={onClose} />
                </div>
            );
        case 'guide':
        case 'partner':
            return (
                <Link to="/">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon gradient-primary"><span>DD</span></div>
                        <div><div className="sidebar-logo-text">{role === 'guide' ? 'Guide Portal' : 'Dream Destination'}</div></div>
                        <CloseButton onClose={onClose} />
                    </div>
                </Link>
            );
        case 'vendor':
            return (
                <div className="sidebar-logo-container">
                    <div className="brand-icon">DD</div>
                    <div className="brand-text">Vendor Portal</div>
                </div>
            );
        case 'superuser':
        default:
            return (
                <div className="sidebar-logo">
                    <div className="brand-icon"><Icon name="plane" /></div>
                    <div className="sidebar-logo-text"><div>Dream</div><div>Destination</div></div>
                    <CloseButton onClose={onClose} />
                </div>
            );
    }
}

/**
 * Role based sidebar. Only the navigation of the signed-in role is ever rendered,
 * so no other portal's links are exposed.
 */
export default function Sidebar({ role, activeNav, collapsed, open, onClose }) {
    const location = useLocation();
    const logout = useLogout();
    const items = NAV_ITEMS[role] || [];
    const current = activeNav || location.pathname;

    return (
        <aside className={`sidebar${collapsed ? ' collapsed' : ''}${open ? ' open' : ''}`} id="sidebar">
            <SidebarLogo role={role} onClose={onClose} />
            <nav className="sidebar-nav">
                {items.map(([path, icon, label]) => (
                    <Link key={path} to={path} className={`nav-item${current === path ? ' active' : ''}`}>
                        <Icon name={icon} /> {label}
                    </Link>
                ))}
            </nav>
            {role === 'vendor' ? (
                <a href="/login" className="logout-btn logout" onClick={logout}><Icon name="logout" /> Logout</a>
            ) : (
                <div className="sidebar-footer">
                    <a href="/login" className="nav-item logout" onClick={logout}><Icon name="logout" /> Logout</a>
                </div>
            )}
        </aside>
    );
}
