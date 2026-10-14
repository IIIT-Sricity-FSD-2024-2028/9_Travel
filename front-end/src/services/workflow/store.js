/**
 * Workflow state store.
 *
 * This is the React port of the state layer in the original js/workflow.js:
 *  - the full workflow state is cached in localStorage (`dd_workflow_state_v4`)
 *  - it is hydrated from GET /workflow/state on the NestJS backend
 *  - every change is persisted back with PUT /workflow/state
 *
 * React components subscribe to it through `useSyncExternalStore`
 * (see context/WorkflowContext.jsx) instead of re-rendering the DOM by hand.
 */
import { workflowApi } from '../api';
import { normRole, readStoredSession } from '../session';
import { ROLE_LABELS, SESSION_OWNER_KEY, STAKEHOLDER_ROLES, STORE_KEY } from './constants';
import { ensureTripSchedule, normalizeScheduleItem, scheduleStats } from './schedule';
import { nowISO, stageLabel } from './utils';

// ---------------------------------------------------------------------------
// Runtime context (replaces window globals / roleFromPath / Toast / NotificationPopup)
// ---------------------------------------------------------------------------
const runtime = {
    role: '',
    notify: (message, type) => console.info(`[${type || 'info'}] ${message}`),
    popup: () => {},
    onPersistError: () => {},
};

export function configureWorkflow(partial) {
    Object.assign(runtime, partial);
}

/** Active session (stored by the login page). */
export function currentSession() {
    return readStoredSession() || {};
}

/** Portal role of the page being rendered – equivalent of the original roleFromPath(). */
export function currentRole() {
    return runtime.role || normRole(currentSession().role) || 'traveler';
}

export function notify(message, type = 'success') {
    runtime.notify(message, type);
}

// ---------------------------------------------------------------------------
// Seed + normalisation (verbatim logic from workflow.js)
// ---------------------------------------------------------------------------
export function makeUpdate(source, title, message, status, createdAt) {
    return {
        id: `UPD-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        source,
        title,
        message,
        status: status || 'Info',
        createdAt: createdAt || nowISO(),
    };
}

export function makeNotification(roles, trip, title, message, type, createdAt) {
    return {
        id: `NTF-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        roles: Array.isArray(roles) ? roles : [roles],
        tripId: trip?.id || '',
        tripTitle: trip?.title || '',
        userEmail: trip?.travelerEmail || '',
        travelerEmail: trip?.travelerEmail || '',
        travelerName: trip?.travelerName || '',
        guideEmail: trip?.assignedGuideEmail || trip?.guideEmail || trip?.guide?.email || '',
        guideName: trip?.guide?.name || '',
        vendorEmail: trip?.assignedVendorEmail || trip?.vendorEmail || trip?.vendor?.email || '',
        vendorName: trip?.vendor?.name || '',
        partnerEmail: trip?.partnerEmail || '',
        title,
        message,
        type: type || 'info',
        readBy: [],
        createdAt: createdAt || nowISO(),
    };
}

