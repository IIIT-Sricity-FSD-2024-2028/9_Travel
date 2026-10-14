import { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import MemberMessagesPanel from '../../components/workflow/MemberMessages';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useGo, useOperation } from '../../hooks/usePortal';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { getPartnerNotificationItems, sendMemberMessage } from '../../services/workflow';

const FILTERS = [
    ['all', 'All Requests', 'filter-badge-all'],
    ['Traveler Actions', 'Traveler Actions', 'filter-badge-traveler'],
    ['Guide Requests', 'Guide Requests', 'filter-badge-guide'],
    ['Urgent', 'Urgent', 'filter-badge-urgent'],
    ['Pending Review', 'Pending Review', 'filter-badge-pending'],
];
const TEMPLATES = [
    ['Reviewing Request', 'We have received your request and our travel team is reviewing it immediately.'],
    ['Change Approved', 'Your itinerary change has been approved and updated in the system schedule.'],
    ['Coordinated with Guide', 'We have coordinated with your tour guide and vendor for this request.'],
];
const templateBtn = { fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--bg-card-alt, #f8fafc)', cursor: 'pointer' };

/** Quick Response modal (#quickReplyModal). */
function QuickReplyModal({ target, onClose }) {
    const { toast } = useUI();
    const operate = useOperation();
    const [body, setBody] = useState('');
    if (!target) return null;

    const submit = () => {
        const text = body.trim();
        if (!text) { toast('Please enter a message response.', 'warning'); return; }
        operate(() => {
            sendMemberMessage({ tripId: target.tripId, fromRole: 'partner', toRole: target.toRole, body: text });
            onClose();
            toast(`Response sent to ${target.name} successfully.`, 'success');
        });
    };

    return (
        <div id="quickReplyModal" role="dialog" aria-modal="true" style={{ display: 'flex', position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: 'var(--bg-surface, #fff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, margin: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.2)', position: 'relative', animation: 'modalPop 0.25s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 id="replyModalTitle" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: 0 }}>Message {target.name}</h3>
                    <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #64748b)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                </div>
                <p id="replyModalSubtitle" style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', margin: '0 0 16px' }}>Trip: {target.tripId} • Recipient: {target.name} ({target.toRole})</p>
                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #64748b)', display: 'block', marginBottom: 6 }}>Quick Templates:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {TEMPLATES.map(([label, text]) => <button type="button" key={label} style={templateBtn} onClick={() => setBody(text)}>{label}</button>)}
                    </div>
                </div>
                <textarea id="replyModalBody" rows="4" placeholder="Type your response message..." value={body} onChange={(e) => setBody(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border-color, #cbd5e1)', borderRadius: 10, padding: 12, fontSize: 14, color: 'var(--text-primary, #0f172a)', background: 'var(--bg-surface, #fff)', fontFamily: 'inherit', resize: 'vertical', marginBottom: 20 }} />
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 999, border: '1.5px solid var(--border-color, #cbd5e1)', background: 'transparent', color: 'var(--text-secondary, #475569)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button type="button" id="replyModalSendBtn" onClick={submit} style={{ padding: '10px 24px', borderRadius: 999, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Send Message</button>
                </div>
            </div>
        </div>
    );
}

/** travelPartner_notifications.html – "Requests & Actions" (renderPartnerNotifications). */
export default function PartnerNotifications() {
    const state = useWorkflowState();
    const actions = useWorkflowActions();
    const go = useGo();
    const [filter, setFilter] = useState('all');
    const [reply, setReply] = useState(null);

    const all = getPartnerNotificationItems(state);
    const unread = all.filter((item) => item.isUnread);
    const inCat = (cat) => (item) => item.categories.includes(cat);
    const stats = [
        ['stat-blue', 'alert', 'stat-cancellations', unread.filter(inCat('Cancellations')).length, 'Cancellations'],
        ['stat-green', 'edit', 'stat-itinerary-mods', unread.filter(inCat('Itinerary Mods')).length, 'Itinerary Mods'],
        ['stat-purple', 'message', 'stat-messages', unread.filter(inCat('Messages')).length, 'Messages'],
        ['stat-orange', 'clipboard', 'stat-special-requests', unread.filter((i) => i.categories.includes('Special Requests') || i.type === 'New Request').length, 'Special Requests'],
    ];
    const badgeCount = (key) => (key === 'all' ? unread.length : unread.filter(inCat(key)).length);
    const items = filter === 'all' ? all : all.filter(inCat(filter));

    const runAction = (act) => {
        switch (act.action) {
        case 'quick-reply': setReply({ tripId: act.tripId, name: act.recipientName || 'Traveler', toRole: act.toRole || 'traveler' }); break;
        case 'route': go(act.target); break;
        case 'accept-trip': actions.acceptTrip(act.tripId); break;
        case 'reject-trip': actions.rejectTrip(act.tripId); break;
        case 'accept-trip-cancellation': actions.acceptCancellation(act.tripId); break;
        case 'reject-trip-cancellation': actions.declineCancellation(act.tripId); break;
        case 'approve-itinerary': actions.approveItinerary(act.tripId); break;
        case 'ack-update': actions.ackUpdate(); break;
        case 'send-trip-to-support': actions.sendToSupport(act.tripId); break;
        default: break;
        }
    };

    return (
        <DashboardLayout role="partner" page="travelPartner__travelPartner_notifications">
            <div className="page-content">
                <div className="page-header">
                    <div className="flex items-center gap-2 mb-1">
                        <div><Icon name="bell" /></div>
                        <h1 className="text-2xl font-bold text-gray-900">Requests &amp; Actions</h1>
                    </div>
                    <p className="text-sm text-gray-500">Manage manual actions and guest requests</p>
                </div>
                <div className="top-stats">
                    {stats.map(([cls, icon, id, value, title]) => (
                        <div className={`stat-banner-card ${cls}`} key={id}>
                            <div className="stat-icon-wrapper"><Icon name={icon} /></div>
                            <div>
                                <div className="stat-num" id={id}>{value}</div>
                                <div className="stat-title">{title}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div className="filter-line" id="notif-filters" style={{ marginBottom: 0 }}>
                        <div className="text-sm text-gray-500 font-semibold mr-2 flex items-center gap-1"><Icon name="filter" /> Filter:</div>
                        {FILTERS.map(([key, label, badgeId]) => (
                            <div key={key} role="button" tabIndex={0} className={`filter-btn${filter === key ? ' active' : ''}`} data-filter={key} onClick={() => setFilter(key)}>
                                {label} <span className="filter-badge" id={badgeId}>{badgeCount(key)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="notif-bulk-bar">
                        <button type="button" className="notif-bulk-btn" onClick={actions.markAllRead}><Icon name="check" /> Mark all as read</button>
                        <button type="button" className="notif-bulk-btn delete-all-btn" onClick={actions.deleteAll}><Icon name="trash" /> Delete all</button>
                    </div>
                </div>
                <div className="requests-list" id="requests-list">
                    {!items.length ? (
                        <div className="card p-8 text-center" style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '1rem', background: 'var(--bg-surface, #fff)', marginTop: 12 }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>No requests found</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)' }}>There are no pending requests matching &quot;{filter === 'all' ? 'All Requests' : filter}&quot;.</div>
                        </div>
                    ) : items.map((item) => (
                        <div className="notif-card" id={item.id} key={item.id} style={{ display: 'flex' }}>
                            <div className="notif-content">
                                <div className={`notif-icon-circle ${item.iconColor || 'blue'}`}><Icon name={item.icon || 'bell'} /></div>
                                <div className="notif-main">
                                    <div className="notif-badges">
                                        {item.priority && <span className={`badge-outline ${item.priority === 'HIGH' ? 'orange' : 'blue'}`}>{item.priority}</span>}
                                        <span className={`badge-outline ${item.badgeColor || 'blue'}`}>{item.type}</span>
                                        {item.tripId && <span className="badge-outline blue">{item.tripId}</span>}
                                    </div>
                                    <h3 className="notif-title">{item.title}</h3>
                                    <p className="notif-subtitle">{item.subtitle}</p>
                                    <div className="notif-meta">
                                        {(item.meta || []).map((m, i) => <span className="notif-meta-item" key={i}><Icon name={m.icon} /> {m.text}</span>)}
                                    </div>
                                    {item.banner && (
                                        <div className={`notif-banner ${item.banner.color || 'yellow'}`}>
                                            <strong>{item.banner.title}</strong><br />
                                            {item.banner.content}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="notif-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                                {(item.actions || []).map((act) => (
                                    <button type="button" key={`${act.action}-${act.label}`} className={`action-btn ${act.class || 'btn-secondary'}`} onClick={() => runAction(act)}>
                                        <Icon name={act.icon} /> {act.label}
                                    </button>
                                ))}
                                <button type="button" className="action-btn btn-secondary text-red-500" title="Delete Notification" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => actions.deleteNotif(item.id)}>
                                    <Icon name="trash" /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <MemberMessagesPanel role="partner" />
            </div>
            <QuickReplyModal key={reply ? `${reply.tripId}-${reply.toRole}` : 'none'} target={reply} onClose={() => setReply(null)} />
        </DashboardLayout>
    );
}
