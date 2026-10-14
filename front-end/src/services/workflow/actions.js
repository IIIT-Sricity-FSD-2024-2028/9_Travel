/**
 * Workflow mutations – ported from js/workflow.js (and the page scripts that
 * called window.DDWorkflow.*). Each action loads a working copy of the state,
 * mutates it with the original business rules and saves it, which persists it
 * to the backend through PUT /workflow/state.
 */
import {
    currentRole, currentSession, loadState, makeNotification, makeUpdate, normalizeIssue,
    normalizeMessage, normalizeTrip, notify, saveState, updateTrip, getSnapshot,
} from './store';
import {
    DEFAULT_PACKAGES, PACKAGE_MIN_BUDGETS, ROLE_LABELS, SALARY_PAYOUTS_KEY, STAKEHOLDER_ROLES, USER_SALARIES_KEY,
} from './constants';
import { buildPackageSchedule, ensureTripSchedule, ownerScheduleCompleted, scheduleStats, updateScheduleProgress } from './schedule';
import {
    addDays, formatMoney, formatShortDate, initialsFor, nowISO, safeJson, validateTripDates, writeJson,
} from './utils';
import { assignableGuides, assignableVendors, canStartTrip, isNotificationForCurrentUser, latestTravelerTrip, notificationsForRole, getPartnerNotificationItems } from './selectors';
import { packageKeyFor } from './schedule';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
export function addUpdate(trip, source, title, message, status) {
    trip.updates = Array.isArray(trip.updates) ? trip.updates : [];
    trip.updates.unshift(makeUpdate(source, title, message, status));
    trip.updates = trip.updates.slice(0, 20);
    trip.updatedAt = nowISO();
}

let popupHandler = () => {};
export function setPopupHandler(fn) {
    popupHandler = fn || (() => {});
}

export function notifyStakeholders(state, trip, title, message, type, roles) {
    state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
    const notif = makeNotification(roles || STAKEHOLDER_ROLES, trip, title, message, type);
    state.notifications.unshift(notif);
    state.notifications = state.notifications.slice(0, 100);
    try {
        if (isNotificationForCurrentUser(notif, currentSession(), state)) popupHandler(notif);
    } catch { /* popups are best-effort */ }
}

/** canOperateSession(): inactive accounts can view but cannot operate. */
export function canOperateSession() {
    const session = currentSession();
    if (!session.email || session.status !== 'Inactive') return true;
    notify('Your account is inactive. You can view pages, but operations are blocked until Super Admin activates it.', 'warning');
    return false;
}

function memberNameForRole(role, trip) {
    if (role === 'traveler') return trip?.travelerName || 'Traveler';
    if (role === 'partner') return 'Travel Partner';
    if (role === 'guide') return trip?.guide?.name || 'Tour Guide';
    if (role === 'vendor') return trip?.vendor?.name || 'Vendor';
    if (role === 'support') return 'Support Executive';
    return 'Trip Members';
}

function rolesForMessageNotification(toRole, fromRole) {
    if (!toRole || toRole === 'all') return [...STAKEHOLDER_ROLES, 'support'];
    return Array.from(new Set([toRole, fromRole].filter(Boolean)));
}

function defaultBudgetShare(trip) {
    const totalB = Number(trip.budget || 1200);
    return {
        guidePercent: 50, vendorPercent: 50,
        guideAmount: Math.round((totalB * 50) / 100), vendorAmount: Math.round((totalB * 50) / 100),
        partnerPercent: 0, partnerAmount: 0, supportPercent: 0, supportAmount: 0, totalBudget: totalB,
    };
}

// ---------------------------------------------------------------------------
// Trip requests & lifecycle
// ---------------------------------------------------------------------------
export function makeTripRequest(data) {
    const dateCheck = validateTripDates(data.startDate, data.endDate);
    if (!dateCheck.valid) throw new Error(dateCheck.message);

    const state = loadState();
    const session = currentSession();
    const nextNumber = Number(state.nextTripNumber || 1);
    const id = `TRIP-${nextNumber}`;
    const interests = Array.isArray(data.interests) ? data.interests : [];
    const schedule = buildPackageSchedule({ id, startDate: data.startDate, endDate: data.endDate, destination: data.destination, title: data.packageName });

    const pkgLower = String(data.packageName || '').toLowerCase();
    const destLower = String(data.destination || '').toLowerCase();
    const isCustom = !pkgLower || pkgLower.includes('custom');
    let minBudget = 0;
    if (!isCustom) {
        const key = Object.keys(PACKAGE_MIN_BUDGETS).find((k) => pkgLower.includes(k) || destLower.includes(k));
        minBudget = key ? PACKAGE_MIN_BUDGETS[key] : 500;
    }
    const userBudget = Number(data.budget || 0);
    const finalBudget = userBudget > 0 ? Math.max(userBudget, minBudget) : (minBudget > 0 ? minBudget : 0);

    const trip = normalizeTrip({
        id,
        requestId: id.replace('TRIP', 'REQ'),
        title: data.packageName || `${data.destination || 'Custom'} Trip`,
        travelerName: session.name || data.travelerName || 'Traveler',
        travelerEmail: session.email || data.travelerEmail || '',
        destination: data.destination || 'Custom destination',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        adults: Number(data.adults || 1),
        children: Number(data.children || 0),
        budget: finalBudget,
        paymentStatus: 'Unpaid',
        status: 'requested',
        requestStatus: 'Requested',
        stage: 'New Request',
        progress: 0,
        accommodationType: data.accommodationType || 'standard',
        tripPace: data.tripPace || 'moderate',
        interests,
        notes: data.notes || '',
        currentActivity: 'Waiting for travel partner approval',
        schedule,
        updates: [],
    });
    addUpdate(trip, 'Traveler', 'Trip Requested', `${trip.travelerName} requested ${trip.title} for ${trip.destination}.`, 'Requested');
    notifyStakeholders(state, trip, 'New Trip Request', `${trip.travelerName} requested ${trip.title}. Travel partner approval is required.`, 'Requested', ['partner']);
    state.trips.unshift(trip);
    state.nextTripNumber = nextNumber + 1;
    saveState(state, { immediate: true });
    return trip;
}

