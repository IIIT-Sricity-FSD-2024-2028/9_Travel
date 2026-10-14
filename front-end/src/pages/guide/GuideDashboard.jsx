import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { EmptyPanel } from '../../components/Loading';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { PATHS } from '../../routes/paths';
import { formatDateRange, getGuideTrips, relativeTime, statusLabel } from '../../services/workflow';

const G = PATHS.guide;
const listStyle = { maxHeight: 520, overflowY: 'auto', paddingRight: 4 };
const cardStyle = (color) => ({ background: 'var(--bg-card-alt, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderLeft: `4px solid ${color}`, borderRadius: 14, marginBottom: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' });
const idChip = { fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(14, 165, 233, 0.25)', padding: '3px 10px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.02em' };
const titleStyle = { fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const rowTop = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' };
const rowLeft = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', flex: 1, minWidth: 0 };
const pill = (fg, bg, border) => ({ fontSize: '0.75rem', fontWeight: 700, color: fg, background: bg, border: `1px solid ${border}`, padding: '4px 12px', borderRadius: 99, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 });
const dot = (color, glow) => ({ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${glow}` });
const actionsRow = { display: 'flex', gap: 10, padding: '0 20px 16px 20px', background: 'transparent', width: '100%', boxSizing: 'border-box' };
const actionBtn = (gradient, shadow) => ({ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 18px', fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', background: gradient, border: 'none', borderRadius: 10, cursor: 'pointer', boxShadow: `0 4px 12px ${shadow}`, transition: 'all 0.2s ease' });
const icon14 = { width: 14, height: 14 };
const icon16 = { width: 16, height: 16 };

/** guide/dashboard.html (renderGuideDashboard). */
export default function GuideDashboard() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const actions = useWorkflowActions();

    const guideTrips = getGuideTrips(state);
    const pending = guideTrips.filter((trip) => trip.guideStatus === 'Assigned');
    const active = guideTrips.filter((trip) => ['Accepted', 'Completed'].includes(trip.guideStatus) && trip.status !== 'completed');
    const upcoming = guideTrips.filter((trip) => trip.guideStatus === 'Assigned' && trip.status !== 'completed');
    const completed = guideTrips.filter((trip) => trip.status === 'completed' || trip.guideStatus === 'Completed');
    const travelers = guideTrips.reduce((sum, trip) => sum + Number(trip.travelersCount || 1), 0);
    const updates = guideTrips
        .flatMap((trip) => (trip.updates || []).map((update) => ({ ...update, trip })))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6);

    const stats = [
        [travelers, 'text-purple-premium', 'Assigned Travelers', G.travelerSchedules],
        [active.length, 'text-green-premium', 'Active Tours', G.scheduleOngoing],
        [upcoming.length, 'text-blue-premium', 'Upcoming Tours', G.scheduleUpcoming],
        [completed.length, 'text-purple-premium', 'Tours Completed', G.scheduleCompleted],
    ];

    return (
        <DashboardLayout role="guide" page="guide__dashboard">
            <div className="page-content dashboard-container" id="guide-dashboard">
                <div className="welcome-banner">
                    <h1 className="text-2xl font-bold text-white mb-2">Guide Dashboard 👋</h1>
                    <p className="text-white opacity-90">Welcome to your tour guide coordination dashboard</p>
                </div>

                <div className="stats-grid-4">
                    {stats.map(([value, color, label, to]) => (
                        <div key={label} className="stat-card-premium" role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => navigate(to)}>
                            <div className={`stat-number-premium ${color}`}>{value}</div>
                            <div className="stat-label-premium">{label}</div>
                        </div>
                    ))}
                </div>

                <div className="bottom-grid">
                    <div className="card p-0 overflow-hidden">
                        <div className="p-6 pb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="text-lg font-bold text-gray-900 mb-0" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                Pending Assignments
                                <span className="header-count-badge amber" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99 }}>{pending.length} Pending</span>
                            </h2>
                        </div>
                        <div className="assignment-list" style={listStyle}>
                            {pending.length ? pending.map((trip) => (
                                <div className="assignment-card-full" key={trip.id} style={cardStyle('#f59e0b')}>
                                    <div className="ac-content" style={{ padding: '18px 20px 14px 20px' }}>
                                        <div style={rowTop}>
                                            <div style={rowLeft}>
                                                <span style={idChip}>{trip.id}</span>
                                                <h3 style={titleStyle} title={trip.title}>{trip.title}</h3>
                                            </div>
                                            <span style={pill('#d97706', 'rgba(245, 158, 11, 0.12)', 'rgba(245, 158, 11, 0.3)')}>
                                                <span style={dot('#f59e0b', 'rgba(245, 158, 11, 0.8)')} />
                                                Pending
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <div className="meta-chip blue"><Icon name="users" style={icon14} /><span>{trip.travelersCount || 1} people</span></div>
                                            <div className="meta-chip purple"><Icon name="calendar" style={icon14} /><span>{formatDateRange(trip)}</span></div>
                                            {trip.destination && <div className="meta-chip red"><Icon name="mappin" style={icon14} /><span>{trip.destination}</span></div>}
                                        </div>
                                    </div>
                                    <div className="ac-actions" style={actionsRow}>
                                        <button type="button" className="btn-accept" style={actionBtn('linear-gradient(135deg, #10b981, #059669)', 'rgba(16, 185, 129, 0.25)')} onClick={() => actions.acceptGuide(trip.id)}>
                                            <Icon name="checkcircle" style={icon16} /> Accept
                                        </button>
                                        <button type="button" className="btn-reject" style={actionBtn('linear-gradient(135deg, #ef4444, #dc2626)', 'rgba(239, 68, 68, 0.25)')} onClick={() => actions.rejectGuide(trip.id)}>
                                            <Icon name="x" style={icon16} /> Reject
                                        </button>
                                    </div>
                                </div>
                            )) : <EmptyPanel message="No pending guide assignments." />}
                        </div>
                    </div>

                    <div className="card p-0 overflow-hidden">
                        <div className="p-6 pb-2">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Active Tours</h2>
                        </div>
                        <div className="active-tours-list" style={listStyle}>
                            {active.length ? active.map((trip) => (
                                <div className="active-tour-card-full" key={trip.id} style={cardStyle('#10b981')}>
                                    <div className="at-content" style={{ padding: '18px 20px 14px 20px' }}>
                                        <div style={rowTop}>
                                            <div style={rowLeft}>
                                                <span style={{ ...idChip, letterSpacing: undefined }}>{trip.id}</span>
                                                <h3 style={titleStyle} title={trip.title}>{trip.title}</h3>
                                            </div>
                                            <span style={pill('#059669', 'rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.3)')}>
                                                <span style={dot('#10b981', 'rgba(16, 185, 129, 0.8)')} />
                                                {statusLabel(trip)}
                                            </span>
                                        </div>
                                        <div className="meta-chip red"><Icon name="mappin" style={icon14} /><span>Current: {trip.currentLocation || trip.destination}</span></div>
                                    </div>
                                    <div className="at-actions" style={actionsRow}>
                                        <button type="button" className="btn-update-status" style={actionBtn('linear-gradient(135deg, #0ea5e9, #0284c7)', 'rgba(14, 165, 233, 0.25)')} onClick={() => navigate(G.tourUpdates)}>
                                            <Icon name="edit" style={icon16} /> Update Status
                                        </button>
                                    </div>
                                </div>
                            )) : <EmptyPanel message="No active tours." />}
                        </div>
                    </div>
                </div>

                <div className="card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                        <Link to={G.activityLog} className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                            View all <Icon name="arrowright" />
                        </Link>
                    </div>
                    <div className="pl-2">
                        {updates.length ? updates.map((update) => (
                            <div className="timeline-item" key={`${update.trip.id}-${update.id}`}>
                                <div className="timeline-dot" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{update.title} - {update.trip.id}</p>
                                    <p className="text-xs text-gray-500">{relativeTime(update.createdAt)}</p>
                                </div>
                            </div>
                        )) : <EmptyPanel message="No guide activity yet." />}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
