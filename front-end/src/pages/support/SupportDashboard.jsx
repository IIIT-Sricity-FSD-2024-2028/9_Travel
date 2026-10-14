import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { AssignedTravelerRows, assignedTravelerCount } from '../../components/workflow/AssignedTravelers';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { allActiveTrips, relativeTime } from '../../services/workflow';

const S = PATHS.support;
const thStyle = { padding: 12, fontSize: 13, fontWeight: 700, color: '#475569' };
const overviewLabel = { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 };
const overviewValue = { fontSize: '2rem', fontWeight: 800, marginTop: 4 };

/** Support statistics shared by the dashboard (renderSupportDashboard). */
function supportStats(state) {
    const allTrips = allActiveTrips(state).filter((trip) => !['completed', 'cancelled'].includes(trip.status));
    const activeTrips = allTrips.filter((trip) => trip.supportStatus === 'Accepted');
    const pendingFromPartner = allTrips.filter((trip) => trip.supportStatus === 'Sent');
    const issues = state.issues || [];
    const inProgress = issues.filter((issue) => issue.status === 'In Progress' || issue.status === 'Open');
    const resolved = issues.filter((issue) => issue.status === 'Resolved');
    const emergencies = issues.filter((issue) => issue.status !== 'Resolved' && /high|critical|emergency/i.test(`${issue.priority} ${issue.type}`));
    const activity = [
        ...issues.map((issue) => ({ title: `${issue.status} issue`, desc: `${issue.title}${issue.tripId ? ` - ${issue.tripId}` : ''}`, createdAt: issue.createdAt })),
        ...activeTrips.flatMap((trip) => (trip.updates || []).map((update) => ({ title: update.title, desc: `${trip.id} - ${update.message}`, createdAt: update.createdAt }))),
    ].sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));

    let totalHours = 0;
    let resolvedCount = 0;
    resolved.forEach((issue) => {
        if (issue.resolvedAt && issue.createdAt) {
            totalHours += (new Date(issue.resolvedAt).getTime() - new Date(issue.createdAt).getTime()) / 3600000;
            resolvedCount += 1;
        }
    });
    const avg = resolvedCount > 0 ? totalHours / resolvedCount : (issues.length > 0 ? 2.5 : 0);
    const csat = issues.length === 0 ? 100 : Math.max(0, 100 - (emergencies.length * 10) - (inProgress.length * 2));

    return { allTrips, activeTrips, pendingFromPartner, issues, inProgress, resolved, emergencies, activity, avgResolution: avg > 0 ? `${avg.toFixed(1)}h` : '0h', csat: `${csat}%` };
}

