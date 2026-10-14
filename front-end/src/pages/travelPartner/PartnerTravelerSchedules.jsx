import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout, { useHeaderSearch } from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import StatusBadge from '../../components/StatusBadge';
import { AssignedTravelerRows, assignedTravelerCount } from '../../components/workflow/AssignedTravelers';
import { NoMatchingSchedules, matchesScheduleFilter } from '../../components/workflow/ScheduleFilters';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { acceptedTrips, formatDateRange, scheduleStats, statusLabel, tripDays } from '../../services/workflow';

const P = PATHS.partner;
const thStyle = { padding: 12, fontSize: 13, fontWeight: 700, color: '#475569' };

function ScheduleCard({ trip, navigate }) {
    const stats = scheduleStats(trip);
    const days = tripDays(trip);
    const done = trip.status === 'completed';
    const pct = done ? 100 : (trip.status === 'ongoing' || trip.scheduleStarted ? (50 + Math.round(stats.percent * 0.5)) : (trip.guideStatus === 'Accepted' ? 25 : 10));
    return (
        <div className="schedule-card">
            <div className="schedule-info">
                <div className="flex gap-2 mb-2">
                    <StatusBadge label={statusLabel(trip)} />
                    <span className="badge badge-blue uppercase">{days || '-'} Days</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{trip.title}</h3>
                <div className="schedule-meta mt-3">
                    <div className="meta-item"><Icon name="user" /> Traveler: {trip.travelerName}</div>
                    <div className="meta-item"><Icon name="users" /> Guide: {trip.guide?.name || 'Pending'}</div>
                    <div className="meta-item"><Icon name="truck" /> Vendor: {trip.vendor?.name || 'Pending'}</div>
                    <div className="meta-item"><Icon name="mappin" /> {trip.destination}</div>
                    <div className="meta-item"><Icon name="calendar" /> {formatDateRange(trip)}</div>
                </div>
                <div className="progress-section">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Activities Progress</span>
                        <span>{stats.completed}/{stats.total}</span>
                    </div>
                    <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${pct}%`, ...(done ? { background: '#10b981' } : {}) }} /></div>
                </div>
                {done ? (
                    <div className="flex justify-between items-center mt-4">
                        <div className="current-activity" style={{ margin: 0, background: '#064e3b', color: '#34d399', border: 'none', fontWeight: 600 }}>
                            <span style={{ background: '#10b981' }} /> Current Activity: Tour completed
                        </div>
                        <button type="button" className="btn-history-card" onClick={() => navigate(`${P.scheduleCompleted}?trip=${trip.id}`)}>
                            <Icon name="checkcircle" />
                            <div style={{ textAlign: 'left', fontSize: 11, lineHeight: 1.2 }}>View<br />History</div>
                        </button>
                    </div>
                ) : (
                    <div className="current-activity"><span /> Current Activity: {trip.currentActivity}</div>
                )}
            </div>
            {!done && (
                <div className="schedule-actions pl-8 border-l ml-6 border-gray-100">
                    <button type="button" className="btn-card primary" onClick={() => navigate(`${trip.status === 'ongoing' ? P.scheduleOngoing : P.scheduleUpcoming}?trip=${trip.id}`)}><Icon name="eye" /> View Trip Status</button>
                    <button type="button" className="btn-card secondary" onClick={() => navigate(`${P.scheduleUpcoming}?trip=${trip.id}`)}><Icon name="edit" /> Edit Schedule</button>
                </div>
            )}
        </div>
    );
}

/** travelPartner_travelerSchedules.html (renderPartnerSchedules + setupScheduleFilters). */
export default function PartnerTravelerSchedules() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const headerQuery = useHeaderSearch();
    const [showHistory, setShowHistory] = useState(false);
    const [query, setQuery] = useState('');
    const [stage, setStage] = useState('all');

    const all = acceptedTrips(state);
    const ongoing = all.filter((t) => t.status === 'ongoing' || (t.scheduleStarted && t.status !== 'completed')).length;
    const completed = all.filter((t) => t.status === 'completed').length;
    const upcoming = all.filter((t) => t.status !== 'completed' && t.status !== 'ongoing' && !t.scheduleStarted).length;
    const hasActive = all.some((t) => t.status !== 'completed');
    let trips = all;
    if (hasActive) trips = showHistory ? all.filter((t) => t.status === 'completed') : all.filter((t) => t.status !== 'completed');
    const search = query || headerQuery;
    const visible = trips.filter((trip) => {
        const badge = statusLabel(trip);
        const text = `${badge} ${tripDays(trip)} Days ${trip.title} Traveler: ${trip.travelerName} Guide: ${trip.guide?.name || 'Pending'} Vendor: ${trip.vendor?.name || 'Pending'} ${trip.destination} ${formatDateRange(trip)} ${trip.currentActivity || ''}`;
        return matchesScheduleFilter({ text, badge }, search, stage);
    });

    return (
        <DashboardLayout role="partner" page="travelPartner__travelPartner_travelerSchedules">
            <div className="page-content">
                <div className="page-header">
                    <div className="flex items-center gap-2">
                        <div><Icon name="calendar" /></div>
                        <h1 className="text-2xl font-bold text-gray-900">Traveler Schedules</h1>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">View and manage all traveler itineraries</p>
                </div>
                <div className="flex gap-4 mb-6">
                    <div className="summary-card"><h3 className="text-gray-900">{all.length}</h3><p>Total Travelers</p></div>
                    <div className="summary-card text-green-600"><h3>{ongoing}</h3><p>Ongoing Trips</p></div>
                    <div className="summary-card"><h3 className="text-blue-600">{upcoming}</h3><p>Upcoming Trips</p></div>
                    <div className="summary-card text-gray-700"><h3>{completed}</h3><p>Completed</p></div>
                </div>
                <div className="card" style={{ padding: 20, borderRadius: 16, marginBottom: 24, background: 'var(--bg-surface, #fff)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary, #0f172a)' }}>My Assigned Travelers</h2>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', margin: 0 }}>All travelers assigned to your Travel Partner management</p>
                        </div>
                        <span className="badge" id="schedules-assigned-count-badge" style={{ fontSize: 13, padding: '6px 14px', borderRadius: 99, background: '#eff6ff', color: '#1e40af', fontWeight: 700 }}>{assignedTravelerCount(state)} Assigned</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="w-full text-left border-collapse" style={{ width: '100%' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-card-alt, #f8fafc)' }}>
                                    <th style={thStyle}>Traveler Name</th>
                                    <th style={thStyle}>Contact Info</th>
                                    <th style={thStyle}>Assigned Support</th>
                                    <th style={thStyle}>Status</th>
                                </tr>
                            </thead>
                            <tbody id="schedules-assigned-travelers-tbody">
                                <AssignedTravelerRows state={state} variant="partner-schedules" />
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="filter-header">
                    <div className="search-input">
                        <Icon name="search" />
                        <input type="text" placeholder="Search by traveler name, trip name, or ID..." value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {hasActive && completed > 0 && (
                            <button type="button" id="history-toggle-btn" className={`btn-card ${showHistory ? 'primary' : 'secondary'}`} onClick={() => setShowHistory((v) => !v)} style={{ borderRadius: 8, fontWeight: 600 }}>
                                <Icon name="clock" /> History
                            </button>
                        )}
                        <select className="form-select" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">
                            <option value="all">All Stages</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
                <div id="dd-partner-schedules">
                    {!trips.length
                        ? <div className="card" style={{ padding: 24 }}>No schedules found in this view.</div>
                        : visible.length ? visible.map((trip) => <ScheduleCard key={trip.id} trip={trip} navigate={navigate} />) : <NoMatchingSchedules />}
                </div>
            </div>
        </DashboardLayout>
    );
}
