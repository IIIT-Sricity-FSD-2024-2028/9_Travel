import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { important } from '../../components/importantStyle';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { PATHS } from '../../routes/paths';
import { matchesNotifFilter, relativeTime } from '../../services/workflow';

const ROLE = 'superuser';
const TABS = [['all', 'All Alerts'], ['unread', 'Unread'], ['high', 'High Priority'], ['system', 'System Alerts']];
const COLORS = { critical: ['#fee2e2', '#be123c', 'alertcircle'], warning: ['#fef3c7', '#b45309', 'alert'], info: ['#e0f2fe', '#0369a1', 'info'] };
const smallBtn = { fontWeight: 600, padding: '6px 14px', borderRadius: 6, cursor: 'pointer' };
const bulkBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' };

/**
 * superuser_alerts.html (renderSuperuserAlerts). The original rendered into the first match of
 * ".sa-alerts-container, .sa-dashboard-container" and so replaced the page header and tabs;
 * the list is rendered inside .sa-alerts-container as intended.
 */
export default function SuperuserAlerts() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const actions = useWorkflowActions();
    const [filter, setFilter] = useState('all');
    const deleted = new Set(state.deletedNotifIds || []);
    const alerts = (state.notifications || [])
        .filter((n) => !deleted.has(n.id))
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .filter((item) => matchesNotifFilter(item, filter, ROLE));

    const bulkButtons = (
        <>
            <button type="button" className="notif-bulk-btn" onClick={actions.markAllRead} style={{ ...bulkBtn, background: '#0ea5e9', color: '#ffffff', border: 'none', boxShadow: '0 2px 6px rgba(14, 165, 233, 0.3)' }}><Icon name="check" /> Mark all as read</button>
            <button type="button" className="notif-bulk-btn delete-all-btn" onClick={actions.deleteAll} style={{ ...bulkBtn, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}><Icon name="trash" /> Delete all</button>
        </>
    );

    return (
        <DashboardLayout role={ROLE} page="superuser__superuser_alerts">
            <div className="sa-dashboard-container sa-dashboard page-content">
                <div className="welcome-banner" ref={important({ background: 'linear-gradient(135deg, #6366f1, #c084fc)', padding: '24px 28px', borderRadius: 14, marginBottom: 20 })} style={{ color: '#fff' }}>
                    <h1 ref={important({ color: '#fff', fontSize: 22 })} style={{ margin: '0 0 6px' }}>Platform Alerts &amp; Notifications 🔔</h1>
                    <p ref={important({ color: 'rgba(255,255,255,0.9)', fontSize: 13 })} style={{ margin: 0 }}>Realtime platform events, system alerts, and unresolved issues</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
                    <div className="filter-tabs-full" style={{ display: 'flex', gap: '0.75rem', background: 'var(--bg-card-alt, #f1f5f9)', padding: '0.375rem', borderRadius: 999, width: 'fit-content', marginBottom: 0 }}>
                        {TABS.map(([key, label]) => (
                            <button type="button" key={key} className={`filter-tab-pill${filter === key ? ' active' : ''}`} data-filter={key} onClick={() => setFilter(key)}>{label}</button>
                        ))}
                    </div>
                    <div className="notif-bulk-bar" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{bulkButtons}</div>
                </div>
                <div className="sa-alerts-container sa-section-card" style={{ padding: 20, borderRadius: 12 }}>
                    <div className="sa-alerts-top-bar" style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', marginBottom: 16, background: 'var(--bg-card-alt, #1e293b)', borderRadius: 12, border: '1px solid var(--border-color, #334155)', flexWrap: 'wrap', gap: 12, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                            <Icon name="bell" style={{ color: '#0ea5e9' }} /> Notifications Manager ({alerts.length} items)
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{bulkButtons}</div>
                    </div>
                    {!alerts.length ? (
                        <div className="alert-card info" style={{ padding: 24, background: 'var(--bg-surface, #1e293b)', borderRadius: 10, border: '1px solid var(--border-color, #334155)' }}>
                            <div className="alert-icon"><Icon name="info" /></div>
                            <div className="alert-content">
                                <div className="alert-title" style={{ fontWeight: 700, color: 'var(--text-primary, #fff)' }}>No alerts found</div>
                                <div className="alert-desc" style={{ color: 'var(--text-secondary, #94a3b8)' }}>There are no platform alerts matching &quot;{filter}&quot;.</div>
                            </div>
                        </div>
                    ) : alerts.map((alert) => {
                        const isUnread = !(alert.readBy || []).includes(ROLE);
                        const level = /critical|emergency|high/i.test(alert.type) ? 'critical' : /warn|medium/i.test(alert.type) ? 'warning' : 'info';
                        const [bg, fg, icon] = COLORS[level];
                        return (
                            <div className={`alert-card ${level}`} key={alert.id} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 10, border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-surface, #fff)' }}>
                                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                    <div className="alert-icon" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: fg, flexShrink: 0 }}><Icon name={icon} /></div>
                                    <div className="alert-content">
                                        <div className="alert-title" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #0f172a)' }}>
                                            {alert.title} {isUnread && <span style={{ background: '#0ea5e9', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 99, marginLeft: 6 }}>New</span>}
                                        </div>
                                        <div className="alert-desc" style={{ fontSize: 13, color: 'var(--text-secondary, #475569)', marginTop: 2 }}>{alert.message}</div>
                                        <div className="alert-meta" style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 4, display: 'flex', gap: 12 }}>
                                            <span><Icon name="clock" /> {relativeTime(alert.createdAt)}</span>
                                            {alert.tripId && <span><Icon name="server" /> {alert.tripId}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button type="button" className="sa-btn-sm" onClick={() => navigate(alert.tripId ? `${PATHS.superuser.viewTrip}?id=${encodeURIComponent(alert.tripId)}` : PATHS.superuser.dashboard)} style={{ ...smallBtn, background: '#2563eb', color: '#ffffff', border: 'none' }}>View</button>
                                    {isUnread
                                        ? <button type="button" className="sa-btn-sm" onClick={() => actions.markRead(alert.id)} style={{ ...smallBtn, background: '#0ea5e9', color: '#ffffff', border: 'none' }}>Mark Read</button>
                                        : <button type="button" className="sa-btn-sm" disabled style={{ ...smallBtn, background: 'var(--bg-card-alt, #334155)', color: 'var(--text-primary, #ffffff)', border: '1px solid var(--border-color, #475569)', opacity: 0.7 }}>Read</button>}
                                    <button type="button" className="sa-btn-sm" title="Delete Notification" onClick={() => actions.deleteNotif(alert.id)} style={{ ...smallBtn, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.35)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="trash" /> Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}