export function normalizeTrip(trip) {
    const safe = { ...trip };
    safe.id = safe.id || `TRIP-${Date.now()}`;
    safe.requestId = safe.requestId || safe.id.replace('TRIP', 'REQ');
    safe.title = safe.title || safe.packageName || `${safe.destination || 'Custom'} Trip`;
    safe.destination = safe.destination || 'Custom destination';
    safe.travelerName = safe.travelerName || 'Traveler';
    safe.travelerEmail = safe.travelerEmail || '';
    safe.startDate = safe.startDate || '';
    safe.endDate = safe.endDate || '';
    safe.adults = Number(safe.adults || safe.numAdults || 1);
    safe.children = Number(safe.children || safe.numChildren || 0);
    safe.travelersCount = Number(safe.travelersCount || safe.adults + safe.children || 1);
    safe.budget = Number(safe.budget || 0);
    safe.status = safe.status || 'requested';
    safe.requestStatus = safe.requestStatus || (safe.status === 'requested' ? 'Requested' : 'Accepted');
    safe.stage = safe.stage || stageLabel(safe);
    safe.guideStatus = safe.guideStatus || (safe.guide ? 'Assigned' : 'Pending');
    safe.vendorStatus = safe.vendorStatus || (safe.vendor ? 'Requested' : 'Pending');
    safe.serviceStatus = safe.serviceStatus || safe.vendorStatus;
    safe.progress = Number(safe.progress || 0);
    safe.startedAt = safe.startedAt || '';
    safe.completedAt = safe.completedAt || '';
    safe.scheduleStarted = Boolean(safe.scheduleStarted || safe.status === 'ongoing' || safe.status === 'completed');
    safe.currentLocation = safe.currentLocation || safe.destination;
    safe.currentActivity = safe.currentActivity || 'Awaiting trip coordination';
    safe.accommodationType = safe.accommodationType || 'standard';
    safe.tripPace = safe.tripPace || 'moderate';
    safe.interests = Array.isArray(safe.interests) ? safe.interests : [];
    safe.notes = safe.notes || '';
    safe.createdAt = safe.createdAt || nowISO();
    safe.updatedAt = safe.updatedAt || safe.createdAt;
    safe.updates = Array.isArray(safe.updates) ? safe.updates : [];
    safe.schedule = Array.isArray(safe.schedule) ? safe.schedule.map((item, index) => normalizeScheduleItem(item, index, safe)) : [];
    if (safe.scheduleStarted || safe.status === 'ongoing' || safe.status === 'completed') {
        ensureTripSchedule(safe);
        const stats = scheduleStats(safe);
        safe.progress = safe.status === 'completed' ? 100 : (50 + Math.round(stats.percent * 0.5));
        safe.currentActivity = safe.currentActivity || stats.current?.title || 'Schedule started';
        safe.currentLocation = safe.currentLocation || stats.current?.location || safe.destination;
    } else {
        // The original renderers lazily built the package schedule the first time a page
        // asked for it; building it here keeps render functions free of side effects.
        ensureTripSchedule(safe);
    }
    return safe;
}

export function normalizeIssue(issue, index) {
    return {
        ...issue,
        id: issue.id || `ISS-${5421 + index}`,
        tripId: issue.tripId || '',
        tripTitle: issue.tripTitle || '',
        reportedBy: issue.reportedBy || 'User',
        reporterRole: issue.reporterRole || 'Traveler',
        type: issue.type || 'General',
        title: issue.title || issue.type || 'Reported Issue',
        description: issue.description || '',
        priority: issue.priority || issue.urgency || 'Medium',
        attachmentUrl: issue.attachmentUrl || issue.photoUrl || issue.screenshotUrl || '',
        status: issue.status || 'Open',
        resolution: issue.resolution || '',
        createdAt: issue.createdAt || nowISO(),
        resolvedAt: issue.resolvedAt || '',
    };
}

export function normalizeMessage(message, index) {
    const toRoles = Array.isArray(message.toRoles) ? message.toRoles : [message.toRole || 'all'];
    const fromRole = message.fromRole || 'traveler';
    const readBy = Array.isArray(message.readBy) ? [...message.readBy] : [];
    if (!readBy.includes(fromRole)) readBy.push(fromRole);
    return {
        id: message.id || `MSG-${Date.now()}-${index}`,
        tripId: message.tripId || '',
        tripTitle: message.tripTitle || '',
        fromRole,
        fromName: message.fromName || ROLE_LABELS[fromRole] || 'Member',
        toRoles: toRoles.length ? toRoles : ['all'],
        body: message.body || message.message || '',
        createdAt: message.createdAt || nowISO(),
        readBy,
    };
}