/** support/dashboard.html */
export default function SupportDashboard() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const s = supportStats(state);
    const assignedCount = assignedTravelerCount(state);

    const cards = [
        ['stat-blue', 'activity', s.allTrips.length, 'All Trips', `${s.activeTrips.length} coordinated by support`, S.tripStatus],
        ['stat-green', 'clock', s.inProgress.length, 'Issues In Progress', 'Currently being resolved', S.reportedIssues],
        ['stat-purple', 'checkcircle', s.resolved.length, 'Resolved Issues', 'Successfully resolved', S.resolutionUpdates],
        ['stat-orange', 'phone', s.emergencies.length, 'Emergency Cases', 'Requires immediate attention', S.emergencySupport],
    ];
    const quickActions = [
        ['alert', 'View All Issues', `${s.issues.filter((i) => i.status !== 'Resolved').length} pending assignments`, S.reportedIssues],
        ['phone', 'Emergency Support', `${s.emergencies.length} active emergencies`, S.emergencySupport],
        ['checkcircle', 'Coordination Panel', `${s.activeTrips.length} active trips`, S.coordinationPanel],
    ];

    return (
        <DashboardLayout role="support" page="support__dashboard">
            <div className="dashboard-container">
                <div className="welcome-banner">
                    <h1>Support Executive Dashboard</h1>
                    <p>Coordinate issue resolution and emergency response</p>
                </div>

                {s.pendingFromPartner.length > 0 && (
                    <div id="dd-support-alert-banner" style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '1px solid #fed7aa', borderRadius: 12, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Icon name="alertcircle" style={{ color: '#f97316', width: 22, height: 22, flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: 700, color: '#c2410c', fontSize: '0.95rem' }}>{s.pendingFromPartner.length} trip{s.pendingFromPartner.length > 1 ? 's' : ''} sent for support coordination</div>
                                <div style={{ fontSize: '0.82rem', color: '#9a3412' }}>Travel partner has requested support assistance. Go to Trip Status to accept.</div>
                            </div>
                        </div>
                        <button type="button" className="btn-outline" style={{ background: '#f97316', color: '#fff', borderColor: '#f97316', whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '0.85rem' }} onClick={() => navigate(S.tripStatus)}>
                            <Icon name="activity" /> View Requests
                        </button>
                    </div>
                )}

                <div className="stats-grid">
                    {cards.map(([cls, icon, value, title, link, to]) => (
                        <div key={title} className={`stat-card ${cls}`} role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => navigate(to)}>
                            <div className="stat-top">
                                <span className="stat-icon"><Icon name={icon} /></span>
                                <span className="stat-value">{value}</span>
                            </div>
                            <div className="stat-bottom">
                                <div className="stat-title">{title}</div>
                                <span className="stat-link">{link}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="overview-banner" style={{ background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)', color: 'white', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Today&apos;s Overview</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                            <div><div style={overviewLabel}>Total Issues Reported</div><div id="support-stat-total-issues" style={overviewValue}>{s.issues.length}</div></div>
                            <div><div style={overviewLabel}>Average Resolution Time</div><div id="support-stat-avg-res" style={overviewValue}>{s.avgResolution}</div></div>
                            <div><div style={overviewLabel}>Customer Satisfaction</div><div id="support-stat-csat" style={overviewValue}>{s.csat}</div></div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: 20, borderRadius: 16, marginBottom: 24, background: 'var(--bg-surface, #fff)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary, #0f172a)' }}>Assigned Travelers under Support</h2>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', margin: 0 }}>Travelers load-balanced or assigned to your support executive queue</p>
                        </div>
                        <span className="badge" id="support-assigned-travelers-count-badge" style={{ fontSize: 13, padding: '6px 14px', borderRadius: 99, background: '#f0fdf4', color: '#166534', fontWeight: 700, border: '1px solid #bbf7d0' }}>{assignedCount} Assigned</span>
                    </div>
                    <div className="table-container" style={{ overflowX: 'auto' }}>
                        <table className="w-full text-left border-collapse" style={{ width: '100%' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-card-alt, #f8fafc)' }}>
                                    <th style={thStyle}>Traveler</th>
                                    <th style={thStyle}>Contact Info</th>
                                    <th style={thStyle}>Assigned Partner</th>
                                    <th style={thStyle}>Support Status</th>
                                </tr>
                            </thead>
                            <tbody id="support-assigned-travelers-tbody">
                                <AssignedTravelerRows state={state} variant="support" />
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    {quickActions.map(([icon, title, sub, to]) => (
                        <div key={title} className="quick-action-btn" role="button" tabIndex={0} onClick={() => navigate(to)}>
                            <div><Icon name={icon} /></div>
                            <div>
                                <div>{title}</div>
                                <div>{sub}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div>
                    <h2>Recent Activity</h2>
                    <div id="dd-support-activity">
                        {s.activity.length ? s.activity.slice(0, 6).map((item, index) => (
                            <div className="timeline-item" key={`${item.createdAt}-${index}`}>
                                <div className="timeline-dot" />
                                <div>
                                    <div><span>{item.title}</span><span>{relativeTime(item.createdAt)}</span></div>
                                    <div>{item.desc}</div>
                                </div>
                            </div>
                        )) : (
                            <div className="timeline-item">
                                <div className="timeline-dot" />
                                <div>
                                    <div><span>No recent activity</span><span>Now</span></div>
                                    <div>Accept a trip request to start coordinating.</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
