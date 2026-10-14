/**
 * Route paths of the React app and the mapping from the original HTML file names.
 */
export const PATHS = {
    landing: '/',
    login: '/login',
    register: '/register',
    becomePartner: '/become-partner',
    traveler: {
        dashboard: '/traveler/dashboard',
        myTrips: '/traveler/my-trips',
        createTripPlan: '/traveler/create-trip-plan',
        customizeTrip: '/traveler/customize-trip',
        tripDetails: '/traveler/trip-details',
        editUpcoming: '/traveler/edit-trip/upcoming',
        editOngoing: '/traveler/edit-trip/ongoing',
        schedule: '/traveler/schedule',
        progress: '/traveler/progress',
        alerts: '/traveler/alerts',
        messages: '/traveler/messages',
        reportIssue: '/traveler/report-issue',
        support: '/traveler/support',
        profile: '/traveler/profile',
    },
    partner: {
        dashboard: '/travel-partner/dashboard',
        trips: '/travel-partner/trips',
        createTrip: '/travel-partner/create-trip',
        packages: '/travel-partner/packages',
        travelerSchedules: '/travel-partner/traveler-schedules',
        scheduleUpcoming: '/travel-partner/schedule/upcoming',
        scheduleOngoing: '/travel-partner/schedule/ongoing',
        scheduleCompleted: '/travel-partner/schedule/completed',
        vendorAssignment: '/travel-partner/vendor-assignment',
        guideAssignment: '/travel-partner/guide-assignment',
        notifications: '/travel-partner/notifications',
        execution: '/travel-partner/execution',
        quickActions: '/travel-partner/quick-actions',
        profile: '/travel-partner/profile',
    },
    vendor: {
        dashboard: '/vendor/dashboard',
        notifications: '/vendor/notifications',
        serviceRequests: '/vendor/service-requests',
        activeServices: '/vendor/active-services',
        travelerSchedules: '/vendor/traveler-schedules',
        scheduleUpcoming: '/vendor/schedule/upcoming',
        scheduleOngoing: '/vendor/schedule/ongoing',
        scheduleCompleted: '/vendor/schedule/completed',
        serviceUpdates: '/vendor/service-updates',
        reportIssue: '/vendor/report-issue',
        serviceHistory: '/vendor/service-history',
        profile: '/vendor/profile',
    },
    guide: {
        dashboard: '/guide/dashboard',
        assignments: '/guide/assignments',
        travelerSchedules: '/guide/traveler-schedules',
        scheduleUpcoming: '/guide/schedule/upcoming',
        scheduleOngoing: '/guide/schedule/ongoing',
        scheduleCompleted: '/guide/schedule/completed',
        notifications: '/guide/notifications',
        tourUpdates: '/guide/tour-updates',
        issueReporting: '/guide/issue-reporting',
        activityLog: '/guide/activity-log',
        profile: '/guide/profile',
    },
    support: {
        dashboard: '/support/dashboard',
        notifications: '/support/notifications',
        reportedIssues: '/support/reported-issues',
        issueLog: '/support/issue-log',
        coordinationPanel: '/support/coordination-panel',
        emergencySupport: '/support/emergency-support',
        resolutionUpdates: '/support/resolution-updates',
        tripStatus: '/support/trip-status',
        tripDetails: '/support/trip-details',
        messages: '/support/messages',
        profile: '/support/profile',
    },
    superuser: {
        dashboard: '/superuser/dashboard',
        users: '/superuser/users',
        partnerApplications: '/superuser/partner-applications',
        addUser: '/superuser/users/new',
        editUser: '/superuser/users/edit',
        packages: '/superuser/packages',
        trips: '/superuser/trips',
        addTrip: '/superuser/trips/new',
        editTrip: '/superuser/trips/edit',
        viewTrip: '/superuser/trips/view',
        vendors: '/superuser/vendors',
        guides: '/superuser/guides',
        alerts: '/superuser/alerts',
        support: '/superuser/support',
        reports: '/superuser/reports',
        settings: '/superuser/settings',
    },
};