export function seedState() {
    const ago = (ms) => new Date(Date.now() - ms).toISOString();
    return {
        version: 5,
        nextTripNumber: 1,
        nextIssueNumber: 1,
        guides: [],
        vendors: [],
        users: [
            { id: 'USER-1', name: 'Super Admin', email: 'superadmin@gmail.com', role: 'Super User', status: 'Active', joined: nowISO() },
            { id: 'USER-2', name: 'N Bharath', email: 'traveler@gmail.com', role: 'Traveler', status: 'Active', joined: nowISO() },
            { id: 'USER-3', name: 'Dileep', email: 'dileep@gmail.com', role: 'Travel Partner', status: 'Active', joined: nowISO() },
            { id: 'USER-4', name: 'Mahendra', email: 'mahendra@gmail.com', role: 'Support Executive', status: 'Active', joined: nowISO() },
            { id: 'USER-5', name: 'Lokesh', email: 'lokesh@gmail.com', role: 'Vendor', status: 'Active', joined: nowISO() },
            { id: 'USER-6', name: 'Koushik', email: 'koushik@gmail.com', role: 'Tour Guide', status: 'Active', joined: nowISO() },
        ],
        notifications: [
            { id: 'NTF-SEED-G1', roles: ['guide'], title: 'New Tour Assignment', message: 'You have been assigned as the primary guide for the "Swiss Alps Expedition" starting on April 5th.', type: 'Assignment', createdAt: ago(120000), readBy: [] },
            { id: 'NTF-SEED-G2', roles: ['guide'], title: 'Message from Traveler', message: 'Anjali Sharma (Swiss Alps Expedition) sent a message regarding luggage policy.', type: 'Message', createdAt: ago(3600000), readBy: [] },
            { id: 'NTF-SEED-G3', roles: ['guide'], title: 'Trip Completed Successfully', message: 'The "Culture Trail: Jaipur" tour has been marked as completed. Traveler feedback is pending.', type: 'Completed', createdAt: ago(86400000), readBy: ['guide'] },
            { id: 'NTF-SEED-G4', roles: ['guide'], title: 'Urgent System Alert', message: 'Mandatory guide briefing for upcoming seasonal tours is scheduled for tomorrow at 10 AM.', type: 'Warning', createdAt: ago(172800000), readBy: [] },
            { id: 'NTF-SEED-V1', roles: ['vendor'], title: 'New Service Request', message: 'You have been assigned to provide hotel and transfer services for Ooty Hills & Tea Explorer (TRP-101).', type: 'Service Request', createdAt: ago(300000), readBy: [] },
            { id: 'NTF-SEED-V2', roles: ['vendor'], title: 'Service Confirmation Approved', message: 'Travel Partner approved luxury coach service for Swiss Alps Expedition.', type: 'Confirmed', createdAt: ago(7200000), readBy: [] },
            { id: 'NTF-SEED-V3', roles: ['vendor'], title: 'Vendor Maintenance Notice', message: 'Vendor portal scheduled maintenance tonight at 02:00 AM UTC.', type: 'Warning', createdAt: ago(100000000), readBy: ['vendor'] },
            { id: 'NTF-SEED-S1', roles: ['support'], title: 'Support Ticket Logged', message: 'An issue requires support coordination and resolution updates.', type: 'Support Ticket', createdAt: ago(600000), readBy: [] },
            { id: 'NTF-SEED-S2', roles: ['support'], title: 'Emergency Support Requested', message: 'Tour Guide Koushik reported an urgent flight delay issue for Rome Tour group.', type: 'Emergency Alert', createdAt: ago(5400000), readBy: [] },
            { id: 'NTF-SEED-S3', roles: ['support'], title: 'Issue Resolution Update', message: 'Ticket #ISS-104 (Transfer Bus AC Repair) confirmed resolved.', type: 'Resolved', createdAt: ago(90000000), readBy: ['support'] },
            { id: 'NTF-SEED-T1', roles: ['traveler'], title: 'Weather Alert', message: 'Rain expected tomorrow afternoon in Paris. Consider bringing an umbrella for outdoor tours.', type: 'Warning', createdAt: ago(900000), readBy: [] },
            { id: 'NTF-SEED-T2', roles: ['traveler'], title: 'Schedule Change', message: 'Seine River Cruise timing updated from 5:00 PM to 6:00 PM.', type: 'Trip Update', createdAt: ago(3600000), readBy: [] },
            { id: 'NTF-SEED-T3', roles: ['traveler'], title: 'Hotel Check-in Approved', message: 'Early check-in approved at Grand Hotel Paris starting from 11:00 AM.', type: 'Approved', createdAt: ago(10800000), readBy: ['traveler'] },
            { id: 'NTF-SEED-T4', roles: ['traveler'], title: 'Guide Assignment Confirmation', message: 'Koushik has been assigned as your expert local guide for Ooty Hills & Tea Explorer.', type: 'Assignment', createdAt: ago(172800000), readBy: [] },
            { id: 'NTF-SEED-SU1', roles: ['superuser'], title: 'Platform High-Load Alert', message: 'API server CPU load reached 85% during peak booking window.', type: 'Critical', createdAt: ago(1800000), readBy: [] },
            { id: 'NTF-SEED-SU2', roles: ['superuser'], title: 'New User Registration Surge', message: 'Over 150 new traveler accounts registered in the past 24 hours.', type: 'System Alert', createdAt: ago(7200000), readBy: [] },
            { id: 'NTF-SEED-SU3', roles: ['superuser'], title: 'Database Backup Completed', message: 'Automated daily database snapshot archived to cloud storage.', type: 'System Alert', createdAt: ago(86400000), readBy: ['superuser'] },
        ],
        trips: [
            {
                id: 'TRIP-9',
                requestId: 'REQ-9',
                title: 'Ooty Hills & Tea Explorer',
                travelerName: 'N Bharath',
                travelerEmail: 'traveler@gmail.com',
                partnerEmail: 'dileep@gmail.com',
                destination: 'Ooty, Tamil Nadu, India',
                startDate: '2026-09-09',
                endDate: '2026-09-14',
                adults: 2,
                children: 0,
                travelersCount: 2,
                budget: 30000,
                paymentStatus: 'Paid',
                status: 'completed',
                requestStatus: 'Accepted',
                stage: 'Completed',
                progress: 100,
                guide: { id: 'GUIDE-1', name: 'Koushik', initials: 'KS', email: 'koushik@gmail.com', phone: '9876543213' },
                assignedGuideEmail: 'koushik@gmail.com',
                guideStatus: 'Completed',
                vendor: { id: 'VENDOR-1', name: 'Lokesh', type: 'Hotels & Transfers', email: 'lokesh@gmail.com', phone: '9876543212' },
                assignedVendorEmail: 'lokesh@gmail.com',
                vendorStatus: 'Completed',
                serviceStatus: 'Completed',
                scheduleStarted: true,
                completedAt: '2026-09-14T18:00:00.000Z',
                currentLocation: 'Ooty, Tamil Nadu, India',
                currentActivity: 'Tour completed successfully',
                accommodationType: 'standard',
                tripPace: 'moderate',
                interests: ['Culture', 'Nature'],
                notes: '',
                schedule: [
                    { id: 'SCH-TRIP-9-1', day: 1, date: '2026-09-09', time: '09:00', title: 'Arrival pickup and accommodation check-in', owner: 'vendor', location: 'Arrival Terminal', status: 'completed', updatedBy: 'Lokesh', updatedAt: nowISO(), notes: 'Done' },
                    { id: 'SCH-TRIP-9-2', day: 2, date: '2026-09-10', time: '14:00', title: 'Featured cultural exploration & heritage district tour', owner: 'guide', location: 'Heritage Quarter', status: 'completed', updatedBy: 'Koushik', updatedAt: nowISO(), notes: 'Done' },
                ],
                updates: [
                    { id: 'UPD-SEED-9-COMPLETED', source: 'Travel Partner', title: 'Trip Completed', message: 'Trip TRIP-9 (Ooty Hills & Tea Explorer) has been completed successfully.', status: 'Completed', createdAt: nowISO() },
                    { id: 'UPD-SEED-9', source: 'Travel Partner', title: 'Request Accepted', message: 'Travel partner accepted Ooty Hills & Tea Explorer.', status: 'Accepted', createdAt: nowISO() },
                ],
            },
        ],
    };
}