export function deleteTripLocal(tripId) {
    if (!tripId) return false;
    const state = loadState();
    const trip = (state.trips || []).find((t) => t.id === tripId || t.requestId === tripId);
    if (trip && trip.status === 'completed') {
        notify('Completed trips cannot be deleted as they form part of historical records.', 'warning');
        return false;
    }
    const initialCount = state.trips.length;
    state.trips = state.trips.filter((t) => t.id !== tripId && t.requestId !== tripId);
    if (state.trips.length !== initialCount) {
        saveState(state, { immediate: true });
        return true;
    }
    return false;
}

export function requestTripCancellation(id, reason = 'Traveler requested trip cancellation.') {
    return updateTrip(id, (trip, state) => {
        if (trip.status === 'completed') {
            notify('Completed trips cannot be cancelled.', 'warning');
            return false;
        }
        trip.cancellationRequested = true;
        trip.cancellationStatus = 'Pending';
        trip.cancellationRequestedAt = nowISO();
        trip.cancellationReason = reason;
        addUpdate(trip, 'Traveler', 'Cancellation Requested', `${trip.travelerName || 'Traveler'} submitted a cancellation request: "${reason}". Waiting for Travel Partner approval.`, 'Pending');
        notifyStakeholders(state, trip, 'Trip Cancellation Request', `${trip.travelerName || 'Traveler'} has requested to cancel ${trip.title} (${trip.id}). Please review and accept or decline.`, 'Pending', ['partner', 'support']);
        return true;
    });
}

export function acceptTripCancellation(id) {
    return updateTrip(id, (trip, state) => {
        trip.status = 'cancelled';
        trip.requestStatus = 'Cancelled';
        trip.cancellationRequested = false;
        trip.cancellationStatus = 'Accepted';
        trip.cancellationApprovedAt = nowISO();
        addUpdate(trip, 'Travel Partner', 'Trip Cancelled', `Travel partner approved the cancellation request for ${trip.title}. Awaiting Super Admin refund processing.`, 'Cancelled');
        notifyStakeholders(state, trip, 'Trip Cancellation Accepted', `Travel partner approved the cancellation request for ${trip.title}. Super Admin action required for processing refund.`, 'Cancelled', ['partner', 'traveler', 'guide', 'vendor', 'support', 'superuser']);
    });
}

export function rejectTripCancellation(id) {
    return updateTrip(id, (trip, state) => {
        trip.cancellationRequested = false;
        trip.cancellationStatus = 'Declined';
        trip.cancellationDeclinedAt = nowISO();
        addUpdate(trip, 'Travel Partner', 'Cancellation Declined', `Travel partner declined the cancellation request for ${trip.title}. Trip remains active.`, 'Ongoing');
        notifyStakeholders(state, trip, 'Cancellation Declined', `Travel partner declined the cancellation request for ${trip.title}. The trip remains active.`, 'Info', ['traveler', 'partner', 'support']);
    });
}

export function cancelTrip(id) {
    const session = currentSession();
    const trip = getSnapshot().trips.find((t) => t.id === id || t.requestId === id);
    if (trip && trip.status === 'completed') {
        notify('Completed trips cannot be cancelled or deleted.', 'warning');
        return null;
    }
    const roleLower = String(session?.role || '').toLowerCase();
    const isTravelerSession = roleLower.includes('traveler') || roleLower.includes('customer') || roleLower === 'user' || !session?.role;
    if (isTravelerSession) return requestTripCancellation(id);
    return updateTrip(id, (t, state) => {
        t.status = 'cancelled';
        t.requestStatus = 'Cancelled';
        t.cancellationRequested = false;
        t.cancellationStatus = 'Accepted';
        addUpdate(t, session.role || 'Travel Partner', 'Trip Cancelled', `${session.name || 'Travel Partner'} cancelled the trip.`, 'Cancelled');
        notifyStakeholders(state, t, 'Trip Cancelled', `${session.name || 'Travel Partner'} cancelled ${t.title}.`, 'Cancelled');
    });
}

export function acceptTrip(id) {
    return updateTrip(id, (trip, state) => {
        trip.status = 'planning';
        trip.requestStatus = 'Accepted';
        trip.progress = Math.max(trip.progress, 10);
        trip.currentActivity = 'Travel partner accepted the request';
        addUpdate(trip, 'Travel Partner', 'Request Accepted', `Travel partner accepted ${trip.title}. Assign guide and vendor next.`, 'Accepted');
        notifyStakeholders(state, trip, 'Trip Request Accepted', `Travel partner accepted ${trip.title}. Guide and vendor assignment will follow.`, 'Accepted');
    });
}

export function rejectTrip(id, reason = 'Travel partner rejected the trip request.') {
    return updateTrip(id, (trip, state) => {
        trip.status = 'cancelled';
        trip.requestStatus = 'Rejected';
        addUpdate(trip, 'Travel Partner', 'Request Rejected', reason, 'Cancelled');
        notifyStakeholders(state, trip, 'Trip Request Rejected', `Travel partner rejected request for ${trip.title}. Reason: ${reason}`, 'Cancelled', ['partner', 'traveler', 'support']);
    });
}

export function approveItinerary(id, note = 'Travel partner approved the modified itinerary and preferences.') {
    return updateTrip(id, (trip, state) => {
        trip.itineraryApproved = true;
        addUpdate(trip, 'Travel Partner', 'Itinerary Changes Approved', note, 'Approved');
        notifyStakeholders(state, trip, 'Itinerary Changes Approved', `Your itinerary modifications for ${trip.title} have been approved.`, 'Accepted', ['partner', 'traveler', 'guide']);
    });
}

export function sendTripToSupport(id) {
    return updateTrip(id, (trip, state) => {
        trip.supportStatus = 'Sent';
        addUpdate(trip, 'Travel Partner', 'Sent to Support', `Trip ${trip.id} sent to support executive for coordination.`, 'Info');
        notifyStakeholders(state, trip, 'Trip Sent to Support', `Trip ${trip.id} has been sent to support.`, 'Info', ['partner', 'support']);
    });
}

