import { useState } from 'react';
import Icon from '../icons/Icon';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useUI } from '../../context/UIContext';
import { useOperation } from '../../hooks/usePortal';
import {
    MESSAGE_ROLES, ROLE_LABELS, messageTrips, messagesForTrip, relativeTime, selectedMessageTrip, sendMemberMessage, setStoredMessageTripId,
} from '../../services/workflow';

/** Recipient dropdown options (recipientOptionsHTML). */
export function RecipientOptions({ role }) {
    return MESSAGE_ROLES.filter((r) => r === 'all' || r !== role).map((r) => (
        <option key={r} value={r}>{r === 'all' ? 'All Members' : ROLE_LABELS[r]}</option>
    ));
}

/**
 * Shared state + send handler for every message centre (traveler, support, embedded panels).
 * The selected trip is remembered in localStorage like the original (dd_message_trip_id).
 */
export function useMessageCenter(role) {
    const state = useWorkflowState();
    const { toast } = useUI();
    const operate = useOperation();
    const [selectedId, setSelectedId] = useState('');
    const [recipient, setRecipient] = useState('all');
    const [body, setBody] = useState('');

    const trips = messageTrips(state);
    const trip = selectedMessageTrip(state, selectedId);
    const tripId = trip?.id || '';
    const messages = messagesForTrip(state, tripId);

    const selectTrip = (id) => {
        setStoredMessageTripId(id);
        setSelectedId(id);
    };

    const send = () => {
        const text = body.trim();
        if (!tripId || !text) {
            toast('Select a trip and enter a message first.', 'error');
            return;
        }
        operate(() => {
            setStoredMessageTripId(tripId);
            sendMemberMessage({ tripId, toRole: recipient || 'all', body: text, fromRole: role });
            setBody('');
            toast('Message sent and notified to the selected members.', 'success');
        });
    };

    const onKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            send();
        }
    };

    return { state, trips, trip, tripId, messages, recipient, setRecipient, body, setBody, selectTrip, send, onKeyDown };
}

/** Compact chat rows used by the embedded panel (compactMessageRowsHTML). */
function CompactRows({ messages, role }) {
    if (!messages.length) {
        return <div style={{ padding: 14, color: 'var(--text-secondary, #64748b)', textAlign: 'center' }}>No messages for this trip yet.</div>;
    }
    return messages.slice(0, 8).map((message) => {
        const own = message.fromRole === role;
        return (
            <div key={message.id} style={{ display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                <div style={{ maxWidth: '78%', padding: '10px 12px', borderRadius: 8, background: own ? '#2563eb' : 'var(--bg-surface, #f1f5f9)', color: own ? '#fff' : 'var(--text-primary, #0f172a)', border: `1px solid ${own ? '#2563eb' : 'var(--border-color, #e2e8f0)'}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: own ? '#fff' : 'var(--text-primary, #0f172a)' }}>{message.fromName} - {ROLE_LABELS[message.fromRole] || message.fromRole}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.45 }}>{message.body}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, color: own ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary, #64748b)' }}>{relativeTime(message.createdAt)}</div>
                </div>
            </div>
        );
    });
}

/**
 * "Member Messages" panel appended to the Tour Updates, Vendor Service Updates and
 * Travel Partner Requests pages (renderEmbeddedMemberMessages).
 */
export default function MemberMessagesPanel({ role }) {
    const center = useMessageCenter(role);
    const fieldStyle = { border: '1px solid var(--border-color, #cbd5e1)', borderRadius: 8, padding: '10px 12px', background: 'var(--bg-card-alt, #f8fafc)', color: 'var(--text-primary, #0f172a)', outline: 'none' };
    return (
        <div id="dd-member-messages">
            <div data-dd-message-center style={{ marginTop: 24, background: 'var(--bg-surface, #fff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.08)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: 'var(--bg-surface, #fff)' }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: 0 }}>Member Messages</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', margin: '4px 0 0' }}>{center.tripId || 'Select a trip'}</p>
                    </div>
                    <select data-dd-message-trip value={center.tripId} onChange={(e) => center.selectTrip(e.target.value)} style={{ ...fieldStyle, minWidth: 220 }} aria-label="Trip">
                        {center.trips.map((t) => <option key={t.id} value={t.id}>{t.id} - {t.title}</option>)}
                    </select>
                </div>
                <div style={{ padding: '16px 18px', maxHeight: 280, overflow: 'auto', background: 'var(--bg-card-alt, #f8fafc)', color: 'var(--text-primary, #0f172a)' }}>
                    <CompactRows messages={center.messages} role={role} />
                </div>
                <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'minmax(140px,180px) 1fr auto', gap: 10, borderTop: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-surface, #fff)' }}>
                    <select data-dd-message-recipient value={center.recipient} onChange={(e) => center.setRecipient(e.target.value)} style={fieldStyle} aria-label="Recipient">
                        <RecipientOptions role={role} />
                    </select>
                    <input data-dd-message-input type="text" placeholder="Type message..." value={center.body} onChange={(e) => center.setBody(e.target.value)} onKeyDown={center.onKeyDown} style={{ ...fieldStyle, minWidth: 0 }} aria-label="Message" />
                    <button type="button" className="btn" onClick={center.send} style={{ whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>
                        <Icon name="send" /> Send
                    </button>
                </div>
            </div>
        </div>
    );
}
