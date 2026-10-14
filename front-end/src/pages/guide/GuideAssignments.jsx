import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import StatusBadge from '../../components/StatusBadge';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { formatDateRange, formatMoney, getGuideTrips } from '../../services/workflow';

/** guide/assignments.html (renderGuideAssignments). */
export default function GuideAssignments() {
    const state = useWorkflowState();
    const actions = useWorkflowActions();
    const guideTrips = getGuideTrips(state);
    const pending = guideTrips.filter((trip) => trip.guide && ['Assigned', 'Pending', 'Requested'].includes(trip.guideStatus));
    const accepted = guideTrips.filter((trip) => trip.guide && ['Accepted', 'Completed'].includes(trip.guideStatus));

    return (
        <DashboardLayout role="guide" page="guide__assignments">
            <div className="page-content">
                <div className="page-header">
                    <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
                    <p className="text-sm text-gray-500 mt-1">Tour assignments received from travel partners</p>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                    {pending.length ? pending.map((trip) => {
                        const gPct = trip.budgetShare?.guidePercent !== undefined ? trip.budgetShare.guidePercent : 50;
                        const gAmt = trip.budgetShare?.guideAmount ?? Math.round((Number(trip.budget || 0) * gPct) / 100);
                        return (
                            <div className="assignment-card dashboard-card" key={trip.id}>
                                <div className="assignment-header">
                                    <div>
                                        <div className="text-blue-600 font-bold text-lg mb-1 t-title">{trip.id}</div>
                                        <div className="text-gray-900 font-semibold text-base">{trip.title}</div>
                                    </div>
                                    <StatusBadge label="Pending" />
                                </div>
                                <div className="assignment-meta">
                                    <div className="meta-item"><Icon name="users" /><span>Traveler group size: <span className="font-semibold text-gray-900">{trip.travelersCount} people</span></span></div>
                                    <div className="meta-item"><Icon name="calendar" /><span>Travel dates: <span className="font-semibold text-gray-900">{formatDateRange(trip)}</span></span></div>
                                    <div className="meta-item"><Icon name="mappin" /><span>Destination: <span className="font-semibold text-gray-900">{trip.destination}</span></span></div>
                                    <div className="meta-item"><Icon name="dollar" /><span>Tour Guide Share: <span className="font-bold text-green-600" style={{ color: '#059669', fontWeight: 700 }}>{formatMoney(gAmt)} ({gPct}%)</span></span></div>
                                </div>
                                <div className="action-row">
                                    <button type="button" className="btn" onClick={() => actions.acceptGuide(trip.id)}><Icon name="checkcircle" /> Accept</button>
                                    <button type="button" className="btn btn-danger red" onClick={() => actions.rejectGuide(trip.id)}><Icon name="x" /> Reject</button>
                                </div>
                            </div>
                        );
                    }) : <div className="card" style={{ gridColumn: '1/-1', padding: 24 }}>No pending guide assignments.</div>}
                </div>

                <div className="card">
                    <div className="card-header bg-white p-6 border-b border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900">Accepted Assignments</h2>
                    </div>
                    <div className="table-container p-0">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                    <th className="p-4 font-semibold">Tour ID</th>
                                    <th className="p-4 font-semibold">Destination</th>
                                    <th className="p-4 font-semibold">Group Size</th>
                                    <th className="p-4 font-semibold">Travel Dates</th>
                                    <th className="p-4 font-semibold">Partner</th>
                                    <th className="p-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {accepted.length ? accepted.map((trip) => (
                                    <tr className="hover:bg-gray-50 transition-colors" key={trip.id}>
                                        <td className="p-4"><span className="font-semibold text-blue-600">{trip.id}</span></td>
                                        <td className="p-4 font-medium text-gray-900">{trip.title}</td>
                                        <td className="p-4 text-gray-600">{trip.travelersCount} people</td>
                                        <td className="p-4 text-gray-600">{formatDateRange(trip)}</td>
                                        <td className="p-4 text-gray-600">Dream Destination</td>
                                        <td className="p-4"><StatusBadge label={trip.status === 'ongoing' ? 'In Progress' : trip.guideStatus} /></td>
                                    </tr>
                                )) : <tr><td colSpan={6} className="p-4 text-center text-gray-500">No accepted assignments yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