export function acceptTripSupport(id) {
    return updateTrip(id, (trip, state) => {
        trip.supportStatus = 'Accepted';
        addUpdate(trip, 'Support', 'Support Co-ordinating', `Support executive accepted coordination for ${trip.title}.`, 'Accepted');
        notifyStakeholders(state, trip, 'Support Request Accepted', `Support Executive accepted trip ${trip.id} coordination request.`, 'Accepted', ['partner', 'support']);
    });
}

export function assignGuide(id, guideName) {
    return updateTrip(id, (trip, state) => {
        const guide = assignableGuides(state).find((item) => item.name === guideName || item.id === guideName || item.email === guideName) || { name: guideName, initials: initialsFor(guideName) };
        trip.guide = {
            id: guide.id,
            name: guide.name,
            initials: guide.initials || initialsFor(guide.name),
            email: guide.email || (guide.name === 'Koushik' ? 'koushik@gmail.com' : ''),
            phone: guide.phone || '',
        };
        trip.guideStatus = 'Assigned';
        trip.assignedGuideEmail = trip.guide.email;
        if (!trip.budgetShare) trip.budgetShare = defaultBudgetShare(trip);
        trip.progress = Math.max(trip.progress, 15);
        trip.currentActivity = `${guide.name} assigned as tour guide`;
        addUpdate(trip, 'Travel Partner', 'Guide Assigned', `${guide.name} was assigned to ${trip.id}. Waiting for guide acceptance.`, 'Assigned');
        notifyStakeholders(state, trip, 'Tour Guide Assignment Requested', `${guide.name} was requested for ${trip.title}. The guide must accept before the trip can start.`, 'Assigned', ['partner', 'traveler', 'guide']);
    });
}

export function assignVendor(id, vendorName, serviceType) {
    return updateTrip(id, (trip, state) => {
        const vendor = assignableVendors(state).find((item) => item.name === vendorName || item.id === vendorName || item.email === vendorName) || { name: vendorName, type: serviceType || 'Service' };
        trip.vendor = {
            id: vendor.id,
            name: vendor.name,
            type: serviceType || vendor.type || 'Service',
            email: vendor.email || (vendor.name === 'Lokesh' ? 'lokesh@gmail.com' : ''),
            phone: vendor.phone || '',
            location: vendor.location || '',
        };
        trip.vendorStatus = 'Requested';
        trip.serviceStatus = 'Pending';
        trip.assignedVendorEmail = trip.vendor.email;
        if (!trip.budgetShare) trip.budgetShare = defaultBudgetShare(trip);
        trip.progress = Math.max(trip.progress, 15);
        trip.currentActivity = `${vendor.name} requested for ${trip.vendor.type}`;
        addUpdate(trip, 'Travel Partner', 'Vendor Requested', `${vendor.name} was requested for ${trip.vendor.type} on ${trip.id}.`, 'Pending');
        notifyStakeholders(state, trip, 'Vendor Assigned To Trip', `${vendor.name} was assigned for ${trip.vendor.type} on ${trip.title}. The vendor must accept before the trip can start.`, 'Pending', ['partner', 'traveler', 'vendor']);
    });
}

export function acceptGuide(id) {
    return updateTrip(id, (trip, state) => {
        trip.guideStatus = 'Accepted';
        if (trip.guide) trip.assignedGuideEmail = trip.guide.email || trip.assignedGuideEmail || '';
        trip.progress = Math.max(trip.progress, 25);
        trip.currentActivity = `${trip.guide?.name || 'Guide'} accepted the assignment`;
        addUpdate(trip, 'Guide', 'Assignment Accepted', `${trip.guide?.name || 'Guide'} accepted ${trip.id}.`, 'Accepted');
        notifyStakeholders(state, trip, 'Guide Accepted Assignment', `${trip.guide?.name || 'Guide'} accepted the assignment for ${trip.title}.`, 'Accepted', ['partner', 'traveler', 'guide', 'vendor']);
    });
}

export function rejectGuide(id) {
    return updateTrip(id, (trip, state) => {
        const guideName = trip.guide?.name || 'Guide';
        trip.guide = null;
        trip.guideStatus = 'Pending';
        trip.assignedGuideEmail = '';
        addUpdate(trip, 'Guide', 'Assignment Rejected', `${guideName} rejected ${trip.id}. Reassign another guide.`, 'Rejected');
        notifyStakeholders(state, trip, 'Guide Rejected Assignment', `${guideName} rejected ${trip.title}. Travel partner must assign another guide.`, 'Rejected', ['partner', 'traveler', 'guide']);
    });
}

export function acceptVendor(id) {
    return updateTrip(id, (trip, state) => {
        trip.vendorStatus = 'Accepted';
        trip.serviceStatus = 'Accepted';
        if (trip.vendor) trip.assignedVendorEmail = trip.vendor.email || trip.assignedVendorEmail || '';
        trip.progress = Math.max(trip.progress, 25);
        trip.currentActivity = `${trip.vendor?.name || 'Vendor'} accepted the service request`;
        addUpdate(trip, 'Vendor', 'Service Accepted', `${trip.vendor?.name || 'Vendor'} accepted ${trip.vendor?.type || 'service'} for ${trip.id}.`, 'Accepted');
        notifyStakeholders(state, trip, 'Vendor Accepted Service', `${trip.vendor?.name || 'Vendor'} accepted ${trip.vendor?.type || 'service'} for ${trip.title}.`, 'Accepted', ['partner', 'traveler', 'guide', 'vendor']);
    });
}

export function rejectVendor(id) {
    return updateTrip(id, (trip, state) => {
        const vendorName = trip.vendor?.name || 'Vendor';
        trip.vendor = null;
        trip.vendorStatus = 'Pending';
        trip.serviceStatus = 'Pending';
        addUpdate(trip, 'Vendor', 'Service Rejected', `${vendorName} rejected the service request for ${trip.id}.`, 'Rejected');
        notifyStakeholders(state, trip, 'Vendor Rejected Service', `${vendorName} rejected the service request for ${trip.title}. Travel partner must assign another vendor.`, 'Rejected');
    });
}

