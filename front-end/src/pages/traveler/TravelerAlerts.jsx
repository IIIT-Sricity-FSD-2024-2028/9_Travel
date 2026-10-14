import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { PATHS } from '../../routes/paths';
import { matchesNotifFilter, notificationsForRole, relativeTime } from '../../services/workflow';

const ROLE = 'traveler';

function rowClassFor(item) {
    const type = String(item.type).toLowerCase();
    if (type.includes('warn') || type.includes('high')) return 'warning';
    if (type.includes('accept') || type.includes('resolved')) return 'success';
    return 'info';
}

/** traveler_alerts.html (renderTravelerAlerts). */
export default function TravelerAlerts() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const actions = useWorkflowActions();
    const [filter, setFilter] = useState('all');

    const all = notificationsForRole(state, ROLE);
    const unreadCount = all.filter((a) => !(a.readBy || []).includes(ROLE)).length;
    const items = all.filter((item) => matchesNotifFilter(item, filter, ROLE));
    const tabs = [
        { key: 'all', label: `All Alerts (${all.length})` },
        { key: 'unread', label: `Unread (${unreadCount})` },
        { key: 'Warnings', label: 'Warnings' },
    ];

    return (
        <DashboardLayout role={ROLE} page="traveler__traveler_alerts">
            <div className="page-content">
                <div style={{ marginBottom: 20 }}>
                    <h1>Alerts &amp; Notifications</h1>
                    <p style={{ color: 'var(--text-secondary, #64748b)' }}>Stay updated with important trip information</p>
                </div>
                <div className="filter-tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div className="filter-tabs-left" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {tabs.map((tab) => (
                            <button type="button" key={tab.key} className={`filter-pill${filter === tab.key ? ' active' : ''}`} onClick={() => setFilter(tab.key)}>{tab.label}</button>
                        ))}
                    </div>
                    <div className="notif-bulk-bar">
                        <button type="button" className="notif-bulk-btn" onClick={actions.markAllRead}><Icon name="check" /> Mark all as read</button>
                        <button type="button" className="notif-bulk-btn delete-all-btn" onClick={actions.deleteAll}><Icon name="trash" /> Delete all</button>
                    </div>
                </div>
                <div className="alerts-container">
                    {!items.length ? (
                        <div className="alert-row info" style={{ padding: 24, textAlign: 'center' }}>
                            <div className="a-content">
                                <div className="a-title" style={{ marginBottom: 4 }}>No alerts found</div>
                                <div className="a-desc">There are no alerts matching the &quot;{filter}&quot; filter.</div>
                            </div>
                        </div>
                    ) : items.map((item) => {
                        const isUnread = !(item.readBy || []).includes(ROLE);
                        const rowClass = rowClassFor(item);
                        return (
                            <div className={`alert-row ${rowClass}`} key={item.id}>
                                <div className="a-icon"><Icon name={rowClass === 'success' ? 'check' : rowClass === 'warning' ? 'alert' : 'bell'} /></div>
                                <div className="a-content">
                                    <div className="a-title">{item.title} {isUnread && <span className="a-badge">New</span>}</div>
                                    <div className="a-desc">{item.message}</div>
                                    <div className="a-time"><Icon name="clock" /> {relativeTime(item.createdAt)}{item.tripId ? ` - ${item.tripId}` : ''}</div>
                                </div>
                                <div className="a-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button type="button" className="a-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate(PATHS.traveler.progress)}>View</button>
                                    {isUnread && <button type="button" className="close-btn" title="Mark as Read" onClick={() => actions.markRead(item.id)}><Icon name="check" /></button>}
                                    <button type="button" className="close-btn delete-btn" title="Delete Notification" style={{ border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, background: 'rgba(239,68,68,0.08)' }} onClick={() => actions.deleteNotif(item.id)}><Icon name="trash" /> Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button type="button" className="load-more-btn" onClick={() => navigate(PATHS.traveler.alerts)}>Load More Alerts</button>
            </div>
        </DashboardLayout>
    );
}
