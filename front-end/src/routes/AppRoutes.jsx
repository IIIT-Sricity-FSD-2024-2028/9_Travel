import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute, RoleProtectedRoute } from './ProtectedRoute';
import { PATHS, legacyUrlToRoute } from './paths';
import Loading from '../components/Loading';
import LandingPage from '../pages/LandingPage';
import Login from '../pages/Login';
import Register from '../pages/Register';
import BecomePartner from '../pages/BecomePartner';

const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

const T = PATHS.traveler;
const P = PATHS.partner;
const G = PATHS.guide;
const V = PATHS.vendor;
const S = PATHS.support;
const SU = PATHS.superuser;

// Modules that export several pages
const loadEditTrip = () => import('../pages/traveler/TravelerEditTrip');
const loadPartnerSchedule = () => import('../pages/travelPartner/PartnerScheduleDetail');
const loadPartnerAssignment = () => import('../pages/travelPartner/PartnerAssignment');
const loadGuideSchedule = () => import('../pages/guide/GuideScheduleDetail');
const loadVendorSchedule = () => import('../pages/vendor/VendorScheduleDetail');
const loadUserForm = () => import('../pages/superuser/SuperuserUserForm');
const loadTripForm = () => import('../pages/superuser/SuperuserTripForm');
const loadDirectory = () => import('../pages/superuser/SuperuserDirectory');