export function startTrip(id) {
    const session = currentSession();
    const roleLower = String(session.role || currentRole() || '').toLowerCase();
    if (roleLower.includes('traveler')) {
        notify('Trips must be initiated by your Travel Partner. Please contact your Travel Partner to start the trip schedule.', 'warning');
        return null;
    }
    let started = false;
    const trip = updateTrip(id, (t, state) => {
        if (!canStartTrip(t)) {
            let reason = 'Guide and vendor must both accept before this trip can start.';
            if (t.supportStatus === 'Sent') {
                reason = 'This trip was sent to Support Executive and is awaiting Support acceptance before it can start.';
            } else if (t.guideStatus === 'Accepted' && t.vendorStatus === 'Accepted' && t.paymentStatus !== 'Paid') {
                reason = `Traveler must complete the trip payment (${formatMoney(t.budget || 1200)}) before the trip can start.`;
            }
            addUpdate(t, 'Travel Partner', 'Start Blocked', reason, 'Pending');
            notifyStakeholders(state, t, 'Trip Start Blocked', `${t.title}: ${reason}`, 'Pending', ['partner']);
            notify(reason, 'warning');
            return true;
        }
        t.status = 'ongoing';
        t.scheduleStarted = true;
        t.startedAt = nowISO();
        ensureTripSchedule(t);
        t.schedule.forEach((item, index) => {
            if (item.status !== 'completed') item.status = index === 0 ? 'in-progress' : 'upcoming';
        });
        const stats = scheduleStats(t);
        t.progress = 50 + Math.round(stats.percent * 0.5);
        t.currentActivity = stats.current?.title || 'Trip started';
        t.currentLocation = stats.current?.location || t.destination;
        addUpdate(t, 'Travel Partner', 'Trip Started', `${t.title} started by Travel Partner with the planned package schedule from ${formatShortDate(t.startDate)} to ${formatShortDate(t.endDate)}.`, 'Ongoing');
        notifyStakeholders(state, t, 'Trip Started', `${t.title} has been started by your Travel Partner. The package schedule is visible to traveler, guide, vendor, and travel partner.`, 'Ongoing');
        started = true;
        return true;
    });
    return started ? trip : null;
}

export function completeTrip(id) {
    return updateTrip(id, (trip, state) => {
        trip.status = 'completed';
        trip.stage = 'Completed';
        trip.progress = 100;
        trip.paymentStatus = 'Paid';
        trip.guideStatus = 'Completed';
        trip.vendorStatus = 'Completed';
        trip.serviceStatus = 'Completed';
        trip.scheduleStarted = true;
        trip.completedAt = trip.completedAt || nowISO();
        trip.currentActivity = 'Tour completed successfully';
        trip.currentLocation = trip.destination;
        if (!trip.guide) {
            trip.guide = { id: 'GUIDE-1', name: 'Koushik', initials: 'KS' };
            trip.assignedGuideEmail = 'koushik@gmail.com';
        }
        if (!trip.vendor) {
            trip.vendor = { id: 'VENDOR-1', name: 'Lokesh', type: 'Hotels & Transfers' };
            trip.assignedVendorEmail = 'lokesh@gmail.com';
        }
        ensureTripSchedule(trip);
        trip.schedule.forEach((item) => {
            item.status = 'completed';
            item.notes = item.notes || 'Done';
            item.updatedAt = nowISO();
        });
        addUpdate(trip, 'Travel Partner', 'Trip Completed', `${trip.title} (${trip.id}) has been completed successfully.`, 'Completed');
        notifyStakeholders(state, trip, 'Trip Completed', `${trip.title} (${trip.id}) was completed successfully.`, 'Completed', [...STAKEHOLDER_ROLES, 'support']);
    });
}

export function guideUpdate(id, data) {
    return updateTrip(id, (trip, state) => {
        const wasCompleted = trip.status === 'completed';
        const statusText = data.statusText || 'Status Update';
        const location = data.location || trip.currentLocation || trip.destination;
        const notes = data.notes || statusText;
        trip.currentLocation = location;
        trip.currentActivity = notes;
        if (data.status === 'started') {
            trip.status = 'ongoing';
            trip.scheduleStarted = true;
            ensureTripSchedule(trip);
            trip.progress = Math.max(trip.progress, 40);
        } else if (data.status === 'location') {
            trip.status = trip.status === 'requested' ? 'planning' : trip.status;
            trip.progress = Math.max(trip.progress, 45);
        } else if (data.status === 'delay') {
            trip.progress = Math.max(trip.progress, 35);
        }
        const scheduleItem = updateScheduleProgress(trip, 'guide', {
            scheduleItemId: data.scheduleItemId, status: data.status, statusText, complete: data.status === 'completed', notes, location, updatedBy: trip.guide?.name || 'Tour Guide',
        });
        trip.guideStatus = ownerScheduleCompleted(trip, 'guide') ? 'Completed' : 'Accepted';
        const scheduleText = scheduleItem ? ` for ${scheduleItem.title}` : '';
        addUpdate(trip, 'Guide', statusText, `${statusText}${scheduleText}: ${notes}${location ? ` (${location})` : ''}`, data.status === 'delay' ? 'Warning' : 'Active');
        notifyStakeholders(state, trip, `Guide ${statusText}`, `${trip.guide?.name || 'Guide'} updated ${trip.title}${scheduleText}: ${notes}.`, data.status === 'delay' ? 'Warning' : 'Active');
        if (!wasCompleted && trip.status === 'completed') {
            addUpdate(trip, 'System', 'Tour Completed', `${trip.title} schedule is fully completed.`, 'Completed');
            notifyStakeholders(state, trip, 'Tour Completed', `${trip.title} has been completed.`, 'Completed');
        }
    });
}

export function guideMessage(id, data) {
    return updateTrip(id, (trip, state) => {
        addUpdate(trip, 'Guide', data.typeText || 'Traveler Guidance', data.message || 'Guidance sent to travelers.', 'Guidance');
        notifyStakeholders(state, trip, data.typeText || 'Traveler Guidance', data.message || 'Guidance sent to travelers.', 'Guidance');
    });
}

