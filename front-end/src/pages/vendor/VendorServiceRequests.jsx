import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { formatMoney, formatShortDate, getVendorTrips } from '../../services/workflow';

/** Pagination footer shown under the vendor tables (static single page, like the original). */
export function TablePagination({ info, plain = false }) {
    return (
        <div className="pagination">
            <div className={plain ? undefined : 'page-info'}>{info}</div>
            <div className="page-controls">
                <button type="button" className="page-btn" disabled>Previous</button>
                <button type="button" className="page-btn active">1</button>
                <button type="button" className="page-btn" disabled>Next</button>
            </div>
        </div>
    );
}

/** vendor_service_requests.html (renderVendorRequests). */
export default function VendorServiceRequests() {
    const state = useWorkflowState();
    const actions = useWorkflowActions();
    const trips = getVendorTrips(state).filter((trip) => trip.vendor && ['Requested', 'Pending', 'Assigned'].includes(trip.vendorStatus));

    return (
        <DashboardLayout role="vendor" page="vendor__vendor_service_requests">
            <div className="page-scroll">
                <div className="page-title">
                    <h1>Service Requests</h1>
                    <p>Requests sent by travel partners for vendor services</p>
                </div>
                <div className="content-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Request ID</th>
                                <th>Trip ID</th>
                                <th>Service Type</th>
                                <th>Location</th>
                                <th>Requested Date</th>
                                <th>Vendor Share (₹)</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trips.length ? trips.map((trip) => {
                                const vPct = trip.budgetShare?.vendorPercent !== undefined ? trip.budgetShare.vendorPercent : 50;
                                const vAmt = trip.budgetShare?.vendorAmount ?? Math.round((Number(trip.budget || 0) * vPct) / 100);
                                return (
                                    <tr key={trip.id}>
                                        <td><a className="req-id-link font-semibold" style={{ color: '#2563eb' }}>{trip.requestId || trip.id}</a></td>
                                        <td><span className="font-medium">{trip.id}</span></td>
                                        <td><span className="type-pill">{trip.vendor?.type || 'Service'}</span></td>
                                        <td>{trip.destination}</td>
                                        <td>{trip.startDate ? formatShortDate(trip.startDate) : 'Scheduled'}</td>
                                        <td><span style={{ fontWeight: 700, color: '#059669' }}>{formatMoney(vAmt)}</span> <span style={{ fontSize: 11, color: '#64748b' }}>({vPct}%)</span></td>
                                        <td><span className="status-pill status-pending">Pending</span></td>
                                        <td>
                                            <div className="actions-cell">
                                                <button type="button" className="btn-action btn-accept" onClick={() => actions.acceptVendor(trip.id)}><Icon name="checkcircle" /> Accept</button>
                                                <button type="button" className="btn-action btn-reject" onClick={() => actions.rejectVendor(trip.id)}><Icon name="x" /> Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>No pending service requests.</td></tr>}
                        </tbody>
                    </table>
                    <TablePagination info={trips.length ? `Showing 1-${trips.length} of ${trips.length} requests` : 'Showing 0 requests'} />
                </div>
            </div>
        </DashboardLayout>
    );
}
