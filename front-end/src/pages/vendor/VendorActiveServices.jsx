import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { PATHS } from '../../routes/paths';
import { formatShortDate, getVendorTrips } from '../../services/workflow';
import { TablePagination } from './VendorServiceRequests';

/** vendor_active_services.html (renderVendorActiveServices). */
export default function VendorActiveServices() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const actions = useWorkflowActions();
    const trips = getVendorTrips(state).filter((trip) => ['Accepted', 'In Progress', 'En Route'].includes(trip.vendorStatus) && trip.status !== 'completed');

    return (
        <DashboardLayout role="vendor" page="vendor__vendor_active_services">
            <div className="page-scroll">
                <div className="page-title">
                    <h1>Active Services</h1>
                    <p>Services currently assigned to the vendor</p>
                </div>
                <div className="info-banner">
                    <Icon name="edit3" /> Status updates are visible to Travel Partner &amp; Traveler
                </div>
                <div className="content-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Trip ID</th>
                                <th>Service Type</th>
                                <th>Traveler Name</th>
                                <th>Service Start Time</th>
                                <th>Service Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trips.length ? trips.map((trip) => (
                                <tr key={trip.id}>
                                    <td><a className="req-id-link font-semibold" style={{ color: '#2563eb' }}>{trip.id}</a></td>
                                    <td><span className="type-pill">{trip.vendor?.type || 'Travel Services'}</span></td>
                                    <td><span className="font-medium">{trip.travelerName}</span></td>
                                    <td>{trip.startDate ? formatShortDate(trip.startDate) : (trip.schedule?.[0]?.time ? `Day 1 ${trip.schedule[0].time}` : 'Scheduled')}</td>
                                    <td><span className="status-pill pill-progress">{trip.serviceStatus || trip.vendorStatus || 'Accepted'}</span></td>
                                    <td>
                                        <div className="actions-cell">
                                            <button type="button" className="btn-action btn-update" onClick={() => navigate(PATHS.vendor.serviceUpdates)}><Icon name="edit2" /> Update Status</button>
                                            <button type="button" className="btn-action btn-complete" onClick={() => actions.completeService(trip.id)}><Icon name="checkcircle" /> Mark Completed</button>
                                        </div>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>No active services. Accept a service request first.</td></tr>}
                        </tbody>
                    </table>
                    <TablePagination info={`Showing ${trips.length} active service${trips.length === 1 ? '' : 's'}`} />
                </div>
            </div>
        </DashboardLayout>
    );
}