export function vendorUpdate(id, data) {
    return updateTrip(id, (trip, state) => {
        const wasCompleted = trip.status === 'completed';
        const status = data.status || 'progress';
        const statusText = data.statusText || 'In Progress';
        const payload = { scheduleItemId: data.scheduleItemId, status, statusText, notes: data.message, location: data.location, updatedBy: trip.vendor?.name || 'Vendor' };
        let scheduleItem;
        if (status === 'completed') {
            scheduleItem = updateScheduleProgress(trip, 'vendor', { ...payload, complete: true });
        } else if (status === 'enroute') {
            trip.progress = Math.max(trip.progress, 35);
            scheduleItem = updateScheduleProgress(trip, 'vendor', payload);
        } else {
            trip.progress = Math.max(trip.progress, 45);
            scheduleItem = updateScheduleProgress(trip, 'vendor', payload);
        }
        const vendorDone = ownerScheduleCompleted(trip, 'vendor');
        trip.serviceStatus = vendorDone ? 'Completed' : status === 'completed' ? 'In Progress' : statusText;
        trip.vendorStatus = vendorDone ? 'Completed' : status === 'completed' ? 'In Progress' : statusText;
        trip.currentActivity = data.message || `${trip.vendor?.type || 'Service'} ${statusText.toLowerCase()}`;
        const scheduleText = scheduleItem ? ` for ${scheduleItem.title}` : '';
        addUpdate(trip, 'Vendor', `${trip.vendor?.type || 'Service'} Update`, data.message || `${trip.vendor?.name || 'Vendor'} marked ${scheduleText || 'service'} as ${statusText}.`, statusText);
        notifyStakeholders(state, trip, `${trip.vendor?.type || 'Service'} Update`, data.message || `${trip.vendor?.name || 'Vendor'} marked ${trip.title}${scheduleText} as ${statusText}.`, statusText);
        if (!wasCompleted && trip.status === 'completed') {
            addUpdate(trip, 'System', 'Tour Completed', `${trip.title} schedule is fully completed.`, 'Completed');
            notifyStakeholders(state, trip, 'Tour Completed', `${trip.title} has been completed.`, 'Completed');
        }
    });
}

// ---------------------------------------------------------------------------
// Schedule editing (Travel Partner schedule detail pages)
// ---------------------------------------------------------------------------
export function regenerateTripSchedule(tripId, newStart, newEnd) {
    return updateTrip(tripId, (t) => {
        t.startDate = newStart;
        t.endDate = newEnd;
        t.schedule = [];
        addUpdate(t, 'Travel Partner', 'Itinerary Updated', `Travel partner updated trip dates to ${newStart} – ${newEnd} and regenerated the full itinerary schedule.`, 'Approved');
    });
}

export function addScheduleItem(tripId, { day, time, title, location, owner }) {
    return updateTrip(tripId, (t) => {
        t.schedule = t.schedule || [];
        t.schedule.push({
            id: `SCH-${t.id}-${Date.now()}`,
            day,
            date: t.startDate ? addDays(t.startDate, day - 1) : '',
            time,
            title,
            owner,
            location,
            status: 'upcoming',
            updatedBy: 'Travel Partner',
            updatedAt: nowISO(),
            notes: '',
        });
        t.schedule.sort((a, b) => a.day - b.day || String(a.time).localeCompare(String(b.time)));
    });
}

export function removeScheduleItem(tripId, itemId) {
    return updateTrip(tripId, (t) => {
        t.schedule = (t.schedule || []).filter((item) => item.id !== itemId);
    });
}

