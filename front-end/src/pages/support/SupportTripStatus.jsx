import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { PATHS } from '../../routes/paths';
import { allActiveTrips, relativeTime, statusLabel } from '../../services/workflow';

const S = PATHS.support;
const metaLabel = { color: 'var(--text-secondary, #64748b)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' };
const rowBetween = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const cardBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)', background: 'var(--bg-card-alt, rgba(255,255,255,0.06))', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' };
const icon14 = { width: 14, height: 14 };

function TripCard({ trip, openIssues, canAccept, navigate, actions }) {
    const tripIssues = openIssues.filter((issue) => issue.tripId === trip.id);
    const shortId = String(trip.id).replace(/\D/g, '') || trip.id;
    const isSent = trip.supportStatus === 'Sent';
    const isCoordinated = trip.supportStatus === 'Accepted';
    const accent = isSent ? '#f59e0b' : isCoordinated ? '#10b981' : '#0ea5e9';
    const progress = Math.min(100, trip.progress);

    return (
        <div className="support-trip-card" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 1fr auto', gap: 16, alignItems: 'center', padding: '18px 22px', background: 'var(--bg-card-alt, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderLeft: `4px solid ${accent}`, borderRadius: 14, marginBottom: 14, boxShadow: '0 4px 14px rgba(0,0,0,0.03)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(14, 165, 233, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: '#0ea5e9', flexShrink: 0 }}>{shortId}</div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trip.title}</h3>
                        <span className={`meta-chip ${isSent ? 'amber' : isCoordinated ? 'green' : 'blue'}`} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                            {isSent ? 'Sent to Support' : isCoordinated ? 'Coordinated' : statusLabel(trip)}
                        </span>
                        {tripIssues.length > 0 && (
                            <span className="meta-chip red" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                                <Icon name="alertcircle" style={{ width: 12, height: 12 }} /> {tripIssues.length} Issue{tripIssues.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', flexWrap: 'wrap' }}>
                        <span><strong>{trip.id}</strong></span>
                        <span>•</span>
                        <span>📍 {trip.destination || 'Unspecified'}</span>
                        <span>•</span>
                        <span><Icon name="clock" style={{ width: 12, height: 12 }} /> {relativeTime(trip.updatedAt)}</span>
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', padding: '0 10px', borderLeft: '1px solid var(--border-color, rgba(226,232,240,0.5))', borderRight: '1px solid var(--border-color, rgba(226,232,240,0.5))' }}>
                <div style={rowBetween}><span style={metaLabel}>Traveler</span><span style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>{trip.travelerName}</span></div>
                <div style={rowBetween}><span style={metaLabel}>Guide</span><span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{trip.guide?.name || 'Unassigned'}</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px' }}>
                <div style={{ ...rowBetween, fontSize: '0.75rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--text-secondary, #64748b)' }}>Progress</span>
                    <span style={{ color: '#0ea5e9' }}>{progress}%</span>
                </div>
                <div style={{ height: 6, width: '100%', background: 'rgba(148, 163, 184, 0.2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #0ea5e9, #10b981)', borderRadius: 99, transition: 'width 0.3s ease' }} />
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                {canAccept && (
                    <button type="button" className="btn-accept-coord" onClick={() => actions.acceptSupport(trip.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8, cursor: 'pointer', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)', whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}>
                        <Icon name="checkcircle" style={icon14} /> Accept Coordination
                    </button>
                )}
                <button type="button" className="btn-card-action" style={cardBtn} onClick={() => navigate(`${S.tripDetails}?trip=${trip.id}`)}><Icon name="eye" style={icon14} /> View Details</button>
                <button type="button" className="btn-card-action" style={cardBtn} onClick={() => navigate(S.messages)}><Icon name="message" style={icon14} /> Contact Members</button>
                {tripIssues.length > 0 && isCoordinated && (
                    <button type="button" className="btn-card-issue" onClick={() => navigate(S.reportedIssues)} style={{ ...cardBtn, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <Icon name="alertcircle" style={icon14} /> View Issues
                    </button>
                )}
            </div>
        </div>
    );
}

/** support/trip_status.html (renderSupportTripStatus). */
export default function SupportTripStatus() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const actions = useWorkflowActions();

    const allTrips = allActiveTrips(state).filter((trip) => !['completed', 'cancelled'].includes(trip.status));
    const openIssues = (state.issues || []).filter((issue) => issue.status !== 'Resolved');
    const destinations = new Set(allTrips.map((trip) => trip.destination).filter(Boolean));
    const travelerCount = allTrips.reduce((sum, trip) => sum + Number(trip.travelersCount || 1), 0);
    const sent = allTrips.filter((trip) => trip.supportStatus === 'Sent');
    const coordinated = allTrips.filter((trip) => trip.supportStatus === 'Accepted');
    const others = allTrips.filter((trip) => trip.supportStatus !== 'Sent' && trip.supportStatus !== 'Accepted');
    const card = (trip, canAccept) => <TripCard key={trip.id} trip={trip} openIssues={openIssues} canAccept={canAccept} navigate={navigate} actions={actions} />;

    const stats = [
        ['activity', 'Total Trips', 'All non-cancelled', allTrips.length],
        ['users', 'Active Travelers', 'On active trips', travelerCount],
        ['alertcircle', 'Open Issues', 'Requiring attention', openIssues.length],
        ['mappin', 'Destinations', 'Currently active', destinations.size],
    ];

    return (
        <DashboardLayout role="support" page="support__trip_status">
            <div className="dashboard-container">
                <div><h1>Trip Status Monitor</h1><p>All trips are visible below. Accept coordination to manage issues and send resolutions.</p></div>
                <div>
                    {stats.map(([icon, title, sub, value]) => (
                        <div className="info-card" key={title}>
                            <div><div><Icon name={icon} /></div><div>{title}</div><div>{sub}</div></div>
                            <div className="stat-val">{value}</div>
                        </div>
                    ))}
                </div>

                {sent.length > 0 && (
                    <>
                        <h2 style={{ color: '#f97316', marginTop: 24, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Icon name="alertcircle" style={{ color: '#f97316' }} />
                            Sent by Partner — Awaiting Your Acceptance ({sent.length})
                        </h2>
                        {sent.map((trip) => card(trip, true))}
                    </>
                )}

                <h2 style={{ marginTop: sent.length ? 32 : 24, marginBottom: 12 }}>Trips You Are Coordinating ({coordinated.length})</h2>
                {coordinated.length ? coordinated.map((trip) => card(trip, false)) : (
                    <div className="empty-coordination-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'var(--bg-card-alt, #f8fafc)', border: '1px dashed var(--border-color, #cbd5e1)', borderLeft: '4px solid #94a3b8', borderRadius: 14, gap: 16, marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(148, 163, 184, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #64748b)' }}>
                                <Icon name="compass" style={{ width: 20, height: 20 }} />
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>No coordinated trips yet</h4>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>Accept a trip below or from partner to start managing issues and member communications.</p>
                            </div>
                        </div>
                        <span className="meta-chip amber" style={{ padding: '4px 12px' }}>
                            <Icon name="info" style={icon14} />
                            <span>Accept to Start</span>
                        </span>
                    </div>
                )}

                {others.length > 0 && (
                    <>
                        <h2 style={{ marginTop: 32, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9 }}>
                            All Other Active Trips ({others.length})
                            <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.7 }}>— accept to coordinate issues</span>
                        </h2>
                        <div>{others.map((trip) => card(trip, true))}</div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
