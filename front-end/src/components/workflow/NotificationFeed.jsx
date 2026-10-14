import { useState } from 'react';
import Icon from '../icons/Icon';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { matchesNotifFilter, notificationsForRole, relativeTime } from '../../services/workflow';

const ICONS = { red: 'alert', green: 'check', amber: 'clipboard', blue: 'bell' };

/**
 * Tabs + bulk bar + ".notif-list-container" list shared by the guide, vendor and support
 * notification pages (render{Guide,Vendor,Support}Notifications).
 *  - tabs:        tab labels; the first one is "all"
 *  - isAmber:     type matcher for the amber "clipboard" icon (role specific)
 *  - renderActions(item, isUnread, actions): action buttons of a row
 */
export default function NotificationFeed({ role, tabs, isAmber, renderActions, header = null }) {
    const state = useWorkflowState();
    const actions = useWorkflowActions();
    const [filter, setFilter] = useState('all');
    const all = notificationsForRole(state, role);
    const items = all.filter((item) => matchesNotifFilter(item, filter, role));
    const keyFor = (label, index) => (index === 0 ? 'all' : label);
    const colorFor = (item) => {
        const type = String(item.type).toLowerCase();
        if (type.includes('warn') || type.includes('high')) return 'red';
        if (type.includes('accept') || type.includes('resolved')) return 'green';
        if (isAmber(type)) return 'amber';
        return 'blue';
    };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="filter-tabs-full">
                    {tabs.map((label, index) => (
                        <button type="button" key={label} className={`filter-tab-pill${filter === keyFor(label, index) ? ' active' : ''}`} onClick={() => setFilter(keyFor(label, index))}>{label}</button>
                    ))}
                </div>
                <div className="notif-bulk-bar">
                    <button type="button" className="notif-bulk-btn" onClick={actions.markAllRead}><Icon name="check" /> Mark all as read</button>
                    <button type="button" className="notif-bulk-btn delete-all-btn" onClick={actions.deleteAll}><Icon name="trash" /> Delete all</button>
                </div>
            </div>
            {header}
            <div className="notif-list-container">
                {!items.length ? (
                    <div className="notif-item-full" style={{ padding: '2.5rem', textAlign: 'center' }}>
                        <div className="notif-content-full">
                            <div className="notif-title-full" style={{ fontSize: '1.1rem', color: 'var(--text-primary, #0f172a)', marginBottom: '0.5rem' }}>No notifications found</div>
                            <p className="notif-desc-full" style={{ color: 'var(--text-secondary, #64748b)' }}>There are no notifications matching the &quot;{filter}&quot; filter.</p>
                        </div>
                    </div>
                ) : items.map((item) => {
                    const isUnread = !(item.readBy || []).includes(role);
                    const color = colorFor(item);
                    return (
                        <div className={`notif-item-full${isUnread ? ' unread' : ''}`} id={item.id} key={item.id}>
                            <div className={`notif-icon-circle n-${color}`}><Icon name={ICONS[color]} /></div>
                            <div className="notif-content-full">
                                <div className="notif-header-full">
                                    <span className="notif-title-full">{item.title}</span>
                                    <span className="notif-time-full">{relativeTime(item.createdAt)}</span>
                                </div>
                                <p className="notif-desc-full">{item.message}</p>
                                <div className="notif-actions-full" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                    {renderActions(item, isUnread, actions)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

export const deleteBtnStyle = { color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', display: 'inline-flex', alignItems: 'center', gap: 4 };