/** submitTravelerTripEdit() */
export function submitTravelerTripEdit(tripId, { startDate, endDate, travelersCount, accommodationType }) {
    const state = loadState();
    const trip = state.trips.find((t) => t.id === tripId) || latestTravelerTrip(state);
    if (!trip) {
        notify('No active trip found to edit.', 'warning');
        return null;
    }
    const target = state.trips.find((t) => t.id === trip.id);
    if (startDate) target.startDate = startDate;
    if (endDate) target.endDate = endDate;
    if (travelersCount) target.travelersCount = Number(travelersCount) || target.travelersCount;
    if (accommodationType) target.accommodationType = accommodationType;
    target.updatedAt = nowISO();
    addUpdate(target, 'Traveler', 'Itinerary Modified', `${target.travelerName || 'Traveler'} updated itinerary preferences and dates for ${target.title}.`, 'Itinerary Mod');
    notifyStakeholders(state, target, 'Itinerary & Preference Update', `${target.travelerName || 'Traveler'} updated itinerary details for ${target.title}.`, 'Itinerary Mod', ['partner', 'traveler']);
    saveState(state, { immediate: true });
    return target;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
export function sendMemberMessage(data) {
    const state = loadState();
    const trip = state.trips.find((item) => item.id === data.tripId) || latestTravelerTrip(state);
    if (!trip || !trip.id) {
        notify('No active trip available to send messages.', 'warning');
        return null;
    }
    const target = state.trips.find((item) => item.id === trip.id);
    const fromRole = data.fromRole || currentRole();
    const session = currentSession();
    const fromName = data.fromName || session.name || memberNameForRole(fromRole, target);
    const toRole = data.toRole || 'all';
    const message = normalizeMessage({
        tripId: target.id,
        tripTitle: target.title || '',
        fromRole,
        fromName,
        toRoles: toRole === 'all' ? ['all'] : [toRole],
        body: data.body || data.message || '',
        createdAt: nowISO(),
    }, state.messages?.length || 0);
    if (!message.body.trim()) return null;
    state.messages = Array.isArray(state.messages) ? state.messages : [];
    state.messages.unshift(message);
    state.messages = state.messages.slice(0, 200);
    addUpdate(target, ROLE_LABELS[fromRole] || fromName, 'Message Sent', `${fromName}: ${message.body}`, 'Message');
    notifyStakeholders(state, target, `Message from ${ROLE_LABELS[fromRole] || fromName}`, `${fromName} sent a message on ${target.id}: ${message.body}`, 'Message', rolesForMessageNotification(toRole, fromRole));
    saveState(state);
    return message;
}

export function markAllMessagesAsRead(role) {
    const state = loadState();
    let updated = false;
    (state.messages || []).forEach((m) => {
        if ((m.toRoles || []).includes(role) || (m.toRoles || []).includes('all') || m.fromRole === role) {
            m.readBy = m.readBy || [];
            if (!m.readBy.includes(role)) {
                m.readBy.push(role);
                updated = true;
            }
        }
    });
    if (updated) saveState(state, { immediate: true });
    return updated;
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------
export function reportIssue(data) {
    const state = loadState();
    const trip = state.trips.find((item) => item.id === data.tripId) || latestTravelerTrip(state) || state.trips[0] || {};
    const target = state.trips.find((item) => item.id === trip.id) || {};
    const number = Number(state.nextIssueNumber || 1);
    const issue = normalizeIssue({
        id: `ISS-${number}`,
        tripId: target.id || data.tripId || '',
        tripTitle: target.title || '',
        reportedBy: data.reportedBy || currentSession().name || 'User',
        reporterRole: data.reporterRole || ROLE_LABELS[currentRole()] || 'Traveler',
        type: data.type || 'General',
        title: data.title || data.type || 'Reported Issue',
        description: data.description || 'No description provided.',
        priority: data.priority || 'Medium',
        attachmentUrl: data.attachmentUrl || '',
        status: 'Open',
        createdAt: nowISO(),
    }, state.issues.length);
    state.issues.unshift(issue);
    state.nextIssueNumber = number + 1;
    if (target.id) {
        addUpdate(target, issue.reporterRole, 'Issue Reported', `${issue.title}: ${issue.description}`, issue.priority);
        notifyStakeholders(state, target, 'Issue Reported', `${issue.reporterRole} ${issue.reportedBy} reported ${issue.title} on ${target.id}. Support has been notified.`, issue.priority, [...STAKEHOLDER_ROLES, 'support']);
    } else {
        state.notifications.unshift(makeNotification('support', null, 'Issue Reported', `${issue.reportedBy} reported ${issue.title}.`, issue.priority));
    }
    saveState(state, { immediate: true });
    return issue;
}

export function resolveIssue(issueId, resolution) {
    const state = loadState();
    const issue = state.issues.find((item) => item.id === issueId);
    if (!issue) return null;
    issue.status = 'Resolved';
    issue.resolution = resolution || 'Resolved by support executive.';
    issue.resolvedAt = nowISO();
    const trip = state.trips.find((item) => item.id === issue.tripId);
    if (trip) {
        addUpdate(trip, 'Support', 'Issue Resolved', `${issue.id} resolved: ${issue.resolution}`, 'Resolved');
        notifyStakeholders(state, trip, 'Issue Resolved', `${issue.id} for ${trip.title} has been resolved: ${issue.resolution}`, 'Resolved', [...STAKEHOLDER_ROLES, 'support']);
        const roleMap = { Traveler: 'traveler', 'Travel Partner': 'partner', Vendor: 'vendor', 'Tour Guide': 'guide', 'Support Executive': 'support', 'Super Admin': 'superadmin' };
        const toRole = roleMap[issue.reporterRole] || 'traveler';
        const msg = normalizeMessage({
            tripId: trip.id,
            tripTitle: trip.title,
            fromRole: 'support',
            fromName: 'Support Executive',
            toRoles: [toRole],
            body: `Confirm Resolution: Issue ${issue.id} ("${issue.title}") has been resolved. Details: ${issue.resolution}`,
            createdAt: nowISO(),
        }, state.messages?.length || 0);
        state.messages = Array.isArray(state.messages) ? state.messages : [];
        state.messages.unshift(msg);
        state.messages = state.messages.slice(0, 200);
        addUpdate(trip, 'Support', 'Resolution Communicated', `Sent resolution confirmation message to ${issue.reporterRole}.`, 'Message');
    }
    saveState(state, { immediate: true });
    return issue;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export function markNotificationRead(notifId, role) {
    const state = loadState();
    const notif = (state.notifications || []).find((n) => n.id === notifId);
    if (!notif) return false;
    notif.readBy = notif.readBy || [];
    if (!notif.readBy.includes(role)) notif.readBy.push(role);
    saveState(state, { immediate: true });
    return true;
}

export function deleteNotification(notifId) {
    if (!notifId) return false;
    const state = loadState();
    state.deletedNotifIds = state.deletedNotifIds || [];
    if (!state.deletedNotifIds.includes(notifId)) state.deletedNotifIds.push(notifId);
    state.notifications = (state.notifications || []).filter((n) => n.id !== notifId);
    saveState(state, { immediate: true });
    return true;
}

export function markAllNotifsAsRead(role) {
    const state = loadState();
    if (role === 'partner') {
        state.partnerReadItems = getPartnerNotificationItems(state).map((item) => item.id);
    } else if (role === 'superuser') {
        (state.notifications || []).forEach((n) => {
            n.readBy = Array.isArray(n.readBy) ? n.readBy : [];
            if (!n.readBy.includes('superuser')) n.readBy.push('superuser');
        });
    } else {
        const ids = new Set(notificationsForRole(state, role).map((n) => n.id));
        (state.notifications || []).forEach((n) => {
            if (!ids.has(n.id)) return;
            n.readBy = Array.isArray(n.readBy) ? n.readBy : [];
            if (!n.readBy.includes(role)) n.readBy.push(role);
        });
    }
    saveState(state, { immediate: true });
    notify('All notifications marked as read', 'success');
}

export function deleteAllNotifs(role) {
    const state = loadState();
    state.deletedNotifIds = Array.isArray(state.deletedNotifIds) ? state.deletedNotifIds : [];
    let toDelete;
    if (role === 'partner') toDelete = getPartnerNotificationItems(state);
    else if (role === 'superuser') toDelete = state.notifications || [];
    else toDelete = notificationsForRole(state, role);
    toDelete.forEach((item) => {
        if (item && item.id && !state.deletedNotifIds.includes(item.id)) state.deletedNotifIds.push(item.id);
    });
    const deletedSet = new Set(state.deletedNotifIds);
    state.notifications = (state.notifications || []).filter((n) => !deletedSet.has(n.id));
    saveState(state, { immediate: true });
    notify('All notifications deleted', 'info');
}

/** Partner "Requests & Actions" items are read-tracked separately. */
export function markPartnerItemRead(itemId) {
    const state = loadState();
    state.partnerReadItems = Array.from(new Set([...(state.partnerReadItems || []), itemId]));
    saveState(state);
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
/**
 * saveUserProfileData(): updates the matching user / guide / vendor record in the
 * workflow state. Returns the updated session object (caller stores it).
 */
export function saveUserProfile(session, { name, email, phone, availability, picUrl }) {
    const nextSession = { ...session };
    if (name) nextSession.name = name;
    if (email) nextSession.email = email;
    if (phone) nextSession.phone = phone;
    if (availability) nextSession.availabilityStatus = availability;
    if (picUrl) {
        nextSession.picUrl = picUrl;
        nextSession.avatar = picUrl;
    }

    const state = loadState();
    const userKey = String(session.email || session.name || session.id || '').toLowerCase();
    const matches = (record) => (record.email && record.email.toLowerCase() === userKey) || (record.name && record.name.toLowerCase() === userKey) || record.id === session.id;
    const apply = (record, availabilityKey) => {
        if (name) record.name = name;
        if (email) record.email = email;
        if (phone) record.phone = phone;
        if (nextSession.picUrl) record.avatar = nextSession.picUrl;
        if (availability) {
            record.availabilityStatus = availability;
            record[availabilityKey] = availability;
        }
    };
    const user = (state.users || []).find(matches);
    if (user) apply(user, 'availability');
    const guide = (state.guides || []).find(matches);
    if (guide) apply(guide, 'status');
    const vendor = (state.vendors || []).find(matches);
    if (vendor) apply(vendor, 'status');
    saveState(state, { immediate: true });
    return nextSession;
}

// ---------------------------------------------------------------------------
// Directory (Super Admin vendors / guides pages)
// ---------------------------------------------------------------------------
function nextDirectoryId(prefix, items) {
    const max = (items || []).reduce((value, item) => {
        const number = Number(String(item.id || '').replace(/\D/g, ''));
        return Number.isFinite(number) ? Math.max(value, number) : value;
    }, 0);
    return `${prefix}-${max + 1}`;
}

export function addGuideRecord({ name, languages, experience }) {
    const state = loadState();
    const guide = { id: nextDirectoryId('GUIDE', state.guides), name, initials: initialsFor(name), languages, experience, rating: 0, tours: 0, status: 'Available' };
    state.guides.push(guide);
    saveState(state);
    notify(`${name} added as a tour guide.`, 'success');
    return guide;
}

export function addVendorRecord({ name, type, location }) {
    const state = loadState();
    const vendor = { id: nextDirectoryId('VENDOR', state.vendors), name, type, location, rating: 0, trips: 0, status: 'Available' };
    state.vendors.push(vendor);
    saveState(state);
    notify(`${name} added as a vendor.`, 'success');
    return vendor;
}

export function removeDirectoryRecord(kind, id) {
    const state = loadState();
    const collection = kind === 'guide' ? state.guides : state.vendors;
    const label = kind === 'guide' ? 'guide' : 'vendor';
    const record = (collection || []).find((item) => item.id === id);
    if (!record) {
        notify(`This ${label} is a registered user account. Manage it from User Management.`, 'info');
        return false;
    }
    const assigned = (state.trips || []).some((trip) => (kind === 'guide'
        ? trip.guide?.id === id || trip.guide?.name === record.name
        : trip.vendor?.id === id || trip.vendor?.name === record.name));
    if (assigned) {
        notify(`Cannot remove ${record.name}; this ${label} is assigned to a trip.`, 'warning');
        return false;
    }
    if (kind === 'guide') state.guides = state.guides.filter((item) => item.id !== id);
    else state.vendors = state.vendors.filter((item) => item.id !== id);
    saveState(state);
    notify(`${record.name} removed.`, 'success');
    return true;
}

// ---------------------------------------------------------------------------
// Package catalog (getAllWorkflowPackages / add / update / delete)
// ---------------------------------------------------------------------------
export function getAllPackages(state = getSnapshot()) {
    if (state && Array.isArray(state.packages) && state.packages.length > 0) return state.packages;
    return DEFAULT_PACKAGES;
}

export function addPackage(newPkg) {
    const state = loadState();
    const pkgs = state.packages.length > 0 ? state.packages : structuredClone(DEFAULT_PACKAGES);
    pkgs.unshift(newPkg);
    state.packages = pkgs;
    saveState(state, { immediate: true });
    return state.packages;
}

export function updatePackage(updatedPkg) {
    const state = loadState();
    const pkgs = state.packages.length > 0 ? state.packages : structuredClone(DEFAULT_PACKAGES);
    const index = pkgs.findIndex((p) => p.id === updatedPkg.id);
    if (index !== -1) pkgs[index] = { ...pkgs[index], ...updatedPkg };
    else pkgs.unshift(updatedPkg);
    state.packages = pkgs;
    saveState(state, { immediate: true });
    return state.packages;
}

export function deletePackage(packageId) {
    const state = loadState();
    const pkgs = state.packages.length > 0 ? state.packages : structuredClone(DEFAULT_PACKAGES);
    state.packages = pkgs.filter((p) => p.id !== packageId);
    saveState(state, { immediate: true });
    return state.packages;
}

// ---------------------------------------------------------------------------
// Payments, payouts and refunds (modal wizards)
// ---------------------------------------------------------------------------
export function submitTripPayment(tripId, { methodLabel, accountDetail }) {
    return updateTrip(tripId, (trip, state) => {
        const amt = Number(trip.budget || 1200);
        trip.paymentStatus = 'Paid';
        trip.paidAt = nowISO();
        trip.paymentMethod = methodLabel;
        trip.paymentAccount = accountDetail;
        trip.status = 'ready';
        trip.stage = 'Ready';
        if (!trip.guideStatus || trip.guideStatus === 'Assigned' || trip.guideStatus === 'Pending') trip.guideStatus = 'Accepted';
        if (!trip.vendorStatus || trip.vendorStatus === 'Requested' || trip.vendorStatus === 'Pending') trip.vendorStatus = 'Accepted';
        addUpdate(trip, 'Traveler', 'Payment Completed', `Full payment of ${formatMoney(amt)} completed via ${methodLabel} (${accountDetail}). Trip is ready for departure.`, 'Paid');
        notifyStakeholders(state, trip, 'Trip Payment Received', `Traveler completed payment of ${formatMoney(amt)} for ${trip.title}. Trip is now ready to start.`, 'Paid', ['partner', 'guide', 'vendor']);
    });
}

export function disburseBudgetShare(tripId, { pcts, gwMethod }) {
    const payerName = currentSession().name || 'Travel Partner';
    return updateTrip(tripId, (t, st) => {
        const b = Number(t.budget || 0);
        const calc = (k) => parseFloat(((b * (pcts[k] || 0)) / 100).toFixed(2));
        const gAmt = calc('guide');
        const vAmt = calc('vendor');
        const aAmt = calc('admin');
        t.budgetShare = {
            disbursed: true, disbursedAt: nowISO(), disbursedBy: payerName,
            partnerPercent: 0, partnerAmount: 0,
            guidePercent: pcts.guide, guideAmount: gAmt,
            vendorPercent: pcts.vendor, vendorAmount: vAmt,
            supportPercent: 0, supportAmount: 0,
            adminPercent: pcts.admin || 0, adminAmount: aAmt,
            gwMethod, totalBudget: b,
        };
        addUpdate(t, 'Travel Partner', 'Partner Paid Guide & Vendor', `${payerName} paid accepted shares via ${gwMethod} — Guide: ${formatMoney(gAmt)} (${pcts.guide}%), Vendor: ${formatMoney(vAmt)} (${pcts.vendor}%).`, 'Paid');
        if (t.guide) notifyStakeholders(st, t, 'Payment Received from Partner', `Travel Partner ${payerName} paid your accepted share of ${formatMoney(gAmt)} (${pcts.guide}%) for trip ${t.id}.`, 'Paid', ['guide']);
        if (t.vendor) notifyStakeholders(st, t, 'Payment Received from Partner', `Travel Partner ${payerName} paid your accepted share of ${formatMoney(vAmt)} (${pcts.vendor}%) for trip ${t.id}.`, 'Paid', ['vendor']);
    });
}

export function refundBaseAmount(trip) {
    let totalBudget = Number(trip.budget || trip.totalAmount || trip.paidAmount || 0);
    if (!totalBudget || totalBudget <= 0) {
        const key = packageKeyFor(trip);
        totalBudget = key === 'swiss' ? 1600 : key === 'tokyo' ? 1500 : key === 'paris' ? 1200 : key === 'bali' ? 800 : 1000;
    }
    return totalBudget;
}

export function processCancellationRefund(tripId, { feePct, destAccount, methodLabel }) {
    const snapshotTrip = getSnapshot().trips.find((t) => t.id === tripId || t.requestId === tripId);
    if (!snapshotTrip) {
        notify('Trip not found', 'error');
        return null;
    }
    if (snapshotTrip.cancellationRequested && snapshotTrip.status !== 'cancelled') acceptTripCancellation(tripId);
    const totalBudget = refundBaseAmount(snapshotTrip);
    const refundPct = 100 - feePct;
    const feeAmt = parseFloat(((totalBudget * feePct) / 100).toFixed(2));
    const refundAmt = parseFloat(((totalBudget * refundPct) / 100).toFixed(2));
    updateTrip(tripId, (trip, st) => {
        trip.refundRecord = {
            processed: true,
            processedAt: nowISO(),
            cancellationFeePercent: feePct,
            cancellationFeeAmount: feeAmt,
            refundPercent: refundPct,
            refundAmount: refundAmt,
            totalBudget,
            destinationAccount: destAccount,
            refundMethod: methodLabel,
            txnId: `RFD-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        };
        addUpdate(trip, 'Super Admin', 'Cancellation Refund Issued', `Refund of ${formatMoney(refundAmt)} (${refundPct}%) issued to ${destAccount} via ${methodLabel}. Admin retained ${formatMoney(feeAmt)} (${feePct}%) cancellation fee.`, 'Refunded');
        notifyStakeholders(st, trip, 'Cancellation Refund Processed', `Your refund of ${formatMoney(refundAmt)} (${refundPct}%) for cancelled trip ${trip.id} has been processed back to your original payment account (${destAccount}). Admin fee retained: ${formatMoney(feeAmt)} (${feePct}%).`, 'Refunded', ['traveler', 'partner', 'support']);
    });
    return { refundAmt, refundPct, feeAmt };
}

// ---------------------------------------------------------------------------
// Payroll (crud_controller.js disburseEmployeeSalary / runBulkEmployeePayroll)
// ---------------------------------------------------------------------------
export function getUserSalary(user) {
    const salStore = safeJson(USER_SALARIES_KEY, {});
    if (user.id && salStore[user.id] !== undefined) return salStore[user.id];
    if (user.email && salStore[user.email.toLowerCase()] !== undefined) return salStore[user.email.toLowerCase()];
    return user.monthlySalary;
}

export function rememberUserSalary(id, email, amount) {
    const salStore = safeJson(USER_SALARIES_KEY, {});
    if (id) salStore[id] = Number(amount);
    if (email) salStore[email.toLowerCase()] = Number(amount);
    writeJson(USER_SALARIES_KEY, salStore);
}

function salaryNotification(user, amount, month) {
    return {
        id: `NOTIF-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`,
        roles: ['partner', 'support', 'guide', 'vendor', 'all', 'superuser'],
        tripId: '',
        tripTitle: 'Monthly Salary',
        title: 'Monthly Salary Disbursed',
        message: `Your monthly salary of ₹${Number(amount).toLocaleString()} for ${month} has been successfully processed by Super Admin.`,
        type: 'Success',
        readBy: [],
        recipientId: user.id || user.email,
        userEmail: user.email || '',
        userName: user.name || '',
        createdAt: nowISO(),
    };
}

/** Records salary payouts and delivers the notification through the workflow state. */
export function disburseSalaries(entries) {
    const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const salLogs = safeJson(SALARY_PAYOUTS_KEY, []);
    const state = loadState();
    entries.forEach(({ user, amount }) => {
        salLogs.unshift({
            id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
            userId: user.id || user.email,
            userName: user.name,
            userEmail: user.email,
            role: user.role,
            amount,
            month,
            disbursedAt: nowISO(),
            status: 'Completed',
        });
        state.notifications.unshift(salaryNotification(user, amount, month));
    });
    writeJson(SALARY_PAYOUTS_KEY, salLogs);
    saveState(state, { immediate: true });
    return month;
}
