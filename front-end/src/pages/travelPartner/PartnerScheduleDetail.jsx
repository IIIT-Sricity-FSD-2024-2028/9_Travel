import { Fragment } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import ScheduleDetailPage from '../../components/workflow/ScheduleDetailPage';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { acceptedTrips } from '../../services/workflow';

/**
 * ".detail-stats-header" bar of the partner schedule pages. The original markup had hard-coded
 * numbers; the same figures as the Traveler Schedules summary are shown instead.
 */
function DetailStatsHeader() {
    const trips = acceptedTrips(useWorkflowState());
    const stats = [
        ['users', 'Total Travelers', trips.length, ''],
        ['activity', 'Ongoing Trips', trips.filter((t) => t.status === 'ongoing' || (t.scheduleStarted && t.status !== 'completed')).length, 'green'],
        ['calendar', 'Upcoming Trips', trips.filter((t) => t.status !== 'completed' && t.status !== 'ongoing' && !t.scheduleStarted).length, 'blue'],
        ['checkcircle', 'Completed', trips.filter((t) => t.status === 'completed').length, 'gray'],
    ];
    return (
        <div className="detail-stats-header">
            {stats.map(([icon, label, value, tone], i) => (
                <Fragment key={label}>
                    {i > 0 && <div className="detail-stat-divider" />}
                    <div className="detail-stat-item">
                        <div className="detail-stat-icon"><Icon name={icon} /></div>
                        <div className="detail-stat-content">
                            <div className="detail-stat-label">{label}</div>
                            <div className={`detail-stat-value${tone ? ` ${tone}` : ''}`}>{value}</div>
                        </div>
                    </div>
                </Fragment>
            ))}
        </div>
    );
}

/** travelPartner_scheduleDetail_{upcoming,ongoing,completed}.html (renderScheduleDetailPages, editable for partners). */
function PartnerScheduleDetail({ page }) {
    return (
        <DashboardLayout role="partner" page={page} activeNav={PATHS.partner.travelerSchedules}>
            <DetailStatsHeader />
            <ScheduleDetailPage role="partner" />
        </DashboardLayout>
    );
}

export const PartnerScheduleUpcoming = () => <PartnerScheduleDetail page="travelPartner__travelPartner_scheduleDetail_upcoming" />;
export const PartnerScheduleOngoing = () => <PartnerScheduleDetail page="travelPartner__travelPartner_scheduleDetail_ongoing" />;
export const PartnerScheduleCompleted = () => <PartnerScheduleDetail page="travelPartner__travelPartner_scheduleDetail_completed" />;
