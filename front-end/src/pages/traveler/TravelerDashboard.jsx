import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { EmptyPanel } from '../../components/Loading';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import {
    allActiveTrips, formatDateRange, formatMoney, notificationsForRole, scheduleOwnerLabel, scheduleStats, scheduleStatusText,
    statusLabel, tripSchedule, tripsForCurrentUser,
} from '../../services/workflow';

export default function TravelerDashboard() {
    const state = useWorkflowState();
    const { session } = useAuth();
    const { openPaymentModal } = useUI();
    const navigate = useNavigate();

    const trips = tripsForCurrentUser(allActiveTrips(state));
    const ongoingTrips = trips.filter((t) => t.status === 'ongoing');
    const upcomingTrips = trips.filter((t) => ['requested', 'planning', 'ready'].includes(t.status));
    const alerts = notificationsForRole(state, 'traveler');
    const userTripIds = new Set(trips.map((t) => t.id));
    const messages = (state.messages || []).filter((m) => userTripIds.has(m.tripId) && (m.toRoles?.includes('all') || m.toRoles?.includes('traveler') || m.fromRole === 'traveler'));
    const unreadAlerts = alerts.filter((a) => !(a.readBy || []).includes('traveler')).length;
    const unreadMessages = messages.filter((m) => !(m.readBy || []).includes('traveler')).length;

    const currentTrip = ongoingTrips[0] || trips.find((t) => t.status === 'ready') || trips.find((t) => t.status === 'planning') || trips.find((t) => t.status === 'requested') || trips[0] || null;
    let progressPct = 0;
    if (currentTrip) {
        const stats = scheduleStats(currentTrip);
        progressPct = currentTrip.status === 'completed' ? 100 : (currentTrip.status === 'ongoing' || currentTrip.scheduleStarted ? (50 + Math.round(stats.percent * 0.5)) : (currentTrip.status === 'ready' ? 50 : (currentTrip.status === 'planning' ? 25 : 10)));
    }
    const needsPayment = currentTrip && currentTrip.paymentStatus !== 'Paid' && currentTrip.status !== 'cancelled' && currentTrip.status !== 'completed';
    const paidAwaitingStart = currentTrip && currentTrip.paymentStatus === 'Paid' && !currentTrip.scheduleStarted && currentTrip.status !== 'ongoing' && currentTrip.status !== 'completed';
    const schedule = currentTrip?.scheduleStarted ? tripSchedule(currentTrip) : [];

    const stats = [
        { cls: 'stat-blue', icon: 'plane', value: upcomingTrips.length, title: 'Upcoming Trips', to: PATHS.traveler.myTrips, link: 'View all →' },
        { cls: 'stat-green', icon: 'trendingup', value: ongoingTrips.length, title: 'Ongoing Trip', to: PATHS.traveler.progress, link: 'Track progress →' },
        { cls: 'stat-pink', icon: 'alertcircle', value: unreadAlerts, title: 'New Alerts', to: PATHS.traveler.alerts, link: 'View alerts →' },
        { cls: 'stat-orange', icon: 'message', value: unreadMessages, title: 'Messages', to: PATHS.traveler.messages, link: 'Open messages →' },
    ];

    return (
        <DashboardLayout role="traveler" page="traveler__traveler_dashboard">
            <div className="dashboard-container">
                <div className="welcome-banner">
                    <h1>Welcome back, <span data-session-name>{session.name || 'Traveler'}</span>! 👋</h1>
                    <p>Here&apos;s what&apos;s happening with your trips</p>
                </div>

                <div className="stats-grid">
                    {stats.map((s) => (
                        <div key={s.title} className={`stat-card ${s.cls}`} onClick={() => navigate(s.to)} style={{ cursor: 'pointer' }} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate(s.to); }}>
                            <div className="stat-top">
                                <span className="stat-icon"><Icon name={s.icon} /></span>
                                <span className="stat-value">{s.value}</span>
                            </div>
                            <div className="stat-bottom">
                                <div className="stat-title">{s.title}</div>
                                <Link to={s.to} className="stat-link" onClick={(e) => e.stopPropagation()}>{s.link}</Link>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bottom-grid">
                    <div>
                        <h2 className="section-title">Current Trip</h2>
                        <div className="card">
                            {!currentTrip ? (
                                <EmptyPanel message="No current trip yet. Create or request a trip to begin." />
                            ) : (
                                <>
                                    <div className="current-trip-header">
                                        <div className="trip-info">
                                            <div className="trip-icon"><Icon name="plane" /></div>
                                            <div>
                                                <div className="trip-title">{currentTrip.title}</div>
                                                <div className="trip-id">Trip ID: {currentTrip.id}</div>
                                            </div>
                                        </div>
                                        <div className="status-badge">{statusLabel(currentTrip)}</div>
                                    </div>
                                    <div className="trip-meta-grid">
                                        <div className="meta-item"><Icon name="mappin" /> {currentTrip.destination}</div>
                                        <div className="meta-item"><Icon name="calendar" /> {formatDateRange(currentTrip)}</div>
                                    </div>
                                    <div className="progress-section">
                                        <div className="progress-header"><span>Trip Progress</span><span>{progressPct}%</span></div>
                                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(100, progressPct)}%` }} /></div>
                                    </div>
                                    <div className="actions-row">
                                        {needsPayment && (
                                            <button type="button" className="t-btn t-btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800 }} onClick={() => openPaymentModal(currentTrip.id)}>
                                                <Icon name="creditcard" /> Pay Now ({formatMoney(currentTrip.budget || 1200)})
                                            </button>
                                        )}
                                        {paidAwaitingStart && (
                                            <span className="meta-chip blue" style={{ padding: '6px 12px', fontWeight: 700 }}><Icon name="clock" style={{ width: 14, height: 14 }} /> Paid • Awaiting Partner to Start</span>
                                        )}
                                        <button type="button" className="t-btn t-btn-primary" onClick={() => navigate(PATHS.traveler.tripDetails)}>View Details <Icon name="arrowright" /></button>
                                        <button type="button" className="t-btn t-btn-outline-purple" onClick={() => navigate(PATHS.traveler.messages)}><Icon name="message" /> Message Members</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <h2 className="section-title">Today&apos;s Schedule</h2>
                        <div className="card schedule-card">
                            {schedule.length ? (
                                <>
                                    <div className="timeline">
                                        {schedule.slice(0, 4).map((item) => (
                                            <div key={item.id} className={`timeline-item ${item.status === 'completed' ? 'completed' : item.status === 'in-progress' ? 'active' : 'upcoming'}`}>
                                                <div className="timeline-icon"><Icon name={item.status === 'completed' ? 'check' : item.status === 'in-progress' ? 'clock' : 'calendar'} /></div>
                                                <div className="schedule-details">
                                                    <div className="schedule-title">{item.title}</div>
                                                    <div className="schedule-time">{scheduleStatusText(item.status)} - {item.time}</div>
                                                    <div className="schedule-person">{scheduleOwnerLabel(item.owner)}: {item.updatedBy || 'Pending'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" className="btn-full-schedule" onClick={() => navigate(PATHS.traveler.schedule)}>View Full Schedule &rarr;</button>
                                </>
                            ) : (
                                <EmptyPanel message="Schedule appears after the travel partner starts the trip." />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