/** loadState() normalisation pass from workflow.js. */
export function normalizeState(input) {
    let parsed = input;
    if (!parsed || !Array.isArray(parsed.trips) || parsed.trips.length === 0) {
        parsed = seedState();
        parsed.trips.forEach((trip) => {
            (trip.updates || []).slice(0, 3).forEach((update) => {
                parsed.notifications.push(makeNotification(STAKEHOLDER_ROLES, trip, update.title, update.message, update.status, update.createdAt));
            });
        });
    }
    parsed.version = 5;
    parsed.guides = Array.isArray(parsed.guides) ? parsed.guides : [];
    parsed.vendors = Array.isArray(parsed.vendors) ? parsed.vendors : [];
    // GET /workflow/state includes user passwords; never keep them in browser storage.
    // (PUT /workflow/state keeps the stored password when the field is missing.)
    parsed.users = (Array.isArray(parsed.users) ? parsed.users : []).map((user) => {
        if (!user || typeof user !== 'object' || !('password' in user)) return user;
        const { password, ...rest } = user; // eslint-disable-line no-unused-vars
        return rest;
    });
    parsed.packages = Array.isArray(parsed.packages) ? parsed.packages : [];
    parsed.partnerReadItems = Array.isArray(parsed.partnerReadItems) ? parsed.partnerReadItems : [];
    parsed.deletedNotifIds = Array.isArray(parsed.deletedNotifIds) ? parsed.deletedNotifIds : [];
    const deletedSet = new Set(parsed.deletedNotifIds);
    parsed.notifications = (Array.isArray(parsed.notifications) ? parsed.notifications : []).filter((n) => !deletedSet.has(n.id));
    parsed.issues = Array.isArray(parsed.issues) ? parsed.issues.map(normalizeIssue) : [];
    parsed.messages = Array.isArray(parsed.messages) ? parsed.messages.map(normalizeMessage) : [];
    parsed.trips = parsed.trips.map(normalizeTrip);
    const maxTripNumber = parsed.trips.reduce((max, trip) => {
        const number = Number(String(trip.id).replace(/\D/g, ''));
        return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    const maxIssueNumber = parsed.issues.reduce((max, issue) => {
        const number = Number(String(issue.id).replace(/\D/g, ''));
        return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    parsed.nextTripNumber = Math.max(Number(parsed.nextTripNumber || 0), maxTripNumber + 1);
    parsed.nextIssueNumber = Math.max(Number(parsed.nextIssueNumber || 0), maxIssueNumber + 1);
    if (!parsed.notifications.length && !parsed.notificationsInitialized && !parsed.deletedNotifIds.length) {
        parsed.notificationsInitialized = true;
        parsed.trips.forEach((trip) => {
            (trip.updates || []).slice(0, 3).forEach((update) => {
                parsed.notifications.push(makeNotification(STAKEHOLDER_ROLES, trip, update.title, update.message, update.status, update.createdAt));
            });
        });
    }
    return parsed;
}

// ---------------------------------------------------------------------------
// Snapshot + subscriptions
// ---------------------------------------------------------------------------
let snapshot = null;
const listeners = new Set();

const status = {
    hydrated: false,
    hydrating: false,
    lastError: '',
    lastSyncedAt: '',
};
let statusSnapshot = { ...status };

function emit() {
    statusSnapshot = { ...status };
    listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function readStored() {
    try {
        return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    } catch {
        return null;
    }
}

function writeStored(state) {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (error) {
        console.warn('Could not cache workflow state locally.', error);
    }
}

/** Read-only, normalised state for rendering. */
export function getSnapshot() {
    if (!snapshot) {
        snapshot = normalizeState(readStored());
        writeStored(snapshot);
    }
    return snapshot;
}

export function getSyncStatus() {
    return statusSnapshot;
}

/** Mutable working copy – the equivalent of the original loadState(). */
export function loadState() {
    return structuredClone(getSnapshot());
}

/** saveState(state, notify, persist) from workflow.js. */
export function saveState(state, { persist = true, immediate = false } = {}) {
    snapshot = normalizeState(structuredClone(state));
    writeStored(snapshot);
    if (persist) persistStateToBackend(snapshot, immediate);
    emit();
    return snapshot;
}

/** Mutates the trip with the given id (or requestId) and saves – updateTrip() in workflow.js. */
export function updateTrip(id, updater) {
    const state = loadState();
    const trip = state.trips.find((item) => item.id === id || item.requestId === id);
    if (!trip) return null;
    const result = updater(trip, state);
    if (result === false) return null;
    trip.stage = stageLabel(trip);
    trip.updatedAt = nowISO();
    saveState(state, { immediate: true });
    return getSnapshot().trips.find((item) => item.id === trip.id) || trip;
}

/** Clears cached state when a different account signs in on this browser. */
export function ensureStateOwner(email) {
    try {
        const cachedOwner = localStorage.getItem(SESSION_OWNER_KEY);
        if (email && cachedOwner && cachedOwner !== email) {
            localStorage.removeItem(STORE_KEY);
            snapshot = null;
        }
        if (email) localStorage.setItem(SESSION_OWNER_KEY, email);
    } catch { /* ignore */ }
}

/** Forces the next render to re-read local storage (used after logout / account switch). */
export function resetSnapshot() {
    snapshot = null;
    status.hydrated = false;
    emit();
}

/** Another browser tab changed the cached state (window "storage" event). */
export function reloadFromStorage() {
    snapshot = null;
    emit();
}

// ---------------------------------------------------------------------------
// Backend synchronisation (GET / PUT /workflow/state)
// ---------------------------------------------------------------------------
let persistTimer = null;
let lastPersistTimestamp = 0;
let lastPersistErrorAt = 0;

export function persistStateToBackend(state, immediate = false) {
    lastPersistTimestamp = Date.now();
    clearTimeout(persistTimer);
    const execute = async () => {
        const workflowState = {
            version: state.version || 5,
            nextTripNumber: state.nextTripNumber || 1,
            nextIssueNumber: state.nextIssueNumber || 1,
            trips: state.trips || [],
            notifications: state.notifications || [],
            deletedNotifIds: state.deletedNotifIds || [],
            issues: state.issues || [],
            messages: state.messages || [],
            guides: state.guides || [],
            vendors: state.vendors || [],
            users: state.users || [],
            packages: state.packages || [],
            partnerReadItems: state.partnerReadItems || [],
        };
        try {
            await workflowApi.putState(workflowState);
            status.lastError = '';
            status.lastSyncedAt = nowISO();
            emit();
        } catch (error) {
            console.warn('Could not persist workflow state to backend.', error.message);
            status.lastError = error.message;
            emit();
            // Surface the failure (throttled) instead of silently ignoring it.
            if (Date.now() - lastPersistErrorAt > 15000) {
                lastPersistErrorAt = Date.now();
                runtime.onPersistError(error);
            }
        }
    };
    if (immediate) execute();
    else persistTimer = setTimeout(execute, 50);
}

/**
 * hydrateStateFromBackend() from workflow.js – merges the backend state with the
 * local cache (newer local trips win and are pushed back).
 */
export async function hydrateStateFromBackend({ force = false, ignoreRecentWrites = false } = {}) {
    if (status.hydrating || (status.hydrated && !force)) return;
    // Prevent overwriting a local action that happened in the last 3 seconds.
    if (!ignoreRecentWrites && Date.now() - lastPersistTimestamp < 3000) return;
    status.hydrating = true;
    emit();
    try {
        const remoteState = await workflowApi.getState();
        if (remoteState && Array.isArray(remoteState.trips)) {
            const localState = readStored();
            let needsPush = false;
            if (localState && Array.isArray(localState.trips)) {
                const localTripMap = new Map(localState.trips.map((t) => [t.id, t]));
                const remoteTripMap = new Map(remoteState.trips.map((t) => [t.id, t]));
                const mergedTrips = [];
                for (const [id, remoteTrip] of remoteTripMap) {
                    const localTrip = localTripMap.get(id);
                    if (localTrip) {
                        const localTime = new Date(localTrip.updatedAt || 0).getTime();
                        const remoteTime = new Date(remoteTrip.updatedAt || 0).getTime();
                        if (localTime > remoteTime) {
                            mergedTrips.push(localTrip);
                            needsPush = true;
                        } else if (localTrip.status !== 'requested' && remoteTrip.status === 'requested') {
                            mergedTrips.push(localTrip);
                            needsPush = true;
                        } else {
                            mergedTrips.push(remoteTrip);
                        }
                    } else {
                        mergedTrips.push(remoteTrip);
                    }
                }
                const now = Date.now();
                for (const [id, localTrip] of localTripMap) {
                    if (!remoteTripMap.has(id)) {
                        const createdAt = new Date(localTrip.createdAt || 0).getTime();
                        if (now - createdAt < 60000) {
                            mergedTrips.push(localTrip);
                            needsPush = true;
                        }
                    }
                }
                remoteState.trips = mergedTrips;
            }

            if (localState && Array.isArray(localState.users)) {
                const localUserMap = new Map(localState.users.map((u) => [u.id || (u.email || '').toLowerCase(), u]));
                remoteState.users = (remoteState.users || []).map((rUser) => {
                    const lUser = localUserMap.get(rUser.id) || localUserMap.get((rUser.email || '').toLowerCase());
                    if (lUser && (lUser.availabilityStatus || lUser.availability)) {
                        return {
                            ...rUser,
                            availabilityStatus: lUser.availabilityStatus || lUser.availability,
                            availability: lUser.availability || lUser.availabilityStatus,
                            profile: { ...(rUser.profile || {}), ...(lUser.profile || {}) },
                        };
                    }
                    return rUser;
                });
            }

            if (localState && Array.isArray(localState.guides)) {
                const localGuideMap = new Map(localState.guides.map((g) => [g.id || (g.email || g.name || '').toLowerCase(), g]));
                remoteState.guides = (remoteState.guides || []).map((rGuide) => {
                    const lGuide = localGuideMap.get(rGuide.id) || localGuideMap.get((rGuide.email || rGuide.name || '').toLowerCase());
                    if (lGuide && (lGuide.availabilityStatus || lGuide.status)) {
                        return { ...rGuide, availabilityStatus: lGuide.availabilityStatus || lGuide.status, status: lGuide.availabilityStatus || lGuide.status };
                    }
                    return rGuide;
                });
            }

            if (localState && Array.isArray(localState.partnerReadItems)) {
                remoteState.partnerReadItems = Array.from(new Set([...(remoteState.partnerReadItems || []), ...localState.partnerReadItems]));
            }
            if (localState && Array.isArray(localState.deletedNotifIds)) {
                remoteState.deletedNotifIds = Array.from(new Set([...(remoteState.deletedNotifIds || []), ...localState.deletedNotifIds]));
            } else if (!remoteState.deletedNotifIds) {
                remoteState.deletedNotifIds = [];
            }

            remoteState.version = 5;
            snapshot = normalizeState(remoteState);
            writeStored(snapshot);
            if (needsPush) persistStateToBackend(snapshot, true);
            status.lastError = '';
            status.lastSyncedAt = nowISO();
        }
    } catch (error) {
        // Same behaviour as the original: fall back to the local cache, but record the error.
        console.warn('Backend workflow state unavailable; using local cache.', error.message);
        status.lastError = error.message;
    } finally {
        status.hydrated = true;
        status.hydrating = false;
        emit();
    }
}
