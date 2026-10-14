import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { important } from '../../components/importantStyle';
import { EmptyPanel } from '../../components/Loading';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { allActiveTrips, formatDateRange, formatMoney, relativeTime, tripRevenue } from '../../services/workflow';

const SU = PATHS.superuser;
const tcwLabel = { fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block' };
const tcwVal = { fontSize: 13, fontWeight: 700, color: 'var(--foreground,#0f172a)' };

/** superuser_dashboard.html (renderSuperuserDashboard). */
export default function SuperuserDashboard() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const users = state.users || [];
    const trips = allActiveTrips(state);
    const activeTrips = trips.filter((trip) => !['completed', 'cancelled'].includes(trip.status));
    const activeTravelers = new Set(activeTrips.map((trip) => trip.travelerEmail || trip.travelerName).filter(Boolean)).size;
    const openIssues = (state.issues || []).filter((issue) => issue.status !== 'Resolved');
    const pendingVendors = trips.filter((trip) => trip.vendor && ['Requested', 'Pending'].includes(trip.vendorStatus));
    const activity = [
        ...trips.flatMap((trip) => (trip.updates || []).map((u) => ({ title: u.title, desc: `${trip.id} - ${u.message}`, createdAt: u.createdAt, icon: u.source === 'Vendor' ? 'truck' : u.source === 'Guide' ? 'user' : 'activity' }))),
        ...(state.notifications || []).map((n) => ({ title: n.title, desc: n.message, createdAt: n.createdAt, icon: 'bell' })),
        ...openIssues.map((i) => ({ title: `Open issue: ${i.id}`, desc: i.title, createdAt: i.createdAt, icon: 'alertcircle' })),
    ].sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0)).slice(0, 4);

    const stats = [
        ['sa-stat-blue', 'users', users.length, 'Total Users', SU.users],
        ['sa-stat-green', 'plane', trips.length, 'Total Trips', SU.trips],
        ['sa-stat-orange', 'dollar', formatMoney(tripRevenue(trips)), 'Total Revenue', SU.reports],
        ['sa-stat-pink', 'activity', activeTravelers, 'Active Travelers', SU.users],
        ['sa-stat-purple', 'compass', (state.guides || []).length, 'Tour Guides', SU.guides],
    ];
    const quick = [['users', 'Manage Users', SU.users], ['plane', 'Manage Trips', SU.trips], ['truck', 'View Vendors', SU.vendors], ['compass', 'Tour Guides', SU.guides]];
    const health = [['server', 'API Services', 'Live'], ['database', 'In-Memory Store', 'Live'], ['users', 'Users', users.length], ['activity', 'Workflow', trips.length]];

    return (
        <DashboardLayout role="superuser" page="superuser__superuser_dashboard">
            <div className="sa-dashboard-container sa-dashboard">
                <div className="welcome-banner" ref={important({ background: 'linear-gradient(135deg,#6366f1,#c084fc)', padding: '28px 30px', borderRadius: 14, marginBottom: 22 })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                    <div>
                        <h1 ref={important({ color: '#fff', fontSize: 22 })} style={{ margin: '0 0 8px' }}>Dream Destination Platform Control</h1>
                        <p ref={important({ color: 'rgba(255,255,255,.92)', fontSize: 13 })} style={{ margin: 0 }}>Complete platform overview and management from live backend state</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" className="sa-btn-sm" onClick={() => navigate(SU.reports)}><Icon name="filetext" /> Reports</button>
                        <button type="button" className="sa-btn-sm" onClick={() => navigate(SU.settings)}><Icon name="settings" /> Settings</button>
                    </div>
                </div>
                <div className="sa-stats-grid-5">
                    {stats.map(([cls, icon, value, label, to]) => (
                        <div key={label} className={`sa-stat-card ${cls}`} role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => navigate(to)}>
                            <div className="sa-stat-icon-wrap"><Icon name={icon} /></div>
                            <div className="sa-stat-number">{value}</div>
                            <div className="sa-stat-label">{label}</div>
                            <div className="sa-stat-trend">Real data</div>
                        </div>
                    ))}
                </div>
                <div className="sa-content-grid">
                    <div className="sa-main-panel">
                        <div className="sa-section-card">
                            <div className="sa-section-header">
                                <div><h3>Active Trips ({activeTrips.length})</h3><p>Real-time trip monitoring</p></div>
                                <button type="button" className="sa-btn-sm" onClick={() => navigate(SU.trips)}>View All</button>
                            </div>
                            <div className="sa-trips-table">
                                {activeTrips.length ? activeTrips.slice(0, 6).map((trip) => (
                                    <div className="sa-trip-card-wide" key={trip.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, background: 'var(--card,#fff)', border: '1px solid var(--border,#e2e8f0)', borderRadius: 14, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                        <div className="sa-tcw-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                                            <div>
                                                <div className="sa-tcw-title" style={{ fontSize: 16, fontWeight: 800, color: 'var(--foreground,#0f172a)' }}>{trip.title} <span className="sa-tcw-id" style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>#{trip.id}</span></div>
                                                <div className="sa-tcw-loc" style={{ fontSize: 13, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="mappin" style={{ color: '#0ea5e9' }} /> {trip.destination}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="sa-tcw-price" style={{ fontSize: 16, fontWeight: 800, color: '#0ea5e9' }}>{formatMoney(Number(trip.budget || 0))}</div>
                                                <button type="button" className="sa-btn-sm" onClick={() => navigate(`${SU.viewTrip}?id=${encodeURIComponent(trip.id)}`)} style={{ background: '#0ea5e9', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(14,165,233,0.25)' }}>
                                                    <Icon name="eye" /> View Details
                                                </button>
                                            </div>
                                        </div>
                                        <div className="sa-tcw-mid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, background: 'var(--bg-card-alt,#f8fafc)', padding: '10px 14px', borderRadius: 8 }}>
                                            <div><span className="sa-tcw-label" style={tcwLabel}>TRAVELER</span><span className="sa-tcw-val" style={tcwVal}>{trip.travelerName}</span></div>
                                            <div><span className="sa-tcw-label" style={tcwLabel}>GUIDE</span><span className="sa-tcw-val" style={tcwVal}>{trip.guide?.name || 'Pending'}</span></div>
                                            <div><span className="sa-tcw-label" style={tcwLabel}>DURATION</span><span className="sa-tcw-val" style={tcwVal}>{formatDateRange(trip)}</span></div>
                                        </div>
                                        <div className="sa-tcw-bot">
                                            <div className="sa-tcw-prog-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}><span>Trip Progress</span><span>{trip.progress}%</span></div>
                                            <div className="sa-tcw-prog-bar" style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}><div className="sa-tcw-prog-fill" style={{ width: `${Math.min(100, trip.progress)}%`, height: '100%', background: '#14b8a6' }} /></div>
                                        </div>
                                    </div>
                                )) : <EmptyPanel message="No active trips yet. New traveler requests will appear after they are created and accepted." />}
                            </div>
                        </div>
                    </div>
                    <div className="sa-side-panel">
                        <div className="sa-section-card">
                            <div className="sa-section-header"><div><h3>Recent Activity</h3><p>Platform events in real-time</p></div></div>
                            <div className="sa-activity-list">
                                {activity.length ? activity.map((item, i) => (
                                    <div className="sa-activity-item" key={`${item.createdAt}-${i}`}>
                                        <div className="sa-activity-icon sa-ai-blue"><Icon name={item.icon} /></div>
                                        <div className="sa-activity-content">
                                            <div className="sa-act-title">{item.title}</div>
                                            <div className="sa-act-desc">{item.desc}</div>
                                            <div className="sa-act-time">{relativeTime(item.createdAt)}</div>
                                        </div>
                                    </div>
                                )) : <EmptyPanel message="No platform activity yet." />}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="sa-dual-grid">
                    <div className="sa-section-card">
                        <div className="sa-section-header">
                            <div><h3 style={{ marginBottom: 2 }}>Pending Vendor Requests</h3><p style={{ fontSize: 12, color: '#64748b' }}>{pendingVendors.length} awaiting approval</p></div>
                            <button type="button" className="sa-btn-sm" onClick={() => navigate(SU.vendors)}>Manage</button>
                        </div>
                        <div className="sa-vendor-list" style={{ paddingTop: 12 }}>
                            {pendingVendors.length ? pendingVendors.slice(0, 5).map((trip) => (
                                <div className="sa-vendor-item-v2" key={trip.id}>
                                    <div className="sa-vicon-box purple"><Icon name="truck" /></div>
                                    <div className="sa-vinfo"><div className="sa-vinfo-title">{trip.vendor?.name || 'Vendor'}</div><div className="sa-vinfo-sub">{trip.vendor?.type || 'Service'}<br /><span style={{ opacity: 0.6 }}>Trip: {trip.id}</span></div></div>
                                    <div className="sa-vright"><div className="sa-vright-val">{trip.vendorStatus}</div><div className="sa-vright-time">{relativeTime(trip.updatedAt)}</div></div>
                                </div>
                            )) : <EmptyPanel message="No pending vendor requests." />}
                        </div>
                    </div>
                    <div className="sa-section-card">
                        <div className="sa-section-header">
                            <div><h3 style={{ marginBottom: 2 }}>Open Support Issues</h3><p style={{ fontSize: 12, color: '#64748b' }}>{openIssues.length} require attention</p></div>
                            <button type="button" className="sa-btn-sm" onClick={() => navigate(SU.support)}>Manage</button>
                        </div>
                        <div className="sa-issues-list" style={{ paddingTop: 12 }}>
                            {openIssues.length ? openIssues.slice(0, 5).map((issue) => (
                                <div className="sa-vendor-item-v2" key={issue.id}>
                                    <div className="sa-vicon-box sa-issue-box-alert"><Icon name="alertcircle" /></div>
                                    <div className="sa-vinfo"><div className="sa-vinfo-title">{issue.id} <span className="sa-badge-high" style={{ marginLeft: 4 }}>{issue.priority}</span></div><div className="sa-vinfo-sub">{issue.type}<br /><span style={{ opacity: 0.8 }}>{issue.title}</span></div></div>
                                    <div className="sa-vright"><div className="sa-vright-time" style={{ marginTop: 20 }}>{relativeTime(issue.createdAt)}</div></div>
                                </div>
                            )) : <EmptyPanel message="No open support issues." />}
                        </div>
                    </div>
                </div>
                <div className="sa-section-card sa-health-section">
                    <div className="sa-section-header"><h3>System Health Status</h3><p>Backend is connected and serving live in-memory data</p></div>
                    <div className="sa-health-grid">
                        {health.map(([icon, label, value]) => (
                            <div className="sa-health-item" key={label}>
                                <div className="sa-health-icon sa-health-good"><Icon name={icon} /></div>
                                <div className="sa-health-label">{label}</div>
                                <div className="sa-health-value">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="sa-section-card sa-quick-actions">
                    <div className="sa-section-header"><h3>Quick Actions</h3></div>
                    <div className="sa-actions-grid">
                        {quick.map(([icon, label, to]) => (
                            <button type="button" key={label} className="sa-action-btn" onClick={() => navigate(to)}><Icon name={icon} /><span>{label}</span></button>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
