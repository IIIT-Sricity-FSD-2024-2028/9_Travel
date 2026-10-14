import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { allActiveTrips, formatDateRange, initialsFor, scheduleStatusText, statusLabel, tripSchedule } from '../../services/workflow';

const S = PATHS.support;

/**
 * support/trip_details.html (renderSupportTripDetails). "View Details" links now pass
 * ?trip=ID; without it the first coordinated trip is shown, as in the original.
 */
export default function SupportTripDetails() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const live = allActiveTrips(state).filter((item) => !['completed', 'cancelled'].includes(item.status));
    const requested = params.get('trip');
    const trip = (requested && allActiveTrips(state).find((item) => item.id === requested))
        || live.find((item) => item.supportStatus === 'Accepted')
        || live[0];

    const backButton = <button type="button" className="back-btn" onClick={() => navigate(S.tripStatus)}><Icon name="chevronleft" /> Back to Monitor</button>;

    if (!trip) {
        return (
            <DashboardLayout role="support" page="support__trip_details" activeNav={S.tripStatus}>
                <div className="dashboard-container">
                    <div className="page-title-area"><div>{backButton}<div className="title-with-badge"><h1>No Trip Selected</h1><span className="badge-ss">Fresh Start</span></div></div></div>
                    <div className="detail-card"><div className="detail-card-title">Trip Information</div><p style={{ color: '#64748b' }}>There are no trips yet. Trip details will appear after a real traveler request is created.</p></div>
                </div>
            </DashboardLayout>
        );
    }

    const tripIssues = (state.issues || []).filter((issue) => issue.tripId === trip.id && issue.status !== 'Resolved');
    const schedule = tripSchedule(trip);

    return (
        <DashboardLayout role="support" page="support__trip_details" activeNav={S.tripStatus}>
            <div className="dashboard-container">
                <div className="page-title-area">
                    <div>{backButton}<div className="title-with-badge"><h1>{trip.title}</h1><span className="badge-ip">{statusLabel(trip)}</span></div></div>
                    <div><button type="button" className="ab-btn bg-teal" onClick={() => navigate(S.coordinationPanel)}><Icon name="users" /> Coordinate Trip</button></div>
                </div>
                <div className="trip-details-grid">
                    <div className="details-left">
                        <div className="detail-card">
                            <div className="detail-card-title">Trip Information</div>
                            <div className="info-row"><div className="info-label">Trip ID</div><div className="info-value">{trip.id}</div></div>
                            <div className="info-row"><div className="info-label">Destination</div><div className="info-value">{trip.destination}</div></div>
                            <div className="info-row"><div className="info-label">Duration</div><div className="info-value">{formatDateRange(trip)}</div></div>
                            <div className="info-row"><div className="info-label">Traveler</div><div className="info-value">{trip.travelerName}</div></div>
                        </div>
                        <div className="detail-card">
                            <div className="detail-card-title">Current Status (Full Itinerary)</div>
                            <div className="v-list" style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 8 }}>
                                {schedule.map((item) => (
                                    <div className={`v-item${item.status !== 'upcoming' ? ' active' : ''}`} key={item.id}>
                                        <div className="v-icon"><Icon name={item.status === 'completed' ? 'check' : item.status === 'in-progress' ? 'activity' : 'clock'} /></div>
                                        <div className="v-content">
                                            <div className="v-title">Day {item.day} - {item.title}</div>
                                            <div className="v-desc">{scheduleStatusText(item.status)} - {item.location} ({item.time})</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="detail-card">
                            <div className="detail-card-title">Active Support Items</div>
                            <div className="issue-pill-row">
                                {tripIssues.length ? tripIssues.map((issue) => (
                                    <div className="issue-pill" key={issue.id}><div><div className="ip-title">{issue.id} - {issue.title}</div><div className="ip-desc">{issue.description}</div></div></div>
                                )) : <p style={{ color: '#64748b' }}>No active support issues for this trip.</p>}
                            </div>
                        </div>
                    </div>
                    <div className="details-right">
                        <div className="widget-grad w-gradient-pink">
                            <div className="detail-card-title">Travel Partner</div>
                            <p>Travel partner coordination is available through messages.</p>
                            <button type="button" className="w-btn" onClick={() => navigate(S.messages)}><Icon name="message" /> Contact Partner</button>
                        </div>
                        <div className="detail-card">
                            <div className="detail-card-title">Tour Guide</div>
                            {trip.guide ? (
                                <div className="w-contact">
                                    <div className="w-avatar">{trip.guide.initials || initialsFor(trip.guide.name)}</div>
                                    <div className="w-details"><h4>{trip.guide.name}</h4><p>{trip.guideStatus}</p></div>
                                </div>
                            ) : <p style={{ color: '#64748b' }}>No guide assigned yet.</p>}
                        </div>
                        <div className="detail-card">
                            <div className="detail-card-title">Vendor Services</div>
                            {trip.vendor ? (
                                <div className="vendor-row">
                                    <div className="v-left">
                                        <div className="v-icon"><Icon name="truck" /></div>
                                        <div><div className="v-name">{trip.vendor.name}</div><div className="v-desc">{trip.vendor.type || 'Service'}</div></div>
                                    </div>
                                    <span className="v-status">{trip.vendorStatus}</span>
                                </div>
                            ) : <p style={{ color: '#64748b' }}>No vendor assigned yet.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
