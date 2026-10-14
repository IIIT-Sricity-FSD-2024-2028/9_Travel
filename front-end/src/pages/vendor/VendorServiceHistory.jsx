import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useWorkflowState } from '../../context/WorkflowContext';
import { formatShortDate, getVendorTrips } from '../../services/workflow';
import { TablePagination } from './VendorServiceRequests';

const completedAt = (trip) => trip.completedAt || trip.endDate || trip.updatedAt;

/** vendor_service_history.html (renderVendorServiceHistory). */
export default function VendorServiceHistory() {
    const state = useWorkflowState();
    const completed = getVendorTrips(state).filter((trip) => trip.status === 'completed' || trip.vendorStatus === 'Completed' || trip.serviceStatus === 'Completed');
    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const thisMonth = completed.filter((trip) => {
        const d = new Date(completedAt(trip));
        return !Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return (
        <DashboardLayout role="vendor" page="vendor__vendor_service_history">
            <div className="page-scroll">
                <div className="page-title">
                    <h1>Service History</h1>
                    <p>View previously completed services</p>
                </div>
                <div className="history-card">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>Trip ID</th>
                                <th>Service Type</th>
                                <th>Location</th>
                                <th>Completion Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {completed.length ? completed.map((trip) => (
                                <tr key={trip.id}>
                                    <td className="trip-id font-semibold" style={{ color: '#2563eb' }}>{trip.id}</td>
                                    <td><span className="service-type">{trip.vendor?.type || 'Service'}</span></td>
                                    <td>{trip.destination || 'Destination'}</td>
                                    <td>{formatShortDate(completedAt(trip))}</td>
                                    <td><span className="status-pill pill-completed"><Icon name="checkcircle" /> Completed</span></td>
                                </tr>
                            )) : <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>No completed services in history yet. Completed services will appear here.</td></tr>}
                        </tbody>
                    </table>
                    <TablePagination plain info={`Showing ${completed.length} completed service${completed.length === 1 ? '' : 's'}`} />
                </div>
                <div className="summary-cards-row">
                    <div className="summary-card">
                        <div className="card-header">
                            <div className="summary-icon icon-green"><Icon name="checkcircle" /></div>
                            <div className="summary-value">{completed.length}</div>
                        </div>
                        <div className="summary-title">Total Completed</div>
                        <div className="summary-desc">All-time completed services</div>
                    </div>
                    <div className="summary-card">
                        <div className="card-header">
                            <div className="summary-icon icon-blue"><Icon name="checkcircle" /></div>
                            <div className="summary-value">{thisMonth}</div>
                        </div>
                        <div className="summary-title">This Month</div>
                        <div className="summary-desc">Services completed in {monthName}</div>
                    </div>
                    <div className="summary-card">
                        <div className="card-header">
                            <div className="summary-icon icon-purple"><Icon name="star" /></div>
                            <div className="summary-value">{completed.length ? '4.9' : '5.0'}</div>
                        </div>
                        <div className="summary-title">Average Rating</div>
                        <div className="summary-desc">Based on customer feedback</div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
