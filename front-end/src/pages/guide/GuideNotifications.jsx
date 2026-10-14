import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import NotificationFeed, { deleteBtnStyle } from '../../components/workflow/NotificationFeed';
import { PATHS } from '../../routes/paths';

/** guide/notifications.html (renderGuideNotifications). */
export default function GuideNotifications() {
    const navigate = useNavigate();
    return (
        <DashboardLayout role="guide" page="guide__notifications">
            <div className="page-content">
                <div className="notification-page">
                    <div className="welcome-banner">
                        <h1 className="text-2xl font-bold text-white mb-2">My Notifications 🔔</h1>
                        <p className="text-white opacity-90">Stay updated with your latest assignments and tour alerts.</p>
                    </div>
                    <NotificationFeed
                        role="guide"
                        tabs={['All Notifications', 'Unread', 'Assignments', 'System Alerts']}
                        isAmber={(type) => type.includes('assign')}
                        renderActions={(item, isUnread, actions) => (
                            <>
                                <button type="button" className="btn btn-primary small" onClick={() => navigate(String(item.title).toLowerCase().includes('assign') ? PATHS.guide.assignments : PATHS.guide.tourUpdates)}>Open</button>
                                {isUnread && <button type="button" className="btn btn-secondary small" onClick={() => actions.markRead(item.id)}>Mark as Read</button>}
                                <button type="button" className="btn btn-secondary small text-red-500" title="Delete Notification" style={deleteBtnStyle} onClick={() => actions.deleteNotif(item.id)}><Icon name="trash" /> Delete</button>
                            </>
                        )}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
