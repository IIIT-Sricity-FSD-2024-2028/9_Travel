import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { PATHS } from '../../routes/paths';
import { matchesNotifFilter, notificationsForRole, relativeTime } from '../../services/workflow';

const ROLE = 'support';
const S = PATHS.support;
const TABS = [['all', 'All Notifications'], ['unread', 'Unread'], ['reported issues', 'Reported Issues'], ['emergency', 'Emergency Alerts']];
const ICONS = { red: 'phone', amber: 'alert', green: 'check', blue: 'bell' };
const btn = { fontWeight: 600, padding: '8px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer' };

function colorFor(item) {
    const type = String(item.type).toLowerCase();
    if (type.includes('emergency') || type.includes('high')) return 'red';
    if (type.includes('warn') || type.includes('issue')) return 'amber';
    if (type.includes('resolved') || type.includes('check')) return 'green';
    return 'blue';
}

function targetFor(item) {
    const title = String(item.title).toLowerCase();
    if (title.includes('issue') || title.includes('ticket')) return S.reportedIssues;
    if (title.includes('emergency')) return S.emergencySupport;
    if (title.includes('resolution')) return S.resolutionUpdates;
    return S.reportedIssues;
}

/** support/notifications.html (renderSupportNotifications). */
export default function SupportNotifications() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const actions = useWorkflowActions();
    const [filter, setFilter] = useState('all');

    const all = notificationsForRole(state, ROLE);
    const unread = all.filter((n) => !(n.readBy || []).includes(ROLE));
    const text = (n) => `${n.title} ${n.message} ${n.type}`;
    const stats = [
        ['#e0f2fe', '#0284c7', 'bell', 'stat-total-alerts', unread.length, 'Total Alerts'],
        ['#fee2e2', '#ef4444', 'phone', 'stat-emergency-alerts', unread.filter((n) => /emergency|critical|high/i.test(text(n))).length, 'Emergency Alerts'],
        ['#fef3c7', '#d97706', 'alert', 'stat-issue-alerts', unread.filter((n) => /issue|support|ticket|report|warn/i.test(text(n))).length, 'Reported Issues'],
        ['#dcfce7', '#16a34a', 'checkcircle', 'stat-resolution-alerts', all.filter((n) => /resolved|check|completed|close/i.test(text(n))).length, 'Resolved Alerts'],
    ];
    const items = all.filter((item) => matchesNotifFilter(item, filter, ROLE));

    return (
        <DashboardLayout role={ROLE} page="support__notifications">
            <div className="dashboard-container">
                <div className="welcome-banner">
                    <h1>Support Notifications 🔔</h1>
                    <p>Track reported issues, resolution updates, and emergency coordination alerts in real-time.</p>
                </div>
                <div className="top-stats">
                    {stats.map(([bg, color, icon, id, value, title]) => (
                        <div className="stat-banner-card" key={id}>
                            <div className="stat-icon-wrapper" style={{ background: bg, color }}><Icon name={icon} /></div>
                            <div>
                                <div className="stat-num" id={id}>{value}</div>
                                <div className="stat-title">{title}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div className="filter-tabs-full">
                        {TABS.map(([key, label]) => (
                            <button type="button" key={key} className={`filter-tab-pill${filter === key ? ' active' : ''}`} data-filter={key} onClick={() => setFilter(key)}>{label}</button>
                        ))}
                    </div>
                </div>
                <div className="notif-list-container">
                    <div className="support-notif-top-bar">
                        <div className="notif-manager-title">
                            <Icon name="bell" style={{ color: '#0ea5e9' }} /> Notifications Manager <span style={{ background: 'var(--bg-surface, #ffffff)', color: 'var(--text-secondary, #64748b)', fontSize: 11, padding: '2px 8px', borderRadius: 99, border: '1px solid var(--border-color, #cbd5e1)', fontWeight: 700 }}>{items.length} ITEMS</span>
                        </div>
                        <div className="notif-actions-group">
                            <button type="button" className="notif-bulk-btn" onClick={actions.markAllRead} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)', transition: 'all 0.2s' }}>
                                <Icon name="check" /> Mark all as read
                            </button>
                            <button type="button" className="notif-bulk-btn delete-all-btn" onClick={actions.deleteAll} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.35)', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                                <Icon name="trash" /> Delete all
                            </button>
                        </div>
                    </div>
                    {!items.length ? (
                        <div className="notif-item-full" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-card-alt, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #94a3b8)', marginBottom: '1rem', fontSize: '1.5rem' }}>
                                <Icon name="bell" />
                            </div>
                            <div className="notif-title-full" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: '0.5rem' }}>No notifications found</div>
                            <p className="notif-desc-full" style={{ color: 'var(--text-secondary, #64748b)', margin: 0, maxWidth: 400, lineHeight: 1.5 }}>There are no notifications matching the &quot;{filter}&quot; filter.</p>
                        </div>
                    ) : items.map((item) => {
                        const isUnread = !(item.readBy || []).includes(ROLE);
                        const color = colorFor(item);
                        return (
                            <div className={`notif-item-full${isUnread ? ' unread' : ''}`} id={item.id} key={item.id}>
                                <div className={`notif-icon-circle n-${color}`}><Icon name={ICONS[color]} /></div>
                                <div className="notif-content-full">
                                    <div className="notif-header-full">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span className="notif-title-full">{item.title}</span>
                                            {isUnread && <span style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: '#ffffff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.02em' }}>New</span>}
                                        </div>
                                        <span className="notif-time-full"><Icon name="clock" /><span>{relativeTime(item.createdAt)}</span></span>
                                    </div>
                                    <p className="notif-desc-full">{item.message}</p>
                                    <div className="notif-actions-full">
                                        <button type="button" className="t-btn t-btn-primary" onClick={() => navigate(targetFor(item))} style={{ ...btn, background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: '#ffffff', border: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(14, 165, 233, 0.25)' }}>View Details</button>
                                        {isUnread
                                            ? <button type="button" className="t-btn" onClick={() => actions.markRead(item.id)} style={{ ...btn, background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', border: '1px solid rgba(14, 165, 233, 0.35)' }}>Mark as Read</button>
                                            : <button type="button" className="t-btn" disabled style={{ ...btn, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted, #64748b)', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', cursor: 'default', opacity: 0.7 }}>Read</button>}
                                        <button type="button" className="t-btn" title="Delete Notification" onClick={() => actions.deleteNotif(item.id)} style={{ ...btn, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="trash" style={{ width: 14, height: 14 }} /> Delete</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}
