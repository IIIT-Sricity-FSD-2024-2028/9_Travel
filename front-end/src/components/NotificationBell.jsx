import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Icon from './icons/Icon';
import { useWorkflowState } from '../context/WorkflowContext';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { PORTAL_NOTIFICATIONS } from '../routes/paths';
import { PORTAL_LABELS } from '../services/session';
import {
    deleteAllNotifs, isNotificationForCurrentUser, markAllNotifsAsRead, unreadNotificationCount,
} from '../services/workflow';

const bellSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
);

/**
 * Header bell with unread dot and the "#dd-bell-dropdown-popup" dropdown
 * (NotificationPopup.initHeaderBellDropdown in app.js).
 */
export default function NotificationBell({ role }) {
    const state = useWorkflowState();
    const { session } = useAuth();
    const { confirm } = useUI();
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, right: 16 });
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    const unread = unreadNotificationCount(state, role);
    const deletedSet = new Set(state.deletedNotifIds || []);
    const notifications = (state.notifications || []).filter((item) => !deletedSet.has(item.id) && isNotificationForCurrentUser(item, session, state));
    const unreadCount = notifications.filter((item) => !(item.readBy || []).includes(role)).length;
    const actionUrl = PORTAL_NOTIFICATIONS[role];

    useLayoutEffect(() => {
        if (!open || !buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        setPosition({ top: rect.bottom + 10, right: Math.max(16, window.innerWidth - rect.right) });
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onClick = (event) => {
            if (dropdownRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
            setOpen(false);
        };
        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, [open]);

    const deleteAll = async () => {
        const ok = await confirm({ title: 'Delete All Notifications', message: 'Are you sure you want to delete all notifications for this portal?', confirmText: 'Delete All', tone: 'red' });
        if (ok) deleteAllNotifs(role);
    };

    return (
        <div className="notif-wrapper" style={{ position: 'relative' }}>
            <button
                ref={buttonRef}
                type="button"
                className="notif-btn"
                id="notif-trigger"
                title="Notifications"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-card-alt, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', color: 'var(--text-secondary, #475569)' }}
            >
                <Icon name="bell" />
                {unread > 0 && <span className="notif-dot" style={{ position: 'absolute', top: 8, right: 8, width: 9, height: 9, background: '#ef4444', borderRadius: '50%', border: '2px solid var(--bg-surface, #fff)' }} />}
            </button>
            {open && createPortal(
                <div id="dd-bell-dropdown-popup" ref={dropdownRef} className="open" style={{ top: position.top, right: position.right }}>
                    <div className="dd-bell-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card-alt, #f8fafc)' }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            🔔 Notifications {unreadCount > 0 && <span className="dd-bell-count" style={{ background: '#0ea5e9', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>{unreadCount} New</span>}
                        </h3>
                        <div className="dd-bell-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button type="button" className="dd-bell-mark-all" onClick={() => markAllNotifsAsRead(role)} style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Mark read</button>
                            <button type="button" className="dd-bell-delete-all" onClick={deleteAll} style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete all</button>
                        </div>
                    </div>
                    <div className="dd-bell-list">
                        {notifications.length > 0 ? notifications.slice(0, 8).map((n) => (
                            <Link key={n.id} to={actionUrl} onClick={() => setOpen(false)} className={`dd-bell-item ${!(n.readBy || []).includes(role) ? 'unread' : ''}`}>
                                <div className="dd-bell-item-icon">{bellSvg}</div>
                                <div className="dd-bell-item-content">
                                    <div className="dd-bell-item-title">{n.title}</div>
                                    <div className="dd-bell-item-desc">{n.message || n.body}</div>
                                    <div className="dd-bell-item-time">{n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}</div>
                                </div>
                            </Link>
                        )) : (
                            <div className="dd-bell-empty">No notifications yet for {PORTAL_LABELS[role]} Portal.</div>
                        )}
                    </div>
                    <div className="dd-bell-footer">
                        <Link to={actionUrl} onClick={() => setOpen(false)}>View All Notifications Page &rarr;</Link>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}
