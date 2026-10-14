import { useRef } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { RecipientOptions, useMessageCenter } from '../../components/workflow/MemberMessages';
import { ROLE_LABELS, initialsFor, latestMessagePreview, messagesForTrip, relativeTime } from '../../services/workflow';

const ROLE = 'support';
const TEMPLATES = [
    ['alert', '#06b6d4', 'Issue Acknowledgment', 'We have received your issue report for this trip and our support executive team is actively investigating it.'],
    ['users', '#0ea5e9', 'Guide & Vendor Coordination', 'We have coordinated with your assigned tour guide and vendor. They are aware and assisting now.'],
    ['checkcircle', '#10b981', 'Resolution Confirmation', 'The reported issue has been addressed and marked resolved. Please verify if everything is to your satisfaction.'],
];

/** chatRowsHTML(..., 'support') */
function SupportChatRows({ messages }) {
    if (!messages.length) {
        return <div className="msg-bubble msg-left"><div>No messages for this trip yet.</div><div className="msg-time">Now</div></div>;
    }
    return messages.slice().reverse().map((message) => {
        const own = message.fromRole === ROLE;
        return (
            <div className={`msg-bubble ${own ? 'msg-right' : 'msg-left'}`} key={message.id}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.72, marginBottom: 4 }}>{ROLE_LABELS[message.fromRole] || message.fromRole} - {message.fromName}</div>
                <div>{message.body}</div>
                <div className="msg-time">{relativeTime(message.createdAt)}</div>
            </div>
        );
    });
}

/** support/messages.html (renderSupportMessages + quick response templates). */
export default function SupportMessages() {
    const center = useMessageCenter(ROLE);
    const { state, trips, trip, tripId, messages } = center;
    const inputRef = useRef(null);

    const applyTemplate = (text) => {
        center.setBody(text);
        inputRef.current?.focus();
    };

    return (
        <DashboardLayout role={ROLE} page="support__messages">
            <div className="dashboard-container">
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #0f172a)', marginBottom: 4 }}>Support Messages</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary, #64748b)' }}>Direct multi-party communication with travelers, guides, partners, and vendors</p>
                </div>
                <div className="chat-layout">
                    <div className="chat-sidebar">
                        <div className="chat-header"><h2>Conversations</h2></div>
                        <div className="contact-list">
                            {trips.length ? trips.map((item) => {
                                const count = messagesForTrip(state, item.id).length;
                                return (
                                    <div key={item.id} className={`contact-item${item.id === tripId ? ' active' : ''}`} role="button" tabIndex={0} onClick={() => center.selectTrip(item.id)}>
                                        <div className="c-header"><span className="c-name">{item.travelerName}</span><span className="c-time">{relativeTime(item.updatedAt)}</span></div>
                                        <div className="c-role">{item.id} - {item.title}</div>
                                        <div className="c-msg">{latestMessagePreview(state, item)}</div>
                                        {count > 0 && <div className="unread-badge">{count}</div>}
                                    </div>
                                );
                            }) : <div className="contact-item"><div className="c-role">No active trips</div></div>}
                        </div>
                    </div>
                    <div className="chat-main" data-dd-message-center>
                        <div className="chat-top">
                            <div className="chat-avatar">{initialsFor(trip?.travelerName || 'T')}</div>
                            <div><div>{trip?.travelerName || 'Trip Messages'}</div><div>{tripId || 'Select a trip'}</div></div>
                        </div>
                        <div className="chat-messages"><SupportChatRows messages={messages} /></div>
                        <div className="chat-input-area">
                            <select className="chat-input" style={{ maxWidth: 170 }} value={center.recipient} onChange={(e) => center.setRecipient(e.target.value)} aria-label="Recipient">
                                <RecipientOptions role={ROLE} />
                            </select>
                            <input ref={inputRef} type="text" className="chat-input" placeholder="Type your message..." value={center.body} onChange={(e) => center.setBody(e.target.value)} onKeyDown={center.onKeyDown} aria-label="Message" />
                            <button type="button" className="btn-send" onClick={center.send}><Icon name="send" /> Send</button>
                        </div>
                    </div>
                </div>
                <div className="templates-section">
                    <h2><Icon name="message" /> Quick Response Templates</h2>
                    <div className="templates-grid">
                        {TEMPLATES.map(([icon, color, title, text]) => (
                            <div className="template-card" key={title} role="button" tabIndex={0} onClick={() => applyTemplate(text)}>
                                <div className="template-card-title"><Icon name={icon} style={{ color }} /> {title}</div>
                                <div className="template-card-text">&quot;{text}&quot;</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