/** Sidebar entries per role – identical labels, icons and order to the original sidebars. */
export const NAV_ITEMS = {
    traveler: [
        [PATHS.traveler.dashboard, 'dashboard', 'Dashboard'],
        [PATHS.traveler.myTrips, 'plane', 'My Trips'],
        [PATHS.traveler.schedule, 'calendar', 'Schedule'],
        [PATHS.traveler.progress, 'activity', 'Progress'],
        [PATHS.traveler.alerts, 'bell', 'Notifications & Alerts'],
        [PATHS.traveler.messages, 'message', 'Messages'],
        [PATHS.traveler.reportIssue, 'alert', 'Report Issue'],
        [PATHS.traveler.support, 'headphones', 'Support'],
        [PATHS.traveler.profile, 'user', 'Profile'],
    ],
    partner: [
        [PATHS.partner.dashboard, 'dashboard', 'Dashboard'],
        [PATHS.partner.trips, 'plane', 'Trips'],
        [PATHS.partner.packages, 'package', 'Package Catalog'],
        [PATHS.partner.travelerSchedules, 'calendar', 'Traveler Schedules'],
        [PATHS.partner.vendorAssignment, 'users', 'Vendor Assignment'],
        [PATHS.partner.guideAssignment, 'mappin', 'Guide Assignment'],
        [PATHS.partner.notifications, 'bell', 'Notifications'],
        [PATHS.partner.execution, 'trendingup', 'Execution'],
        [PATHS.partner.quickActions, 'zap', 'Quick Actions'],
        [PATHS.partner.profile, 'user', 'Profile'],
    ],
    vendor: [
        [PATHS.vendor.dashboard, 'dashboard', 'Dashboard'],
        [PATHS.vendor.notifications, 'bell', 'Notifications'],
        [PATHS.vendor.serviceRequests, 'clipboard', 'Service Requests'],
        [PATHS.vendor.activeServices, 'activity', 'Active Services'],
        [PATHS.vendor.travelerSchedules, 'calendar', 'Traveler Schedules'],
        [PATHS.vendor.serviceUpdates, 'message', 'Service Updates'],
        [PATHS.vendor.reportIssue, 'alert', 'Report Issue'],
        [PATHS.vendor.serviceHistory, 'clock', 'Service History'],
        [PATHS.vendor.profile, 'user', 'Profile'],
    ],
    guide: [
        [PATHS.guide.dashboard, 'dashboard', 'Dashboard'],
        [PATHS.guide.assignments, 'clipboard', 'Assignments'],
        [PATHS.guide.travelerSchedules, 'calendar', 'Traveler Schedules'],
        [PATHS.guide.notifications, 'bell', 'Notifications'],
        [PATHS.guide.tourUpdates, 'message', 'Tour Updates'],
        [PATHS.guide.issueReporting, 'alert', 'Issue Reporting'],
        [PATHS.guide.activityLog, 'activity', 'Activity Log'],
        [PATHS.guide.profile, 'user', 'Profile'],
    ],
    support: [
        [PATHS.support.dashboard, 'dashboard', 'Dashboard'],
        [PATHS.support.notifications, 'bell', 'Notifications'],
        [PATHS.support.reportedIssues, 'alert', 'Reported Issues'],
        [PATHS.support.issueLog, 'file', 'Issue Log'],
        [PATHS.support.coordinationPanel, 'users', 'Coordination Panel'],
        [PATHS.support.emergencySupport, 'phone', 'Emergency Support'],
        [PATHS.support.resolutionUpdates, 'checkcircle', 'Resolution Updates'],
        [PATHS.support.tripStatus, 'activity', 'Trip Status Monitor'],
        [PATHS.support.messages, 'message', 'Messages'],
        [PATHS.support.profile, 'user', 'Profile'],
    ],
    superuser: [
        [PATHS.superuser.dashboard, 'dashboard', 'Dashboard'],
        [PATHS.superuser.users, 'users', 'Users'],
        [PATHS.superuser.partnerApplications, 'filetext', 'Partner Applications'],
        [PATHS.superuser.packages, 'briefcase', 'Packages'],
        [PATHS.superuser.trips, 'plane', 'Trips'],
        [PATHS.superuser.vendors, 'briefcase', 'Vendors'],
        [PATHS.superuser.guides, 'map', 'Guides'],
        [PATHS.superuser.alerts, 'bell', 'Notifications'],
        [PATHS.superuser.support, 'headphones', 'Support'],
        [PATHS.superuser.reports, 'filetext', 'Reports'],
        [PATHS.superuser.settings, 'settings', 'Settings'],
    ],
};

