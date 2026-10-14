import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { RecipientOptions, useMessageCenter } from '../../components/workflow/MemberMessages';
import {
    ROLE_LABELS, initialsFor, latestMessagePreview, markAllMessagesAsRead, messagesForTrip, relativeTime,
} from '../../services/workflow';

const ROLE = 'traveler';

/** Full chat rows (chatRowsHTML, default mode). */
export function ChatRows({ messages, role }) {
    if (!messages.length) {
        return <div className="message-wrapper left"><div className="message-bubble">No messages for this trip yet.</div><div className="message-time">Now</div></div>;
    }
    return messages.slice().reverse().map((message) => {
        const own = message.fromRole === role;
        const label = `${ROLE_LABELS[message.fromRole] || message.fromRole} - ${message.fromName}`;
        return (
            <div className={`message-wrapper ${own ? 'right' : 'left'}`} key={message.id}>
                <div className="message-bubble"><strong style={{ display: 'block', fontSize: '0.72rem', marginBottom: 4 }}>{label}</strong>{message.body}</div>
                <div className="message-time">{relativeTime(message.createdAt)}</div>
            </div>
        );
    });
}

/** traveler_messages.html (renderTravelerMessages). */
export default function TravelerMessages() {
    const center = useMessageCenter(ROLE);
    const { state, trips, trip, tripId, messages } = center;

    return (
        <DashboardLayout role={ROLE} page="traveler__traveler_messages">
            <div className="page-content">
                <div>
                    <h1>Messages</h1>
                    <p>Chat with your guide, partner, and vendors</p>
                </div>
                <div className="chat-layout">
                    <div className="conversations-pane">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 className="pane-title" style={{ margin: 0, paddingBottom: 0, border: 'none' }}>Conversations</h3>
                            <div className="mark-read-text" role="button" tabIndex={0} onClick={() => markAllMessagesAsRead(ROLE)} style={{ cursor: 'pointer', color: '#14b8a6', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>Mark all as read</div>
                        </div>
                        <div className="conv-list">
                            {trips.length ? trips.map((item) => {
                                const count = messagesForTrip(state, item.id).length;
                                return (
                                    <div key={item.id} className={`conv-item${item.id === tripId ? ' active' : ''}`} role="button" tabIndex={0} onClick={() => center.selectTrip(item.id)}>
                                        <div className="conv-avatar">{initialsFor(item.title)}</div>
                                        <div className="conv-details">
                                            <div className="conv-top"><h4>{item.id}</h4>{count > 0 && <span className="badg-count">{count}</span>}</div>
                                            <div className="conv-role">{item.title}</div>
                                            <p className="conv-preview">{latestMessagePreview(state, item)}</p>
                                            <div className="conv-time">{relativeTime(item.updatedAt)}</div>
                                        </div>
                                    </div>
                                );
                            }) : <div className="conv-item"><div className="conv-details"><div className="conv-role">No active trips</div></div></div>}
                        </div>
                    </div>
                    <div className="chat-pane" data-dd-message-center>
                        <div className="chat-header">
                            <div className="chat-avatar">{initialsFor(trip?.title || 'Trip')}</div>
                            <div className="chat-info"><h3>{trip?.title || 'Trip Messages'}</h3><p>{tripId || 'No active trip selected'}</p></div>
                        </div>
                        <div className="chat-body"><ChatRows messages={messages} role={ROLE} /></div>
                        <div className="chat-footer">
                            <select className="chat-input" style={{ maxWidth: 170 }} disabled={!trip} value={center.recipient} onChange={(e) => center.setRecipient(e.target.value)} aria-label="Recipient">
                                <RecipientOptions role={ROLE} />
                            </select>
                            <input type="text" className="chat-input" placeholder={trip ? 'Type your message...' : 'No active trip available to message'} disabled={!trip} value={center.body} onChange={(e) => center.setBody(e.target.value)} onKeyDown={center.onKeyDown} aria-label="Message" />
                            <button type="button" className="chat-send-btn" disabled={!trip} style={!trip ? { opacity: 0.5, cursor: 'not-allowed' } : undefined} onClick={center.send}><Icon name="send" /> Send</button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
