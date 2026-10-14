import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout, { useHeaderSearch } from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { NoMatchingSchedules, matchesScheduleFilter } from '../../components/workflow/ScheduleFilters';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { formatDateRange, getGuideTrips, scheduleStats } from '../../services/workflow';

const G = PATHS.guide;
const isDone = (trip) => trip.status === 'completed' || trip.guideStatus === 'Completed';

function ScheduleCard({ trip, navigate }) {
    const isCompleted = isDone(trip);
    const isOngoing = !isCompleted && (trip.status === 'ongoing' || trip.guideStatus === 'In Progress');
    const statusBadge = isCompleted ? 'COMPLETED' : isOngoing ? 'ONGOING' : 'UPCOMING';
    const badgeClass = isCompleted ? 'badge-gray' : isOngoing ? 'badge-green' : 'badge-blue';
    const stats = scheduleStats(trip);
    const percent = isCompleted ? 100 : (isOngoing ? (50 + Math.round(stats.percent * 0.5)) : (trip.guideStatus === 'Accepted' ? 25 : 0));
    const detail = `${isOngoing ? G.scheduleOngoing : G.scheduleUpcoming}?trip=${trip.id}`;

    return (
        <div className="schedule-card-high">
            <div className="sc-main-row">
                <div className="sc-content-left">
                    <div className="sc-badges">
                        <span className={`badge ${badgeClass}`}>{statusBadge}</span>
                        <span className="badge text-gray-500 bg-gray-50">{trip.id}</span>
                        <span className="badge text-gray-500 bg-gray-50">{trip.travelersCount || 1} Travelers</span>
                    </div>
                    <h3 className="sc-title">{trip.title}</h3>
                    <p className="sc-traveler">{trip.travelerName}</p>
                    <div className="sc-meta-row">
                        <span className="meta-item"><Icon name="mappin" /> {trip.destination}</span>
                        <span className="meta-item"><Icon name="calendar" /> {formatDateRange(trip)}</span>
                    </div>
                </div>
                {!isCompleted && (
                    <div className="sc-actions-right">
                        <button type="button" className="btn-view-schedule" onClick={() => navigate(detail)}><Icon name="eye" /><span>View Schedule</span></button>
                        <button type="button" className="btn-message" onClick={() => navigate(G.tourUpdates)}><Icon name="message" /><span>Update</span></button>
                    </div>
                )}
            </div>
            <div className="sc-ribbons-section">
                <div className="sc-ribbon-teal">Tour Assignment: {trip.title} ({trip.guideStatus || 'Accepted'})</div>
                <div className="progress-container-full">
                    <div className="p-label-row"><span className="p-label">Tour Progress</span><span className="p-value">{percent}%</span></div>
                    <div className="p-bar-full"><div className="p-fill-blue" style={{ width: `${percent}%`, ...(isCompleted ? { background: '#10b981' } : {}) }} /></div>
                </div>
                {isCompleted ? (
                    <div className="flex justify-between items-center mt-2">
                        <div className="sc-ribbon-green" style={{ margin: 0, background: '#064e3b', color: '#34d399', fontWeight: 600, padding: '6px 12px', borderRadius: 6 }}>
                            Current Activity: Tour completed
                        </div>
                        <button type="button" className="btn-history-card" onClick={() => navigate(`${G.scheduleCompleted}?trip=${trip.id}`)}>
                            <Icon name="checkcircle" />
                            <div style={{ textAlign: 'left', fontSize: 11, lineHeight: 1.2 }}>View<br />History</div>
                        </button>
                    </div>
                ) : (
                    <div className="sc-ribbon-green">Current Activity: {trip.currentActivity || (isOngoing ? 'Tour in progress' : 'Ready for tour departure')}</div>
                )}
            </div>
        </div>
    );
}

/** guide/traveler_schedules.html (renderGuideSchedules + setupScheduleFilters). */
export default function GuideTravelerSchedules() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const headerQuery = useHeaderSearch();
    const [showHistory, setShowHistory] = useState(false);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');

    const trips = getGuideTrips(state).filter((trip) => trip.guide && ['Accepted', 'In Progress', 'Completed'].includes(trip.guideStatus));
    const assignedTravelers = trips.reduce((sum, t) => sum + (Number(t.travelersCount) || 1), 0);
    const activeTours = trips.filter((trip) => trip.status === 'ongoing' || trip.guideStatus === 'In Progress').length;
    const upcomingTours = trips.filter((trip) => trip.status !== 'ongoing' && trip.status !== 'completed' && trip.guideStatus === 'Accepted').length;
    const completedTours = trips.filter(isDone).length;
    const hasActiveTours = trips.some((trip) => !isDone(trip));

    let displayTrips = trips;
    if (hasActiveTours) displayTrips = showHistory ? trips.filter(isDone) : trips.filter((trip) => !isDone(trip));

    const search = query || headerQuery;
    const visible = displayTrips.filter((trip) => {
        const done = isDone(trip);
        const ongoing = !done && (trip.status === 'ongoing' || trip.guideStatus === 'In Progress');
        const badge = `${done ? 'COMPLETED' : ongoing ? 'ONGOING' : 'UPCOMING'} ${trip.id} ${trip.travelersCount || 1} Travelers`;
        const text = `${badge} ${trip.title} ${trip.travelerName} ${trip.destination} ${formatDateRange(trip)} ${trip.guideStatus} ${trip.currentActivity || ''}`;
        return matchesScheduleFilter({ text, badge }, search, status);
    });

    const stats = [
        [assignedTravelers, 'text-purple-premium', 'Assigned Travelers'],
        [activeTours, 'text-green-premium', 'Active Tours'],
        [upcomingTours, 'text-blue-premium', 'Upcoming Tours'],
        [completedTours, 'text-purple-premium', 'Tours Completed'],
    ];

    return (
        <DashboardLayout role="guide" page="guide__traveler_schedules">
            <div className="page-content" id="guide-schedules">
                <div className="welcome-banner">
                    <h1 className="text-2xl font-bold text-white mb-2">My Traveler Schedules 📅</h1>
                    <p className="text-white opacity-90">View schedules for your assigned travelers</p>
                </div>
                <div className="stats-grid-4">
                    {stats.map(([value, color, label]) => (
                        <div className="stat-card-premium" key={label}>
                            <div className={`stat-number-premium ${color}`}>{value}</div>
                            <div className="stat-label-premium">{label}</div>
                        </div>
                    ))}
                </div>
                <div className="filter-bar-high">
                    <div className="f-search">
                        <Icon name="search" />
                        <input type="text" placeholder="Search by traveler name, trip name, or ID..." value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    <div className="f-actions" style={{ display: 'flex', gap: 8 }}>
                        {hasActiveTours && completedTours > 0 && (
                            <button type="button" id="history-toggle-btn" className={`btn-card ${showHistory ? 'primary' : 'secondary'}`} onClick={() => setShowHistory((v) => !v)} style={{ borderRadius: 8, fontWeight: 600, padding: '6px 12px', marginRight: 8 }}>
                                <Icon name="clock" /> History
                            </button>
                        )}
                        <Icon name="filter" className="f-icon" />
                        <select className="f-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
                <div className="schedule-list-high">
                    {!displayTrips.length
                        ? <div className="card" style={{ padding: 24 }}>No guide schedules yet. Accept an assignment to view tour schedules.</div>
                        : visible.length ? visible.map((trip) => <ScheduleCard key={trip.id} trip={trip} navigate={navigate} />) : <NoMatchingSchedules />}
                </div>
            </div>
        </DashboardLayout>
    );
}