export const PORTAL_PROFILE = {
    traveler: PATHS.traveler.profile,
    partner: PATHS.partner.profile,
    vendor: PATHS.vendor.profile,
    guide: PATHS.guide.profile,
    support: PATHS.support.profile,
    superuser: PATHS.superuser.settings,
};

export const PORTAL_NOTIFICATIONS = {
    traveler: PATHS.traveler.alerts,
    partner: PATHS.partner.notifications,
    vendor: PATHS.vendor.notifications,
    guide: PATHS.guide.notifications,
    support: PATHS.support.notifications,
    superuser: PATHS.superuser.alerts,
};

/** Original file name → React route, per portal (used for data-driven links such as notification actions). */
const LEGACY_FILES = {
    traveler: {
        'traveler_dashboard.html': PATHS.traveler.dashboard,
        'traveler_mytrips.html': PATHS.traveler.myTrips,
        'traveler_create_trip_plan.html': PATHS.traveler.createTripPlan,
        'traveler_customize_trip.html': PATHS.traveler.customizeTrip,
        'traveler_trip_details.html': PATHS.traveler.tripDetails,
        'traveler_edit_trip_upcoming.html': PATHS.traveler.editUpcoming,
        'traveler_edit_trip_ongoing.html': PATHS.traveler.editOngoing,
        'traveler_schedule.html': PATHS.traveler.schedule,
        'traveler_progress.html': PATHS.traveler.progress,
        'traveler_alerts.html': PATHS.traveler.alerts,
        'traveler_messages.html': PATHS.traveler.messages,
        'traveler_report_issue.html': PATHS.traveler.reportIssue,
        'traveler_support.html': PATHS.traveler.support,
        'traveler_profile.html': PATHS.traveler.profile,
    },
    travelPartner: {
        'travelPartner_dashboard.html': PATHS.partner.dashboard,
        'travelPartner_trips.html': PATHS.partner.trips,
        'travelPartner_createTrip.html': PATHS.partner.createTrip,
        'travelPartner_packages.html': PATHS.partner.packages,
        'travelPartner_travelerSchedules.html': PATHS.partner.travelerSchedules,
        'travelPartner_scheduleDetail_upcoming.html': PATHS.partner.scheduleUpcoming,
        'travelPartner_scheduleDetail_ongoing.html': PATHS.partner.scheduleOngoing,
        'travelPartner_scheduleDetail_completed.html': PATHS.partner.scheduleCompleted,
        'travelPartner_vendorAssignment.html': PATHS.partner.vendorAssignment,
        'travelPartner_guideAssignment.html': PATHS.partner.guideAssignment,
        'travelPartner_notifications.html': PATHS.partner.notifications,
        'travelPartner_execution.html': PATHS.partner.execution,
        'travelPartner_quickActions.html': PATHS.partner.quickActions,
        'travelPartner_profile.html': PATHS.partner.profile,
    },
    vendor: {
        'vendor_dashboard.html': PATHS.vendor.dashboard,
        'vendor_notifications.html': PATHS.vendor.notifications,
        'vendor_service_requests.html': PATHS.vendor.serviceRequests,
        'vendor_active_services.html': PATHS.vendor.activeServices,
        'vendor_traveler_schedules.html': PATHS.vendor.travelerSchedules,
        'vendor_traveler_schedule_upcoming.html': PATHS.vendor.scheduleUpcoming,
        'vendor_traveler_schedule_ongoing.html': PATHS.vendor.scheduleOngoing,
        'vendor_traveler_schedule_completed.html': PATHS.vendor.scheduleCompleted,
        'vendor_service_updates.html': PATHS.vendor.serviceUpdates,
        'vendor_report_issue.html': PATHS.vendor.reportIssue,
        'vendor_service_history.html': PATHS.vendor.serviceHistory,
        'vendor_profile.html': PATHS.vendor.profile,
    },
    guide: {
        'dashboard.html': PATHS.guide.dashboard,
        'assignments.html': PATHS.guide.assignments,
        'traveler_schedules.html': PATHS.guide.travelerSchedules,
        'traveler_schedule_upcoming.html': PATHS.guide.scheduleUpcoming,
        'traveler_schedule_ongoing.html': PATHS.guide.scheduleOngoing,
        'traveler_schedule_completed.html': PATHS.guide.scheduleCompleted,
        'notifications.html': PATHS.guide.notifications,
        'tour_updates.html': PATHS.guide.tourUpdates,
        'issue_reporting.html': PATHS.guide.issueReporting,
        'activity_log.html': PATHS.guide.activityLog,
        'profile.html': PATHS.guide.profile,
    },
    support: {
        'dashboard.html': PATHS.support.dashboard,
        'notifications.html': PATHS.support.notifications,
        'reported_issues.html': PATHS.support.reportedIssues,
        'issue_log.html': PATHS.support.issueLog,
        'coordination_panel.html': PATHS.support.coordinationPanel,
        'emergency_support.html': PATHS.support.emergencySupport,
        'resolution_updates.html': PATHS.support.resolutionUpdates,
        'trip_status.html': PATHS.support.tripStatus,
        'trip_details.html': PATHS.support.tripDetails,
        'messages.html': PATHS.support.messages,
        'profile.html': PATHS.support.profile,
    },
    superuser: {
        'superuser_dashboard.html': PATHS.superuser.dashboard,
        'superuser_users.html': PATHS.superuser.users,
        'superuser_add_user.html': PATHS.superuser.addUser,
        'superuser_edit_user.html': PATHS.superuser.editUser,
        'superuser_packages.html': PATHS.superuser.packages,
        'superuser_trips.html': PATHS.superuser.trips,
        'superuser_add_trip.html': PATHS.superuser.addTrip,
        'superuser_edit_trip.html': PATHS.superuser.editTrip,
        'superuser_view_trip.html': PATHS.superuser.viewTrip,
        'superuser_vendors.html': PATHS.superuser.vendors,
        'superuser_guides.html': PATHS.superuser.guides,
        'superuser_alerts.html': PATHS.superuser.alerts,
        'superuser_support.html': PATHS.superuser.support,
        'superuser_reports.html': PATHS.superuser.reports,
        'superuser_settings.html': PATHS.superuser.settings,
    },
};

const ROLE_FOLDER = { traveler: 'traveler', partner: 'travelPartner', vendor: 'vendor', guide: 'guide', support: 'support', superuser: 'superuser' };

/** Converts an original target such as "travelPartner_trips.html?trip=TRIP-3" to a React route for the portal. */
export function legacyTarget(role, target) {
    if (!target) return '';
    const [file, query] = String(target).split('?');
    const map = LEGACY_FILES[ROLE_FOLDER[role]] || {};
    const path = map[file] || file;
    return query ? `${path}?${query}` : path;
}

/** Redirect table for old bookmarked URLs (/pages/<role>/<file>.html, /login.html, ...). */
export function legacyUrlToRoute(pathname) {
    const path = decodeURIComponent(pathname || '');
    if (/\/(landing_page|index)\.html$/i.test(path)) return PATHS.landing;
    if (/\/login\.html$/i.test(path)) return PATHS.login;
    if (/\/register\.html$/i.test(path)) return PATHS.register;
    const match = path.match(/\/pages\/([^/]+)\/([^/]+\.html)$/);
    if (match) {
        const folder = LEGACY_FILES[match[1]];
        if (folder && folder[match[2]]) return folder[match[2]];
    }
    return null;
}
