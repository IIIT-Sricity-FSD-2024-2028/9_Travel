import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout, { useHeaderSearch } from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import ScheduleFeed from '../../components/workflow/ScheduleFeed';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { allActiveTrips, formatDateRange, scheduleStats, statusLabel, tripsForCurrentUser } from '../../services/workflow';

/** Picks the trip shown on the traveler schedule / progress pages (with the "history" toggle). */
export function useTravelerFocusTrip(state, viewingCompleted) {
    const trips = tripsForCurrentUser(allActiveTrips(state)).slice().sort((a, b) => (new Date(b.updatedAt || 0).getTime() || 0) - (new Date(a.updatedAt || 0).getTime() || 0));
    const trip = viewingCompleted
        ? trips.find((t) => t.status === 'completed')
        : (trips.find((t) => t.status === 'ongoing') || trips.find((t) => !['completed', 'cancelled', 'requested'].includes(t.status)));
    return {
        trip: trip || null,
        hasCompleted: Boolean(trips.find((t) => t.status === 'completed')),
        requested: trips.find((t) => t.status === 'requested') || null,
    };
}

function FilteredFeed({ trip }) {
    const query = useHeaderSearch();
    if (!query) return <ScheduleFeed trip={trip} />;
    const filtered = { ...trip, schedule: (trip.schedule || []).filter((item) => `${item.title} ${item.location} ${item.time} ${item.owner} day ${item.day}`.toLowerCase().includes(query)) };
    if (!filtered.schedule.length) {
        return (
            <div id="dd-schedule-empty-notice" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary, #64748b)', background: 'var(--bg-card-alt, #f8fafc)', borderRadius: 12, border: '1px solid var(--border-color, #e2e8f0)', margin: '16px 0', fontWeight: 600, width: '100%' }}>
                <Icon name="search" style={{ width: 32, height: 32, opacity: 0.5, marginBottom: 8 }} /><div>No matching traveler schedules found</div>
            </div>
        );
    }
    return <ScheduleFeed trip={filtered} />;
}

export default function TravelerSchedule() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const [viewingCompleted, setViewingCompleted] = useState(false);
    const { trip, hasCompleted, requested } = useTravelerFocusTrip(state, viewingCompleted);
    const toggle = () => setViewingCompleted((v) => !v);

    let subtitle = 'Track dates, times, & itinerary';
    let feed;
    let showSide = true;
    if (!trip && !viewingCompleted && hasCompleted) {
        subtitle = 'No active scheduled trip.';
        showSide = false;
        feed = (
            <div className="day-card" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: 8 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </div>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>No Active Schedule</h3>
                <p style={{ color: '#64748b', margin: 0, maxWidth: 400, lineHeight: 1.5 }}>Your current trip has been completed or cancelled. A new schedule will appear here when a new trip is started by your travel partner.</p>
                <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={toggle}>View Previous Trips History</button>
            </div>
        );
    } else if (!trip && !viewingCompleted && requested) {
        subtitle = 'No scheduled trip yet.';
        showSide = false;
        feed = (
            <div className="day-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                <Icon name="calendar" style={{ width: 48, height: 48, opacity: 0.5, marginBottom: 16 }} />
                <h3 style={{ color: '#1e293b', margin: '0 0 8px 0' }}>Schedule Pending</h3>
                <p style={{ margin: 0 }}>Schedule will be displayed after your requested trip is accepted by the travel partner.</p>
            </div>
        );
    } else if (!trip) {
        subtitle = 'No scheduled trip yet.';
        showSide = false;
        feed = <div className="day-card" style={{ padding: 24 }}>Schedule will be displayed after a traveler request is submitted or accepted.</div>;
    } else {
        subtitle = `${trip.title} (${formatDateRange(trip)})`;
        feed = (
            <>
                {viewingCompleted && <button type="button" className="btn btn-outline" style={{ marginBottom: 16 }} onClick={toggle}><Icon name="arrowleft" /> Back to Active</button>}
                <FilteredFeed trip={trip} />
            </>
        );
    }
    const stats = trip ? scheduleStats(trip) : { completed: 0, active: 0, upcoming: 0, total: 1 };
    const pct = (n) => `${Math.round((n / (stats.total || 1)) * 100)}%`;

    return (
        <DashboardLayout role="traveler" page="traveler__traveler_schedule">
            <div className="page-content">
                <div>
                    <h1>Trip Schedule</h1>
                    <p>{subtitle}</p>
                </div>
                {showSide && (
                    <div className="info-banner">
                        <div><Icon name="mappin" /> Located in {trip.destination} | Travel Dates: {formatDateRange(trip)} | Status: {statusLabel(trip)}</div>
                    </div>
                )}
                <div className="layout-split">
                    <div className="schedule-feed">{feed}</div>
                    {showSide && (
                        <div className="right-sidebar">
                            <div className="current-activity-card">
                                <div className="ca-title">Current Activity</div>
                                <div className="ca-name">{stats.current?.title || trip.currentActivity || trip.schedule?.[0]?.title || trip.title}</div>
                                <div className="ca-meta"><Icon name="user" /> Guide: {trip.guide?.name || 'Pending'} | <Icon name="truck" /> Vendor: {trip.vendor?.name || 'Pending'}</div>
                                <button type="button" className="ca-btn" onClick={() => navigate(PATHS.traveler.messages)}>Contact Guide</button>
                            </div>
                            <div className="sidebar-card">
                                <div className="sc-title">Schedule Summary</div>
                                <div className="sum-row"><div className="sum-header"><span>Completed</span><span>{stats.completed}</span></div><div className="sum-bar"><div className="sum-fill" style={{ width: pct(stats.completed) }} /></div></div>
                                <div className="sum-row"><div className="sum-header"><span>In Progress</span><span>{stats.active}</span></div><div className="sum-bar"><div className="sum-fill" style={{ width: pct(stats.active) }} /></div></div>
                                <div className="sum-row"><div className="sum-header"><span>Upcoming</span><span>{stats.upcoming}</span></div><div className="sum-bar"><div className="sum-fill" style={{ width: pct(stats.upcoming) }} /></div></div>
                            </div>
                            <div className="sidebar-card">
                                <div className="sc-title">Quick Actions</div>
                                <div className="qa-item" role="button" tabIndex={0} onClick={() => navigate(PATHS.traveler.messages)}>Message Team <Icon name="arrowright" /></div>
                                <div className="qa-item" role="button" tabIndex={0} onClick={() => navigate(PATHS.traveler.tripDetails)}>Trip Details <Icon name="arrowright" /></div>
                                <div className="qa-item" role="button" tabIndex={0} onClick={() => navigate(PATHS.traveler.reportIssue)}>Report Issue <Icon name="arrowright" /></div>
                                <div className="qa-item" role="button" tabIndex={0} onClick={() => navigate(PATHS.traveler.myTrips)}>View Past Trips <Icon name="arrowright" /></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
