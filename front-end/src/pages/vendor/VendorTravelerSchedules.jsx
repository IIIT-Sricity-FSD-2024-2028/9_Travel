import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout, { useHeaderSearch } from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { NoMatchingSchedules, matchesScheduleFilter } from '../../components/workflow/ScheduleFilters';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { formatDateRange, getVendorTrips, scheduleStats } from '../../services/workflow';

const V = PATHS.vendor;
const isDone = (t) => t.status === 'completed' || t.vendorStatus === 'Completed' || t.serviceStatus === 'Completed';

function describe(trip) {
    const isCompleted = isDone(trip);
    const isOngoing = !isCompleted && (trip.status === 'ongoing' || trip.vendorStatus === 'In Progress' || trip.vendorStatus === 'En Route');
    const statusText = isCompleted ? 'Completed' : (trip.serviceStatus || trip.vendorStatus || (isOngoing ? 'Ongoing' : 'Upcoming'));
    const stats = scheduleStats(trip);
    const percent = isCompleted ? 100 : (isOngoing ? (50 + Math.round(stats.percent * 0.5)) : (trip.vendorStatus === 'Accepted' ? 25 : 0));
    return { isCompleted, isOngoing, statusText, percent, serviceType: trip.vendor?.type || 'Travel Services' };
}

function ScheduleCard({ trip, navigate }) {
    const { isCompleted, isOngoing, statusText, percent, serviceType } = describe(trip);
    return (
        <div className="schedule-card">
            <div className="card-header">
                <div className="card-title-area">
                    <div className="tags">
                        <span className={`tag-pill ${isOngoing ? 'tag-ongoing' : isCompleted ? 'tag-completed' : 'tag-upcoming'}`}>{statusText}</span>
                        <span className="tag-pill tag-trip">{trip.id}</span>
                    </div>
                    <h3 className="trip-name">{trip.title}</h3>
                    <div className="traveler-name">Traveler: {trip.travelerName}</div>
                    <div className="meta-row">
                        <div className="meta-item"><Icon name="mappin" /> {trip.destination}</div>
                        <div className="meta-item"><Icon name="calendar" /> {formatDateRange(trip)}</div>
                    </div>
                </div>
                {!isCompleted && (
                    <button type="button" className="btn-view" onClick={() => navigate(`${isOngoing ? V.scheduleOngoing : V.scheduleUpcoming}?trip=${trip.id}`)}>View Schedule</button>
                )}
            </div>
            <div className="services-area">
                <div className="services-title">YOUR SERVICE ITEMS</div>
                <div className="service-pills">
                    <span className={`service-pill${isOngoing || trip.vendorStatus === 'Accepted' ? ' active' : ''}`}><Icon name="truck" /> {serviceType} - {statusText}</span>
                </div>
            </div>
            {isCompleted ? (
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                    <div className="current-activity" style={{ margin: 0, background: '#064e3b', color: '#34d399', border: 'none', fontWeight: 600, padding: '6px 12px', borderRadius: 6 }}>
                        Service Status: Completed ({percent}%)
                    </div>
                    <button type="button" className="btn-history-card" onClick={() => navigate(`${V.scheduleCompleted}?trip=${trip.id}`)}>
                        <Icon name="checkcircle" />
                        <div style={{ textAlign: 'left', fontSize: 11, lineHeight: 1.2 }}>View<br />History</div>
                    </button>
                </div>
            ) : (
                <div className="progress-area">
                    <div className="progress-header"><span>Service Status</span><span>{statusText} ({percent}%)</span></div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
                </div>
            )}
        </div>
    );
}

/** vendor_traveler_schedules.html (renderVendorTravelerSchedules + setupScheduleFilters). */
export default function VendorTravelerSchedules() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const headerQuery = useHeaderSearch();
    const [showHistory, setShowHistory] = useState(false);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');

    const trips = getVendorTrips(state).filter((trip) => ['Accepted', 'In Progress', 'En Route', 'Completed'].includes(trip.vendorStatus));
    const activeTravelers = trips.filter((t) => t.status !== 'completed').reduce((sum, t) => sum + (Number(t.travelersCount) || 1), 0);
    const completedServices = trips.filter(isDone).length;
    const upcomingServices = trips.filter((t) => !isDone(t)).length;
    const hasActive = upcomingServices > 0;

    let displayTrips = trips;
    if (hasActive) displayTrips = showHistory ? trips.filter(isDone) : trips.filter((t) => !isDone(t));
    const search = query || headerQuery;
    const visible = displayTrips.filter((trip) => {
        const d = describe(trip);
        const text = `${d.statusText} ${trip.id} ${trip.title} Traveler: ${trip.travelerName} ${trip.destination} ${formatDateRange(trip)} YOUR SERVICE ITEMS ${d.serviceType} - ${d.statusText} Service Status`;
        return matchesScheduleFilter({ text, badge: d.statusText }, search, status);
    });

    const stats = [
        ['bg-green', 'user', activeTravelers, 'Active Travelers', 'View travelers →'],
        ['bg-purple', 'checkcircle', completedServices, 'Services Completed', 'View history →'],
        ['bg-blue', 'calendar', upcomingServices, 'Upcoming Services', 'View schedule →'],
        ['bg-orange', 'activity', trips.length, 'Total Services', 'View all →'],
    ];

    return (
        <DashboardLayout role="vendor" page="vendor__vendor_traveler_schedules">
            <div className="page-scroll">
                <div className="page-title">
                    <h1>Traveler Schedules</h1>
                    <p>View travelers using your services</p>
                </div>
                <div className="stats-row">
                    {stats.map(([bg, icon, value, title, link]) => (
                        <div className={`v-stat-card ${bg}`} key={title}>
                            <div className="v-stat-top">
                                <div className="v-stat-icon"><Icon name={icon} /></div>
                                <div className="v-stat-val">{value}</div>
                            </div>
                            <div className="v-stat-title">{title}</div>
                            <div className="v-stat-link">{link}</div>
                        </div>
                    ))}
                </div>
                <div className="filter-bar">
                    <div className="filter-search">
                        <Icon name="search" />
                        <input type="text" placeholder="Search by traveler name, trip name, or ID" value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    <div className="filter-actions" style={{ display: 'flex', gap: 8 }}>
                        {hasActive && completedServices > 0 && (
                            <button type="button" id="history-toggle-btn" className={`btn-card ${showHistory ? 'primary' : 'secondary'}`} onClick={() => setShowHistory((v) => !v)} style={{ borderRadius: 8, fontWeight: 600, padding: '6px 12px', marginRight: 8 }}>
                                <Icon name="clock" /> History
                            </button>
                        )}
                        <select className="filter-dropdown" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="all">All Services</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                </div>
                <div id="dd-vendor-schedules">
                    {!displayTrips.length
                        ? <div className="content-card" style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No schedules found in this view.</div>
                        : visible.length ? visible.map((trip) => <ScheduleCard key={trip.id} trip={trip} navigate={navigate} />) : <NoMatchingSchedules />}
                </div>
            </div>
        </DashboardLayout>
    );
}
