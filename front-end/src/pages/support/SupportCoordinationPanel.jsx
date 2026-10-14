import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { EmptyPanel } from '../../components/Loading';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { allActiveTrips, initialsFor, statusLabel } from '../../services/workflow';

function ContactCard({ title, subtitle, status, icon, onContact }) {
    return (
        <div className="contact-card">
            <div className="contact-card-inner">
                <div className="contact-avatar">{initialsFor(title).slice(0, 1)}</div>
                <div>
                    <div>{title}</div>
                    <div>{subtitle}</div>
                    <div className="contact-status"><div className="contact-status-dot" /> {status}</div>
                </div>
            </div>
            <button type="button" className="btn-full" onClick={onContact}><Icon name={icon} /> Contact</button>
        </div>
    );
}

/** support/coordination_panel.html (renderSupportCoordinationPanel). */
export default function SupportCoordinationPanel() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const toMessages = () => navigate(PATHS.support.messages);
    const trips = allActiveTrips(state).filter((trip) => !['completed', 'cancelled'].includes(trip.status) && trip.supportStatus === 'Accepted');
    const vendorTrips = trips.filter((trip) => trip.vendor);
    const guideTrips = trips.filter((trip) => trip.guide);

    return (
        <DashboardLayout role="support" page="support__coordination_panel">
            <div className="dashboard-container">
                <div><h1>Coordination Panel</h1><p>Coordinate with travel partners, vendors, and tour guides</p></div>
                <div>
                    <div className="info-card"><div>Active Trips</div><div>{trips.length}</div></div>
                    <div className="info-card"><div>Active Vendors</div><div>{vendorTrips.length}</div></div>
                    <div className="info-card"><div>Active Guides</div><div>{guideTrips.length}</div></div>
                </div>
                <h2 className="section-title">Travel Partner Contact</h2>
                <div>
                    {trips.length ? trips.map((trip) => <ContactCard key={trip.id} title="Travel Partner" subtitle={`Trip: ${trip.id}`} status={statusLabel(trip)} icon="phone" onContact={toMessages} />)
                        : <EmptyPanel message="No accepted trips to coordinate yet." />}
                </div>
                <h2 className="section-title">Vendor Coordination</h2>
                <div>
                    {vendorTrips.length ? vendorTrips.map((trip) => <ContactCard key={trip.id} title={trip.vendor.name} subtitle={`${trip.vendor.type} - ${trip.id}`} status={trip.vendorStatus || 'Assigned'} icon="message" onContact={toMessages} />)
                        : <EmptyPanel message="No vendors assigned yet." />}
                </div>
                <h2 className="section-title">Tour Guide Coordination</h2>
                <div>
                    {guideTrips.length ? guideTrips.map((trip) => <ContactCard key={trip.id} title={trip.guide.name} subtitle={`Trip: ${trip.id} - ${trip.progress}% complete`} status={trip.guideStatus || 'Assigned'} icon="phone" onContact={toMessages} />)
                        : <EmptyPanel message="No guides assigned yet." />}
                </div>
            </div>
        </DashboardLayout>
    );
}
