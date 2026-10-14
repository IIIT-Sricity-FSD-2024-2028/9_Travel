import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useWorkflowRefresh, useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { acceptedTrips, relativeTime } from '../../services/workflow';

const P = PATHS.partner;

/** travelPartner_execution.html (renderExecution). */
export default function PartnerExecution() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const refresh = useWorkflowRefresh();
    const [alertVisible, setAlertVisible] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const trips = acceptedTrips(state);
    const updates = (state.trips || [])
        .flatMap((trip) => (trip.updates || []).map((update) => ({ ...update, trip })))
        .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0))
        .slice(0, 8);

    const onRefresh = async () => {
        setRefreshing(true);
        try { await refresh(); } finally { setRefreshing(false); }
    };

    return (
        <DashboardLayout role="partner" page="travelPartner__travelPartner_execution">
            <div className="page-content">
                <div className="page-header">
                    <h1 className="text-2xl font-bold text-gray-900">Trip Execution &amp; Monitoring</h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time monitoring of vendor &amp; guide performance</p>
                </div>
                {alertVisible && (
                    <div className="system-alert">
                        <div className="alert-content">
                            <Icon name="activity" />
                            <span>System alert active for Traveler Process dashboard</span>
                        </div>
                        <span role="button" tabIndex={0} aria-label="Dismiss" style={{ cursor: 'pointer' }} onClick={() => setAlertVisible(false)}><Icon name="x" /></span>
                    </div>
                )}
                <div className="mb-8">
                    <div className="section-title">
                        Active Trip Monitoring
                        <button type="button" className="text-xs text-blue-600 font-semibold border border-blue-200 bg-blue-50 px-2 py-1 rounded" onClick={onRefresh} disabled={refreshing}>{refreshing ? '⟳ Refreshing...' : '⟳ Refresh'}</button>
                    </div>
                    <div className="card">
                        <div className="table-container p-0 border-none">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                        <th className="p-3 font-semibold">Trip ID</th>
                                        <th className="p-3 font-semibold">Traveler</th>
                                        <th className="p-3 font-semibold text-center">Vendor Service Status</th>
                                        <th className="p-3 font-semibold text-center">Guide Status</th>
                                        <th className="p-3 font-semibold">Current Location</th>
                                        <th className="p-3 font-semibold">Progress</th>
                                        <th className="p-3 font-semibold text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {trips.length ? trips.map((trip) => {
                                        const done = trip.status === 'completed';
                                        return (
                                            <tr className="hover:bg-gray-50 transition-colors" key={trip.id}>
                                                <td className="p-3 font-semibold text-blue-600">{trip.id}</td>
                                                <td className="p-3 font-medium text-gray-900">{trip.travelerName}</td>
                                                <td className="p-3 text-center"><span>{trip.vendor ? `${trip.vendor.type}: ${done ? 'Completed' : trip.serviceStatus || trip.vendorStatus}` : 'Vendor pending'}</span></td>
                                                <td className="p-3 text-center font-medium text-green-600">{trip.guide ? `Guide ${done ? 'Completed' : trip.guideStatus}` : 'Guide pending'}</td>
                                                <td className="p-3 text-gray-600 flex items-center gap-1"><Icon name="mappin" /> {trip.currentLocation || trip.destination}</td>
                                                <td className="p-3 text-xs text-gray-500"><div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${trip.progress}%` }} /></div> {trip.progress}%</td>
                                                <td className="p-3 text-center"><button type="button" className="text-gray-400 hover:text-blue-600 transition-colors" title="View schedules" onClick={() => navigate(P.travelerSchedules)}><Icon name="eye" /></button></td>
                                            </tr>
                                        );
                                    }) : <tr><td colSpan={7} className="p-4 text-center text-gray-500">No active trips to monitor.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div>
                    <h2 className="section-title">Live Execution Updates</h2>
                    <p className="text-sm text-gray-500 mb-4">Real-time updates from vendors and guides</p>
                    <div className="live-updates-container" id="live-execution-updates-list">
                        {updates.map((item) => (
                            <div className="update-item" key={`${item.trip.id}-${item.id}`}>
                                <div className={`update-icon ${item.source === 'Vendor' ? 'green' : item.status === 'Warning' ? 'orange' : 'blue'}`} />
                                <div className="update-content">
                                    <div className="update-text">{item.source}: {item.message}</div>
                                    <div className="update-time">{item.trip.id} - {relativeTime(item.createdAt)}</div>
                                </div>
                                <div className={`update-badge ${item.status === 'Warning' ? 'warning' : item.status === 'Accepted' ? 'executed' : 'active'}`}>{item.status}</div>
                            </div>
                        ))}
                        <button type="button" className="btn-view-all" onClick={() => navigate(P.notifications)}>View All Updates</button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
