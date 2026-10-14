import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowState } from '../context/WorkflowContext';
import { useAuth } from '../context/AuthContext';
import { PORTAL_NOTIFICATIONS } from '../routes/paths';
import { SEEN_NOTIFS_KEY, isNotificationForCurrentUser, setPopupHandler } from '../services/workflow';

function readSeen() {
    try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_NOTIFS_KEY) || '[]')); } catch { return new Set(); }
}

function playChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
    } catch { /* audio is optional */ }
}

/**
 * Real-time popup cards for new notifications (NotificationPopup in app.js):
 * shows unseen, unread notifications addressed to the current user for 2 seconds.
 */
export default function NotificationPopups({ role }) {
    const state = useWorkflowState();
    const { session } = useAuth();
    const navigate = useNavigate();
    const [cards, setCards] = useState([]);
    const [expanded, setExpanded] = useState(false);
    const seenRef = useRef(readSeen());

    const show = useCallback((notif) => {
        if (!notif || !notif.id || seenRef.current.has(notif.id)) return;
        if (document.hidden) return; // deferred: re-checked when the tab becomes visible
        seenRef.current.add(notif.id);
        try { sessionStorage.setItem(SEEN_NOTIFS_KEY, JSON.stringify(Array.from(seenRef.current).slice(-200))); } catch { /* ignore */ }
        setCards((list) => [notif, ...list.filter((c) => c.id !== notif.id)]);
        playChime();
        setTimeout(() => setCards((list) => list.filter((c) => c.id !== notif.id)), 2000);
    }, []);

    // Immediate popups for notifications created by actions in this tab.
    useEffect(() => {
        setPopupHandler(show);
        return () => setPopupHandler(null);
    }, [show]);

    // checkAndTriggerPopupsForCurrentPortal(): newest 3 unread notifications for this user.
    const check = useCallback(() => {
        const notifications = (state.notifications || []).filter((n) => isNotificationForCurrentUser(n, session, state));
        notifications.slice(0, 3).reverse().forEach((notif) => {
            if (!(notif.readBy || []).includes(role)) show(notif);
        });
    }, [state, session, role, show]);

    useEffect(() => { check(); }, [check]);

    useEffect(() => {
        const onVisible = () => { if (!document.hidden) setTimeout(check, 100); };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [check]);

    useEffect(() => { if (cards.length <= 1) setExpanded(false); }, [cards.length]);

    if (!cards.length) return null;
    return (
        <div id="dd-notification-popup-container" className={expanded ? 'expanded' : ''}>
            {cards.map((notif) => (
                <div
                    key={notif.id}
                    className={`dd-popup-card dd-popup-${notif.type || 'info'}`}
                    id={`dd-popup-${notif.id}`}
                    onClick={() => {
                        if (cards.length > 1 && !expanded) { setExpanded(true); return; }
                        navigate(PORTAL_NOTIFICATIONS[role]);
                    }}
                >
                    <div className="dd-popup-body">
                        <div className="dd-popup-content">
                            <div className="dd-popup-title">{notif.title || 'New Portal Notification'}</div>
                            <div className="dd-popup-message">{notif.message || notif.body || 'You have a new update in your portal.'}</div>
                        </div>
                    </div>
                    <div className="dd-popup-progress" />
                </div>
            ))}
        </div>
    );
}
