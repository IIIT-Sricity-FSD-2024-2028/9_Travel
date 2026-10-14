import DashboardLayout from '../../layouts/DashboardLayout';
import ScheduleDetailPage from '../../components/workflow/ScheduleDetailPage';
import { PATHS } from '../../routes/paths';

/** guide/traveler_schedule_{upcoming,ongoing,completed}.html (renderScheduleDetailPages). */
function GuideScheduleDetail({ page }) {
    return (
        <DashboardLayout role="guide" page={page} activeNav={PATHS.guide.travelerSchedules}>
            <ScheduleDetailPage role="guide" containerId="guide-schedules" />
        </DashboardLayout>
    );
}

export const GuideScheduleUpcoming = () => <GuideScheduleDetail page="guide__traveler_schedule_upcoming" />;
export const GuideScheduleOngoing = () => <GuideScheduleDetail page="guide__traveler_schedule_ongoing" />;
export const GuideScheduleCompleted = () => <GuideScheduleDetail page="guide__traveler_schedule_completed" />;