/** [path, component] per portal. */
const PORTAL_ROUTES = {
    traveler: [
        [T.dashboard, lazy(() => import('../pages/traveler/TravelerDashboard'))],
        [T.myTrips, lazy(() => import('../pages/traveler/TravelerMyTrips'))],
        [T.createTripPlan, lazy(() => import('../pages/traveler/TravelerCreateTripPlan'))],
        [T.customizeTrip, lazy(() => import('../pages/traveler/TravelerCustomizeTrip'))],
        [T.tripDetails, lazy(() => import('../pages/traveler/TravelerTripDetails'))],
        [T.editUpcoming, named(loadEditTrip, 'TravelerEditTripUpcoming')],
        [T.editOngoing, named(loadEditTrip, 'TravelerEditTripOngoing')],
        [T.schedule, lazy(() => import('../pages/traveler/TravelerSchedule'))],
        [T.progress, lazy(() => import('../pages/traveler/TravelerProgress'))],
        [T.alerts, lazy(() => import('../pages/traveler/TravelerAlerts'))],
        [T.messages, lazy(() => import('../pages/traveler/TravelerMessages'))],
        [T.reportIssue, lazy(() => import('../pages/traveler/TravelerReportIssue'))],
        [T.support, lazy(() => import('../pages/traveler/TravelerSupport'))],
        [T.profile, lazy(() => import('../pages/traveler/TravelerProfile'))],
    ],
    guide: [
        [G.dashboard, lazy(() => import('../pages/guide/GuideDashboard'))],
        [G.assignments, lazy(() => import('../pages/guide/GuideAssignments'))],
        [G.travelerSchedules, lazy(() => import('../pages/guide/GuideTravelerSchedules'))],
        [G.scheduleUpcoming, named(loadGuideSchedule, 'GuideScheduleUpcoming')],
        [G.scheduleOngoing, named(loadGuideSchedule, 'GuideScheduleOngoing')],
        [G.scheduleCompleted, named(loadGuideSchedule, 'GuideScheduleCompleted')],
        [G.notifications, lazy(() => import('../pages/guide/GuideNotifications'))],
        [G.tourUpdates, lazy(() => import('../pages/guide/GuideTourUpdates'))],
        [G.issueReporting, lazy(() => import('../pages/guide/GuideIssueReporting'))],
        [G.activityLog, lazy(() => import('../pages/guide/GuideActivityLog'))],
        [G.profile, lazy(() => import('../pages/guide/GuideProfile'))],
    ],
    vendor: [
        [V.dashboard, lazy(() => import('../pages/vendor/VendorDashboard'))],
        [V.notifications, lazy(() => import('../pages/vendor/VendorNotifications'))],
        [V.serviceRequests, lazy(() => import('../pages/vendor/VendorServiceRequests'))],
        [V.activeServices, lazy(() => import('../pages/vendor/VendorActiveServices'))],
        [V.travelerSchedules, lazy(() => import('../pages/vendor/VendorTravelerSchedules'))],
        [V.scheduleUpcoming, named(loadVendorSchedule, 'VendorScheduleUpcoming')],
        [V.scheduleOngoing, named(loadVendorSchedule, 'VendorScheduleOngoing')],
        [V.scheduleCompleted, named(loadVendorSchedule, 'VendorScheduleCompleted')],
        [V.serviceUpdates, lazy(() => import('../pages/vendor/VendorServiceUpdates'))],
        [V.reportIssue, lazy(() => import('../pages/vendor/VendorReportIssue'))],
        [V.serviceHistory, lazy(() => import('../pages/vendor/VendorServiceHistory'))],
        [V.profile, lazy(() => import('../pages/vendor/VendorProfile'))],
    ],
    support: [
        [S.dashboard, lazy(() => import('../pages/support/SupportDashboard'))],
        [S.notifications, lazy(() => import('../pages/support/SupportNotifications'))],
        [S.reportedIssues, lazy(() => import('../pages/support/SupportReportedIssues'))],
        [S.issueLog, lazy(() => import('../pages/support/SupportIssueLog'))],
        [S.coordinationPanel, lazy(() => import('../pages/support/SupportCoordinationPanel'))],
        [S.emergencySupport, lazy(() => import('../pages/support/SupportEmergency'))],
        [S.resolutionUpdates, lazy(() => import('../pages/support/SupportResolutionUpdates'))],
        [S.tripStatus, lazy(() => import('../pages/support/SupportTripStatus'))],
        [S.tripDetails, lazy(() => import('../pages/support/SupportTripDetails'))],
        [S.messages, lazy(() => import('../pages/support/SupportMessages'))],
        [S.profile, lazy(() => import('../pages/support/SupportProfile'))],
    ],
    partner: [
        [P.dashboard, lazy(() => import('../pages/travelPartner/PartnerDashboard'))],
        [P.trips, lazy(() => import('../pages/travelPartner/PartnerTrips'))],
        [P.createTrip, lazy(() => import('../pages/travelPartner/PartnerCreateTrip'))],
        [P.packages, lazy(() => import('../pages/travelPartner/PartnerPackages'))],
        [P.travelerSchedules, lazy(() => import('../pages/travelPartner/PartnerTravelerSchedules'))],
        [P.scheduleUpcoming, named(loadPartnerSchedule, 'PartnerScheduleUpcoming')],
        [P.scheduleOngoing, named(loadPartnerSchedule, 'PartnerScheduleOngoing')],
        [P.scheduleCompleted, named(loadPartnerSchedule, 'PartnerScheduleCompleted')],
        [P.vendorAssignment, named(loadPartnerAssignment, 'PartnerVendorAssignment')],
        [P.guideAssignment, named(loadPartnerAssignment, 'PartnerGuideAssignment')],
        [P.notifications, lazy(() => import('../pages/travelPartner/PartnerNotifications'))],
        [P.execution, lazy(() => import('../pages/travelPartner/PartnerExecution'))],
        [P.quickActions, lazy(() => import('../pages/travelPartner/PartnerQuickActions'))],
        [P.profile, lazy(() => import('../pages/travelPartner/PartnerProfile'))],
    ],
    superuser: [
        [SU.dashboard, lazy(() => import('../pages/superuser/SuperuserDashboard'))],
        [SU.users, lazy(() => import('../pages/superuser/SuperuserUsers'))],
        [SU.partnerApplications, lazy(() => import('../pages/superuser/SuperuserPartnerApplications'))],
        [SU.addUser, named(loadUserForm, 'SuperuserAddUser')],
        [SU.editUser, named(loadUserForm, 'SuperuserEditUser')],
        [SU.packages, lazy(() => import('../pages/superuser/SuperuserPackages'))],
        [SU.trips, lazy(() => import('../pages/superuser/SuperuserTrips'))],
        [SU.addTrip, named(loadTripForm, 'SuperuserAddTrip')],
        [SU.editTrip, named(loadTripForm, 'SuperuserEditTrip')],
        [SU.viewTrip, lazy(() => import('../pages/superuser/SuperuserViewTrip'))],
        [SU.vendors, named(loadDirectory, 'SuperuserVendors')],
        [SU.guides, named(loadDirectory, 'SuperuserGuides')],
        [SU.alerts, lazy(() => import('../pages/superuser/SuperuserAlerts'))],
        [SU.support, lazy(() => import('../pages/superuser/SuperuserSupport'))],
        [SU.reports, lazy(() => import('../pages/superuser/SuperuserReports'))],
        [SU.settings, lazy(() => import('../pages/superuser/SuperuserSettings'))],
    ],
};

/** Old bookmarked *.html URLs are redirected to their React route; anything else goes home. */
function Fallback() {
    const location = useLocation();
    const target = legacyUrlToRoute(location.pathname);
    return <Navigate to={target ? `${target}${location.search}` : PATHS.landing} replace />;
}

export default function AppRoutes() {
    return (
        <Suspense fallback={<Loading message="Loading page..." />}>
            <Routes>
                <Route path={PATHS.landing} element={<LandingPage />} />
                <Route path={PATHS.login} element={<Login />} />
                <Route path={PATHS.register} element={<Register />} />
                <Route path={PATHS.becomePartner} element={<BecomePartner />} />
                <Route element={<ProtectedRoute />}>
                    {Object.entries(PORTAL_ROUTES).map(([role, routes]) => (
                        <Route key={role} element={<RoleProtectedRoute role={role} />}>
                            {routes.map(([path, Component]) => <Route key={path} path={path} element={<Component />} />)}
                        </Route>
                    ))}
                </Route>
                <Route path="*" element={<Fallback />} />
            </Routes>
        </Suspense>
    );
}
