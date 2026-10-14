import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import NotificationFeed, { deleteBtnStyle } from '../../components/workflow/NotificationFeed';
import { PATHS } from '../../routes/paths';

/** vendor_notifications.html (renderVendorNotifications). */
export default function VendorNotifications() {
    const navigate = useNavigate();
    return (
        <DashboardLayout role="vendor" page="vendor__vendor_notifications">
            <div className="page-scroll">
                <div className="notification-page">
                    <div className="welcome-banner">
                        <h1>Vendor Notifications 🔔</h1>
                        <p>Stay updated with service assignments, schedule updates, and issue alerts.</p>
                    </div>
                    <NotificationFeed
                        role="vendor"
                        tabs={['All Notifications', 'Unread', 'Service Requests', 'System Alerts']}
                        isAmber={(type) => type.includes('request') || type.includes('service')}
                        renderActions={(item, isUnread, actions) => (
                            <>
                                <button type="button" className="t-btn t-btn-primary" onClick={() => navigate(PATHS.vendor.serviceRequests)}>View Requests</button>
                                {isUnread && <button type="button" className="t-btn t-btn-outline" onClick={() => actions.markRead(item.id)}>Mark as Read</button>}
                                <button type="button" className="t-btn t-btn-outline" title="Delete Notification" style={deleteBtnStyle} onClick={() => actions.deleteNotif(item.id)}><Icon name="trash" /> Delete</button>
                            </>
                        )}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
