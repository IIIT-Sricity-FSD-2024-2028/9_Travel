import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { important } from '../../components/importantStyle';
import StatusBadge from '../../components/StatusBadge';
import { AssignedTravelerRows, assignedTravelerCount } from '../../components/workflow/AssignedTravelers';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { PATHS } from '../../routes/paths';
import { allActiveTrips, formatDateRange, getPartnerNotificationItems, statusLabel } from '../../services/workflow';

const P = PATHS.partner;
const pad = (n) => String(n).padStart(2, '0');
const smallBtn = { padding: '4px 10px', fontSize: 12 };
const thStyle = { fontSize: 13, color: '#475569' };

/** travelPartner_dashboard.html (renderPartnerDashboard). */
export default function PartnerDashboard() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const actions = useWorkflowActions();

    const trips = allActiveTrips(state);
    const activeOnly = trips.filter((trip) => !['completed', 'cancelled'].includes(trip.status));
    const vendorsAssigned = activeOnly.filter((trip) => trip.vendor && trip.vendorStatus !== 'Rejected').length;
    const guidesAssigned = activeOnly.filter((trip) => trip.guide && trip.guideStatus !== 'Rejected').length;
    const unread = getPartnerNotificationItems(state).filter((item) => item.isUnread);
    const issuesCount = unread.filter((i) => i.categories.includes('Urgent') || i.type === 'Reported Issue' || i.type === 'Trip Cancellation').length;

    const stats = [
        ['stat-blue', 'plane', 'tp-stat-active-trips', activeOnly.length, 'Active Trips', 'Trips currently being managed. →', P.trips],
        ['stat-green', 'users', 'tp-stat-vendors', vendorsAssigned, 'Vendors Assigned', 'Providing services. →', P.vendorAssignment],
        ['stat-purple', 'mappin', 'tp-stat-guides', guidesAssigned, 'Guides Assigned', 'Tour guides assigned. →', P.guideAssignment],
        ['stat-orange', 'alert', 'tp-stat-issues', issuesCount, 'Today Issues / Requests', 'Problems & requests reported. →', P.notifications],
    ];
    const quick = [
        ['plane', 'Manage Trips', 'Create and coordinate trips', P.trips],
        ['trendingup', 'Trip Execution', 'Monitor real-time progress', P.execution],
        ['zap', 'Quick Actions', 'Fast coordination tasks', P.quickActions],
    ];

    const rowActions = (trip) => {
        if (trip.cancellationRequested && trip.cancellationStatus === 'Pending') {
            return (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="action-btn btn-reject" style={{ ...smallBtn, background: '#ef4444', color: '#fff', borderRadius: 4, border: 'none', cursor: 'pointer' }} title="Accept cancellation" onClick={() => actions.acceptCancellation(trip.id)}><Icon name="check" /> Accept Cancel</button>
                    <button type="button" className="action-btn btn-secondary" style={smallBtn} title="Decline cancellation" onClick={() => actions.declineCancellation(trip.id)}><Icon name="x" /> Decline</button>
                </div>
            );
        }
        if (trip.status === 'requested') {
            return (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="action-btn btn-accept" style={smallBtn} onClick={() => actions.acceptTrip(trip.id)}><Icon name="check" /> Accept</button>
                    <button type="button" className="action-btn btn-reject" style={smallBtn} onClick={() => actions.rejectTrip(trip.id)}><Icon name="x" /> Reject</button>
                </div>
            );
        }
        return <button type="button" className="action-btn btn-secondary" style={smallBtn} onClick={() => navigate(P.travelerSchedules)}><Icon name="eye" /> View</button>;
    };

    return (
        <DashboardLayout role="partner" page="travelPartner__travelPartner_dashboard">
            <div className="page-content">
                <div className="welcome-banner">
                    <h1>Travel Partner Dashboard 👋</h1>
                    <p>Welcome to your travel coordination dashboard</p>
                </div>
                <div className="stats-grid">
                    {stats.map(([cls, icon, id, value, title, link, to]) => (
                        <div key={id} className={`stat-card ${cls}`} role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => navigate(to)}>
                            <div className="stat-top">
                                <span className="stat-icon"><Icon name={icon} /></span>
                                <span className="stat-value" id={id}>{pad(value)}</span>
                            </div>
                            <div className="stat-bottom">
                                <div className="stat-title">{title}</div>
                                <span className="stat-link">{link}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="tp-recent-section" ref={important({ padding: 0, background: 'transparent', boxShadow: 'none', color: 'inherit', marginBottom: 24, borderRadius: 0 })}>
                    <div className="card" ref={important({ padding: 0, borderRadius: 16 })} style={{ overflow: 'hidden', marginBottom: 20 }}>
                        <div ref={important({ display: 'flex', gridTemplateColumns: 'none' })} style={{ justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                            <div>
                                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>Recent Trips</h2>
                                <p style={{ fontSize: 13, color: 'var(--muted-foreground, #64748b)', margin: 0 }}>Overview of your latest managed trips</p>
                            </div>
                            <Link to={P.trips} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#0ea5e9,#14b8a6)', color: 'white', padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                View All Trips <Icon name="arrowright" />
                            </Link>
                        </div>
                        <div className="table-container p-0" ref={important({ display: 'block', width: '100%', gridTemplateColumns: 'none' })} style={{ overflowX: 'auto' }}>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-4 font-semibold">Trip ID</th>
                                        <th className="p-4 font-semibold">Traveler</th>
                                        <th className="p-4 font-semibold">Destination</th>
                                        <th className="p-4 font-semibold">Dates</th>
                                        <th className="p-4 font-semibold">Status</th>
                                        <th className="p-4 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trips.length ? trips.slice(0, 8).map((trip) => (
                                        <tr key={trip.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td className="p-4"><span className="font-semibold" style={{ color: '#2563eb' }}>{trip.id}</span></td>
                                            <td className="p-4 font-medium" style={{ color: '#0f172a' }}>{trip.travelerName}</td>
                                            <td className="p-4" style={{ color: '#475569' }}>{trip.destination}</td>
                                            <td className="p-4" style={{ color: '#475569' }}>{formatDateRange(trip)}</td>
                                            <td className="p-4"><StatusBadge label={statusLabel(trip)} /></td>
                                            <td className="p-4">{rowActions(trip)}</td>
                                        </tr>
                                    )) : <tr><td colSpan={6} className="p-4 text-center text-gray-500">No trips yet. Accepted and requested trips will appear here.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="card" ref={important({ padding: 0, borderRadius: 16 })} style={{ overflow: 'hidden', marginBottom: 24 }}>
                        <div ref={important({ display: 'flex' })} style={{ justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                            <div>
                                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>Assigned Travelers</h2>
                                <p style={{ fontSize: 13, color: 'var(--muted-foreground, #64748b)', margin: 0 }}>Travelers automatically and manually assigned to your management</p>
                            </div>
                            <span className="badge badge-blue" id="assigned-travelers-count-badge" style={{ fontSize: 13, padding: '6px 14px', borderRadius: 99, background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>{assignedTravelerCount(state)} Assigned</span>
                        </div>
                        <div className="table-container p-0" ref={important({ display: 'block', width: '100%' })} style={{ overflowX: 'auto' }}>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr style={{ background: 'var(--bg-card-alt, #f8fafc)', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                                        <th className="p-4 font-semibold" style={thStyle}>Traveler Name</th>
                                        <th className="p-4 font-semibold" style={thStyle}>Contact Info</th>
                                        <th className="p-4 font-semibold" style={thStyle}>Assigned Support Exec</th>
                                        <th className="p-4 font-semibold" style={thStyle}>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="tp-assigned-travelers-tbody">
                                    <AssignedTravelerRows state={state} variant="partner-dashboard" />
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="quick-actions-grid">
                        {quick.map(([icon, title, desc, to]) => (
                            <div key={title} className="quick-action-card" role="button" tabIndex={0} onClick={() => navigate(to)}>
                                <div className="quick-action-icon"><Icon name={icon} /></div>
                                <h3>{title}</h3>
                                <p>{desc}</p>
                                <Icon name="arrowright" className="quick-action-arrow" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
