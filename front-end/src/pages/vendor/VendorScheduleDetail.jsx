import DashboardLayout from '../../layouts/DashboardLayout';
import ScheduleDetailPage from '../../components/workflow/ScheduleDetailPage';
import { PATHS } from '../../routes/paths';

/** vendor_traveler_schedule_{upcoming,ongoing,completed}.html (renderScheduleDetailPages). */
function VendorScheduleDetail({ page }) {
    return (
        <DashboardLayout role="vendor" page={page} activeNav={PATHS.vendor.travelerSchedules}>
            <ScheduleDetailPage role="vendor" containerClass="page-scroll" />
        </DashboardLayout>
    );
}

export const VendorScheduleUpcoming = () => <VendorScheduleDetail page="vendor__vendor_traveler_schedule_upcoming" />;
export const VendorScheduleOngoing = () => <VendorScheduleDetail page="vendor__vendor_traveler_schedule_ongoing" />;
export const VendorScheduleCompleted = () => <VendorScheduleDetail page="vendor__vendor_traveler_schedule_completed" />;
