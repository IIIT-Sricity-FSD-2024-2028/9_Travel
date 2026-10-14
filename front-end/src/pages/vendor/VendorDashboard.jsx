import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { EmptyPanel } from '../../components/Loading';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { getVendorTrips } from '../../services/workflow';

const V = PATHS.vendor;

/** vendor_dashboard.html (renderVendorDashboard). */
export default function VendorDashboard() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const vendorTrips = getVendorTrips(state);
    const pending = vendorTrips.filter((trip) => ['Requested', 'Pending'].includes(trip.vendorStatus));
    const active = vendorTrips.filter((trip) => ['Accepted', 'In Progress', 'En Route'].includes(trip.vendorStatus) && trip.status !== 'completed');
    const completed = vendorTrips.filter((trip) => trip.status === 'completed' || trip.vendorStatus === 'Completed' || trip.serviceStatus === 'Completed');
    const issues = (state.issues || []).filter((issue) => vendorTrips.some((trip) => trip.id === issue.tripId) && issue.status !== 'Resolved');

    const stats = [
        ['stat-blue', 'clipboard', pending.length, 'Pending Requests', 'View all →', V.serviceRequests],
        ['stat-green', 'activity', active.length, 'Active Services', 'Track progress →', V.activeServices],
        ['stat-purple', 'checkcircle', completed.length, 'Completed Services', 'View history →', V.serviceHistory],
        ['stat-orange', 'alert', issues.length, 'Reported Issues', 'View alerts →', V.reportIssue],
    ];

    return (
        <DashboardLayout role="vendor" page="vendor__vendor_dashboard">
            <div className="page-scroll">
                <div className="welcome-banner">
                    <h1>Vendor Dashboard 👋</h1>
                    <p>Service coordination overview</p>
                </div>
                <div className="stats-grid">
                    {stats.map(([cls, icon, value, title, link, to]) => (
                        <div key={title} className={`stat-card ${cls}`} role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => navigate(to)}>
                            <div className="stat-top">
                                <span className="stat-icon"><Icon name={icon} /></span>
                                <span className="stat-value">{value}</span>
                            </div>
                            <div className="stat-bottom">
                                <div className="stat-title">{title}</div>
                                <span className="stat-link" style={{ cursor: 'pointer' }}>{link}</span>
                            </div>
                        </div>
                    ))}
                </div>
                {/* The original page had its inline <style> block here; keeping a non-div sibling preserves
                    the cascade (the shared ".stats-grid+div" rule must not match the panels). */}
                <style>{''}</style>
                <div className="vendor-panels-container">
                    <div className="vendor-panel">
                        <h2 className="vendor-panel-title">Recent Requests</h2>
                        <div className="vendor-list">
                            {pending.length ? pending.slice(0, 4).map((trip) => (
                                <div className="vendor-list-item" key={trip.id} role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => navigate(V.serviceRequests)}>
                                    <div className="v-info">
                                        <div className="v-id">{trip.requestId || trip.id}</div>
                                        <div className="v-meta">{trip.id} • {trip.vendor?.type || 'Service'}</div>
                                        <div className="v-sub">{trip.destination}</div>
                                    </div>
                                    <div className="v-pill pending">Pending</div>
                                </div>
                            )) : <EmptyPanel message="No pending service requests." />}
                        </div>
                    </div>
                    <div className="vendor-panel">
                        <h2 className="vendor-panel-title">Active Services</h2>
                        <div className="vendor-list">
                            {active.length ? active.slice(0, 4).map((trip) => (
                                <div className="vendor-list-item" key={trip.id} role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => navigate(V.activeServices)}>
                                    <div className="v-info">
                                        <div className="v-id">{trip.id}</div>
                                        <div className="v-meta">{trip.vendor?.type || 'Service'} • {trip.travelerName}</div>
                                        <div className="v-sub">{trip.destination}</div>
                                    </div>
                                    <div className="v-pill progress">{trip.serviceStatus || trip.vendorStatus}</div>
                                </div>
                            )) : <EmptyPanel message="No active services." />}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
