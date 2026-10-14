import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useAuth } from '../../context/AuthContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { relativeTime } from '../../services/workflow';

const G = PATHS.guide;
const PAGE_SIZE = 8;

/**
 * Guide activity feed (renderGuideActivityLog). The original referenced an undefined
 * `activeSessionUser()` and never rendered; this uses the signed-in session instead.
 */
function buildActivity(state, session) {
    const activeName = String(session.name || '').trim().toLowerCase();
    const activeEmail = String(session.email || '').trim().toLowerCase();
    const guideTrips = (state.trips || []).filter((trip) => {
        if (!trip.guide) return false;
        const gName = String(trip.guide.name || '').trim().toLowerCase();
        const gEmail = String(trip.guide.email || '').trim().toLowerCase();
        if (activeEmail && gEmail && gEmail === activeEmail) return true;
        if (activeName && gName && (gName === activeName || activeName.includes(gName) || gName.includes(activeName))) return true;
        return !activeEmail && !activeName;
    });
    const completedCount = guideTrips.filter((t) => t.status === 'completed' || t.stage === 'Completed' || t.guideStatus === 'Completed').length;
    const issues = (state.issues || []).filter((issue) => guideTrips.some((t) => t.id === issue.tripId));

    const raw = [];
    guideTrips.forEach((trip) => {
        (trip.updates || []).forEach((upd) => {
            const src = String(upd.source || '').toLowerCase();
            const title = String(upd.title || '').toLowerCase();
            if (src.includes('guide') || src.includes('system') || src.includes('partner') || title.includes('assigned') || title.includes('tour') || title.includes('accepted')) {
                raw.push({ title: upd.title || 'Guide Activity', message: upd.message || `${trip.title} update`, createdAt: upd.createdAt || trip.updatedAt || trip.createdAt, tripId: trip.id, status: upd.status || 'Active' });
            }
        });
        (trip.schedule || []).forEach((sch) => {
            if (sch.status === 'completed' && (sch.updatedBy || sch.owner === 'guide')) {
                raw.push({ title: 'Tour Schedule Item Completed', message: `Completed "${sch.title}" (${sch.location || trip.destination})`, createdAt: sch.updatedAt || trip.updatedAt || trip.createdAt, tripId: trip.id, status: 'Completed' });
            }
        });
    });
    issues.forEach((iss) => {
        raw.push({ title: `Issue ${iss.status || 'Reported'}`, message: `${iss.title}: ${iss.description || ''}`, createdAt: iss.createdAt, tripId: iss.tripId, status: iss.priority || 'Warning' });
    });

    const seen = new Set();
    const activities = raw.filter((act) => {
        const key = `${act.tripId}-${act.title}-${act.message}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return { activities, completedCount, issuesCount: issues.length, totalCount: guideTrips.length };
}

const subStyle = { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 };

/** guide/activity_log.html */
export default function GuideActivityLog() {
    const state = useWorkflowState();
    const { session } = useAuth();
    const navigate = useNavigate();
    const [limit, setLimit] = useState(PAGE_SIZE);
    const { activities, completedCount, issuesCount, totalCount } = buildActivity(state, session);
    const visible = activities.slice(0, limit);

    const cards = [
        ['stat-blue', 'checkcircle', completedCount, 'Completed Tours', 'All time completed', G.scheduleCompleted],
        ['stat-green', 'message', activities.length, 'Status Updates', 'Total updates', G.tourUpdates],
        ['stat-purple', 'alert', issuesCount, 'Issues Reported', 'Reported issues', G.issueReporting],
        ['stat-orange', 'compass', totalCount, 'Total Tours', 'Assigned tours', G.assignments],
    ];

    return (
        <DashboardLayout role="guide" page="guide__activity_log">
            <div className="page-content">
                <div className="page-header">
                    <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
                    <p className="text-sm text-gray-500 mt-1">Track your recent actions and tour activities</p>
                </div>
                <div className="stat-banner">
                    {cards.map(([cls, icon, value, title, sub, to]) => (
                        <div key={title} className={`stat-banner-card ${cls}`} role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => navigate(to)}>
                            <div className="stat-icon-wrapper"><Icon name={icon} /></div>
                            <div>
                                <div className="stat-num stat-value">{value}</div>
                                <div className="stat-title">{title}</div>
                                <div className="stat-sub" style={subStyle}>{sub}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="activity-card">
                    <div className="activity-header">
                        <h2 className="text-lg font-bold text-gray-900">Recent Activity Timeline</h2>
                    </div>
                    {visible.length ? visible.map((item, index) => {
                        const st = String(item.status || item.title || '').toLowerCase();
                        const color = st.includes('warn') || st.includes('issue') ? 'amber' : st.includes('complete') || st.includes('resolved') ? 'green' : 'blue';
                        const icon = st.includes('complete') || st.includes('resolved') ? 'checkcircle' : st.includes('warn') || st.includes('issue') ? 'alert' : 'message';
                        return (
                            <div className="activity-row" key={`${item.tripId}-${index}`}>
                                <div className={`activity-icon ${color}`}><Icon name={icon} /></div>
                                <div className="activity-details">
                                    <div className="activity-title">{item.title}</div>
                                    <div className="activity-desc">{item.message}</div>
                                    <div className="activity-meta"><Icon name="clock" /> {relativeTime(item.createdAt)}</div>
                                </div>
                                <div className="tour-pill">{item.tripId}</div>
                            </div>
                        );
                    }) : (
                        <div className="activity-row">
                            <div className="activity-icon blue"><Icon name="activity" /></div>
                            <div className="activity-details">
                                <div className="activity-title">No activity logged yet</div>
                                <div className="activity-desc">Accept assigned tours or update tour schedules to generate live activity logs.</div>
                                <div className="activity-meta"><Icon name="clock" /> Fresh start</div>
                            </div>
                            <div className="tour-pill">N/A</div>
                        </div>
                    )}
                </div>
                {activities.length > limit && (
                    <button type="button" className="load-more-btn" onClick={() => setLimit((n) => n + PAGE_SIZE)}>Load More Activities</button>
                )}
            </div>
        </DashboardLayout>
    );
}
