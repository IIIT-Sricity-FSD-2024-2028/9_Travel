/**
 * Read-only selectors over the workflow state – ported from js/workflow.js and
 * js/crud_controller.js. Where the original file defined a function twice the
 * later (effective) definition is the one ported here.
 */
import { currentRole, currentSession } from './store';
import { MESSAGE_TRIP_KEY, ROLE_LABELS, TRAVELER_ASSIGNMENTS_KEY } from './constants';
import { formatDateRange, initialsFor, isTripPaid, relativeTime, statusLabel, dateValue } from './utils';

const lower = (value) => String(value || '').toLowerCase().trim();

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------
export function allActiveTrips(state) {
    return (state.trips || []).filter((trip) => trip.status !== 'cancelled');
}

/** Filters trips to the signed-in traveler / guide / vendor (applied at render time). */
export function tripsForCurrentUser(trips) {
    const session = currentSession();
    const role = lower(session.role || currentRole());
    const email = lower(session.email);
    const name = lower(session.name);

    if (role === 'traveler') {
        return (trips || []).filter((trip) => {
            const tripEmail = lower(trip.travelerEmail);
            const tripName = lower(trip.travelerName);
            if (email && tripEmail && tripEmail === email) return true;
            if (name && tripName && (tripName === name || name.includes(tripName) || tripName.includes(name))) return true;
            if (!tripEmail || tripEmail === 'traveler@gmail.com' || tripName === 'n bharath' || tripName === 'john traveler') {
                if (email === 'traveler@gmail.com' || name === 'n bharath' || name === 'john traveler' || (!email && !name)) return true;
            }
            return false;
        });
    }
    if (role === 'guide') {
        return (trips || []).filter((trip) => {
            if (!trip.guide) return false;
            const guideEmail = lower(trip.guide.email);
            const guideName = lower(trip.guide.name);
            if (email && guideEmail && guideEmail === email) return true;
            if (name && guideName && (guideName === name || name.includes(guideName) || guideName.includes(name))) return true;
            if (!email && trip.guide) return true;
            return false;
        });
    }
    if (role === 'vendor') {
        return (trips || []).filter((trip) => {
            if (!trip.vendor) return false;
            const vendorEmail = lower(trip.vendor.email);
            const vendorName = lower(trip.vendor.name);
            if (email && vendorEmail && vendorEmail === email) return true;
            if (name && vendorName && (vendorName === name || name.includes(vendorName) || vendorName.includes(name))) return true;
            if (!email && trip.vendor) return true;
            return false;
        });
    }
    return trips || [];
}

/** Effective acceptedTrips() (second definition in workflow.js). */
export function acceptedTrips(state) {
    if (!state || !Array.isArray(state.trips)) return [];
    const session = currentSession();
    const currentEmail = lower(session.email);
    const role = lower(session.role);
    return state.trips.filter((t) => {
        if (!t || t.status === 'cancelled') return false;
        if (role.includes('superuser') || role.includes('support')) return true;
        const pEmail = lower(t.partnerEmail);
        const st = lower(t.status);
        const rq = lower(t.requestStatus);
        const isAssignedPartner = !pEmail || pEmail === currentEmail || role.includes('partner');
        return isAssignedPartner && (['accepted', 'confirmed', 'ongoing', 'upcoming', 'requested', 'planning'].includes(st) || rq === 'accepted');
    });
}

function matchPersonTrips(state, key) {
    const session = currentSession();
    const trips = (state.trips || []).filter((trip) => trip && trip[key] && trip.status !== 'cancelled');
    if (session && session.email) {
        const currentEmail = lower(session.email);
        const currentName = lower(session.name);
        const currentId = lower(session.id);
        const emailKey = key === 'vendor' ? 'assignedVendorEmail' : 'assignedGuideEmail';
        const matched = trips.filter((trip) => {
            const pEmail = lower(trip[emailKey] || trip[key]?.email);
            const pName = lower(trip[key]?.name);
            const pId = lower(trip[key]?.id);
            return (pEmail && (pEmail === currentEmail || currentEmail.includes(pEmail)))
                || (pName && currentName && (pName === currentName || currentName.includes(pName) || pName.includes(currentName)))
                || (pId && pId === currentId);
        });
        if (matched.length > 0) return matched;
    }
    return trips;
}

export function getVendorTrips(state) {
    return matchPersonTrips(state, 'vendor');
}

export function getGuideTrips(state) {
    return matchPersonTrips(state, 'guide');
}

export function latestTravelerTrip(state) {
    const userTrips = tripsForCurrentUser(allActiveTrips(state));
    const ordered = userTrips.slice().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    const active = ordered.find((trip) => !['completed', 'cancelled', 'requested'].includes(trip.status));
    if (active) return active;
    return ordered.find((trip) => trip.status !== 'requested') || ordered[0] || null;
}

export function canStartTrip(trip) {
    if (!trip) return false;
    const isSupportPending = trip.supportStatus === 'Sent';
    const isPaidOrConfirmed = trip.paymentStatus === 'Paid' || (trip.guideStatus === 'Accepted' && trip.vendorStatus === 'Accepted');
    return trip.status !== 'cancelled' && isPaidOrConfirmed && !isSupportPending;
}

export function findTrip(state, id) {
    if (!id) return null;
    return (state.trips || []).find((t) => t.id === id || t.requestId === id) || null;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export function isNotificationForCurrentUser(notif, session, state) {
    if (!notif) return false;
    if (Array.isArray(state?.deletedNotifIds) && state.deletedNotifIds.includes(notif.id)) return false;

    const activeRole = currentRole() || session?.role || 'partner';
    const notifRoles = notif.roles || [];
    const isSalaryNotif = /salary|payroll|disburs/i.test(`${notif.title || ''} ${notif.message || ''}`);
    const notifRecipient = lower(notif.recipientId || notif.userEmail);
    const currentEmail = lower(session?.email);
    const currentName = lower(session?.name);
    const currentId = lower(session?.id);
    const isDirectRecipient = Boolean(notifRecipient && (
        notifRecipient === currentEmail
        || notifRecipient === currentId
        || (currentName && lower(notif.message).includes(currentName))
    ));
    const roleMatches = notifRoles.includes(activeRole) || notifRoles.includes('all') || isSalaryNotif || isDirectRecipient || !notifRoles.length;
    if (!roleMatches) return false;

    const trip = notif.tripId && Array.isArray(state?.trips) ? state.trips.find((t) => String(t.id) === String(notif.tripId)) : null;

    if (activeRole === 'traveler') {
        const notifEmail = lower(notif.travelerEmail || notif.userEmail);
        const notifName = lower(notif.travelerName);
        if (notifEmail && currentEmail) return notifEmail === currentEmail;
        if (notifName && currentName) return notifName === currentName;
        if (trip) {
            const tripEmail = lower(trip.travelerEmail);
            const tripName = lower(trip.travelerName);
            if (tripEmail && currentEmail) return tripEmail === currentEmail;
            if (tripName && currentName) return tripName === currentName;
        }
        if (currentName && notif.message && lower(notif.message).includes(currentName)) return true;
        if (notif.tripId || notif.travelerEmail || notif.travelerName) return false;
        return true;
    }
    if (activeRole === 'guide' || activeRole === 'vendor') {
        const prefix = activeRole;
        const notifPersonEmail = lower(notif[`${prefix}Email`]);
        const notifPersonName = lower(notif[`${prefix}Name`]);
        if (notifPersonEmail && currentEmail) return notifPersonEmail === currentEmail;
        if (notifPersonName && currentName) return notifPersonName === currentName;
        if (trip) {
            const assignedEmail = lower(prefix === 'guide'
                ? (trip.assignedGuideEmail || trip.guideEmail || trip.guide?.email)
                : (trip.assignedVendorEmail || trip.vendorEmail || trip.vendor?.email));
            const assignedName = lower(trip[prefix]?.name);
            if (assignedEmail && currentEmail) return assignedEmail === currentEmail;
            if (assignedName && currentName) return assignedName === currentName;
            if (assignedEmail || assignedName) return false;
        }
        if (currentName && notif.message && lower(notif.message).includes(currentName)) return true;
        if (notif.tripId || notif[`${prefix}Email`] || notif[`${prefix}Name`]) return false;
        return true;
    }
    if (activeRole === 'support') {
        const titleLower = lower(notif.title);
        const msgLower = lower(notif.message);
        return ['support', 'issue', 'resolution', 'help', 'salary', 'payroll'].some((w) => titleLower.includes(w))
            || ['support', 'issue', 'resolution', 'salary', 'payroll'].some((w) => msgLower.includes(w))
            || notif.category === 'support'
            || Boolean(notif.issueId)
            || isSalaryNotif
            || isDirectRecipient;
    }
    if (activeRole === 'partner') {
        if (trip) {
            const partnerEmail = lower(trip.partnerEmail);
            const partnerName = lower(trip.partnerName || trip.partner?.name);
            if (partnerEmail && currentEmail) return partnerEmail === currentEmail;
            if (partnerName && currentName) return partnerName === currentName;
        }
        return true;
    }
    if (activeRole === 'superuser') return true;
    return false;
}

export function notificationsForRole(state, role) {
    const deletedIds = new Set(state.deletedNotifIds || []);
    const filteredList = (state.notifications || []).filter((n) => !deletedIds.has(n.id));
    if (role === 'traveler') {
        const userTrips = tripsForCurrentUser(state.trips || []);
        const userTripIds = new Set(userTrips.map((t) => t.id).concat(userTrips.map((t) => t.requestId).filter(Boolean)));
        const userEmail = lower(currentSession().email);
        return filteredList.filter((item) => {
            const matchesRole = item.roles && (item.roles.includes('traveler') || item.roles.includes('all'));
            if (!matchesRole) return false;
            if (item.userEmail && lower(item.userEmail) === userEmail) return true;
            if (item.tripId && userTripIds.has(item.tripId)) return true;
            if (!item.userEmail && (!item.tripId || String(item.id).startsWith('NTF-SEED'))) return true;
            return false;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return filteredList
        .filter((item) => item.roles && (item.roles.includes(role) || item.roles.includes('all')))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function matchesNotifFilter(item, filterName, role) {
    if (!filterName || filterName === 'all' || filterName === 'All Notifications' || filterName === 'All Alerts' || filterName === 'All Requests') return true;
    const filterLower = lower(filterName);
    const title = lower(item.title);
    const msg = lower(item.message || item.subtitle || item.desc);
    const type = lower(item.type);
    const text = `${title} ${msg} ${type}`;
    const categories = (item.categories || []).map((c) => lower(c));

    if (filterLower === 'unread') {
        if (role === 'partner') return item.isUnread;
        return !(item.readBy || []).includes(role);
    }
    if (filterLower.includes('issue') || filterLower.includes('reported')) return /issue|support|ticket|report/i.test(text) || type.includes('issue') || type.includes('warn');
    if (filterLower.includes('emergency')) return /emergency|critical|high/i.test(text) || type.includes('emergency');
    if (filterLower.includes('assign')) return /assign|tour|schedule/i.test(text) || categories.includes('guide requests');
    if (filterLower.includes('service')) return /service|vendor|request/i.test(text);
    if (filterLower.includes('system')) return /system|platform|alert|warn|info/i.test(text);
    if (filterLower.includes('urgent') || filterLower.includes('high')) return /urgent|high|critical|emergency/i.test(text) || categories.includes('urgent');
    if (filterLower.includes('request')) return /request|pending|review/i.test(text) || categories.includes('pending review');
    if (filterLower.includes('traveler')) return /traveler|trip|itinerary/i.test(text) || categories.includes('traveler actions');
    if (filterLower.includes('guide')) return /guide|tour/i.test(text) || categories.includes('guide requests');
    if (filterLower.includes('warn')) return /warn|weather|alert/i.test(text);
    if (filterLower.includes('update') || filterLower.includes('trip')) return /trip|update|schedule|change/i.test(text) || categories.includes('itinerary mods');
    return true;
}

/** Aggregated "Requests & Actions" items for the Travel Partner notifications page. */
export function getPartnerNotificationItems(state) {
    const items = [];
    const seenIds = new Set();
    const trips = (state.trips || []).slice();
    const push = (item) => {
        if (seenIds.has(item.id)) return;
        seenIds.add(item.id);
        items.push(item);
    };

    trips.filter((t) => t.status === 'requested' || t.requestStatus === 'Requested').forEach((trip) => {
        push({
            id: `req-${trip.id}`, tripId: trip.id, type: 'New Request', badgeColor: 'orange', priority: 'HIGH',
            categories: ['Traveler Actions', 'Pending Review', 'Special Requests'], icon: 'clipboard', iconColor: 'orange',
            title: `${trip.title}`, subtitle: `Traveler ${trip.travelerName || 'Traveler'} submitted a new booking request`,
            meta: [
                { icon: 'user', text: trip.travelerName || 'Traveler' },
                { icon: 'clock', text: relativeTime(trip.createdAt) },
                { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
            ],
            banner: {
                color: 'yellow', title: 'Trip Details & Preferences:',
                content: `Destination: ${trip.destination} • Travelers: ${trip.travelersCount || 1} • Budget: $${trip.budget || 0} • Accommodation: ${trip.accommodationType || 'Standard'} • Pace: ${trip.tripPace || 'Moderate'}${trip.notes ? ` • Note: ${trip.notes}` : ''}`,
            },
            actions: [
                { label: 'Accept', icon: 'check', action: 'accept-trip', class: 'btn-accept', tripId: trip.id },
                { label: 'Reject', icon: 'x', action: 'reject-trip', class: 'btn-reject', tripId: trip.id },
                { label: 'View Trip', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' },
            ],
            createdAt: trip.createdAt,
        });
    });

    trips.filter((t) => t.cancellationRequested && t.cancellationStatus === 'Pending').forEach((trip) => {
        const cancelUpdate = (trip.updates || []).slice().reverse().find((u) => lower(u.status).includes('cancel') || lower(u.title).includes('cancel'));
        const reason = trip.cancellationReason || cancelUpdate?.message || `${trip.travelerName || 'Traveler'} requested cancellation for ${trip.destination}.`;
        push({
            id: `cancel-req-${trip.id}`, tripId: trip.id, type: 'Trip Cancellation', badgeColor: 'red', priority: 'URGENT',
            categories: ['Traveler Actions', 'Urgent', 'Pending Review', 'Cancellations'], icon: 'x', iconColor: 'red',
            title: `${trip.title} - Cancellation Request`, subtitle: `Traveler ${trip.travelerName || 'Traveler'} requested to cancel this trip`,
            meta: [
                { icon: 'user', text: trip.travelerName || 'Traveler' },
                { icon: 'clock', text: relativeTime(trip.cancellationRequestedAt || cancelUpdate?.createdAt || trip.updatedAt || trip.createdAt) },
                { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
            ],
            banner: { color: 'red', title: 'Cancellation Request Details:', content: `${reason} — Travel partner approval required to process cancellation.` },
            actions: [
                { label: 'Accept Cancellation', icon: 'check', action: 'accept-trip-cancellation', class: 'btn-accept', tripId: trip.id },
                { label: 'Decline', icon: 'x', action: 'reject-trip-cancellation', class: 'btn-reject', tripId: trip.id },
                { label: 'View Trip', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' },
            ],
            createdAt: trip.cancellationRequestedAt || cancelUpdate?.createdAt || trip.updatedAt || trip.createdAt,
        });
    });

    trips.filter((t) => t.status === 'cancelled' && !t.cancellationRequested).forEach((trip) => {
        const cancelUpdate = (trip.updates || []).slice().reverse().find((u) => lower(u.status).includes('cancel') || lower(u.title).includes('cancel'));
        push({
            id: `cancel-done-${trip.id}`, tripId: trip.id, type: 'Trip Cancellation', badgeColor: 'red', priority: 'NORMAL',
            categories: ['Traveler Actions', 'Cancellations'], icon: 'x', iconColor: 'red',
            title: `${trip.title}`, subtitle: 'Trip has been cancelled',
            meta: [
                { icon: 'user', text: trip.travelerName || 'Traveler' },
                { icon: 'clock', text: relativeTime(cancelUpdate?.createdAt || trip.updatedAt || trip.createdAt) },
                { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
            ],
            banner: { color: 'yellow', title: 'Cancellation Record:', content: cancelUpdate?.message || `${trip.travelerName || 'Traveler'} trip was cancelled for ${trip.destination}.` },
            actions: [{ label: 'View Trip', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' }],
            createdAt: cancelUpdate?.createdAt || trip.updatedAt || trip.createdAt,
        });
    });

    trips.forEach((trip) => {
        (trip.updates || []).filter((u) =>
            lower(u.status).includes('itinerary') || lower(u.title).includes('itinerary') || lower(u.title).includes('modified')
            || lower(u.message).includes('preference') || lower(u.message).includes('itinerary'),
        ).forEach((upd, idx) => {
            push({
                id: `mod-${trip.id}-${upd.id || idx}`, tripId: trip.id, type: 'Itinerary Mod', badgeColor: 'purple', priority: 'NORMAL',
                categories: ['Traveler Actions', 'Pending Review', 'Itinerary Mods'], icon: 'edit', iconColor: 'purple',
                title: `${trip.title}`, subtitle: 'Traveler updated itinerary preferences and details',
                meta: [
                    { icon: 'user', text: trip.travelerName || 'Traveler' },
                    { icon: 'clock', text: relativeTime(upd.createdAt) },
                    { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
                ],
                banner: { color: 'purple', title: 'Modified Preferences & Details:', content: upd.message || `Updated preferences for ${trip.destination} (${trip.accommodationType || 'standard'} stay, ${trip.travelersCount} travelers).` },
                actions: [
                    { label: 'Approve', icon: 'check', action: 'approve-itinerary', class: 'btn-accept', tripId: trip.id },
                    { label: 'View Schedule', icon: 'calendar', action: 'route', class: 'btn-secondary', target: 'travelPartner_travelerSchedules.html' },
                ],
                createdAt: upd.createdAt,
            });
        });
    });

    trips.forEach((trip) => {
        if (trip.guideStatus === 'Rejected') {
            push({
                id: `guide-reject-${trip.id}`, tripId: trip.id, type: 'Guide Reassignment', badgeColor: 'red', priority: 'HIGH',
                categories: ['Guide Requests', 'Urgent', 'Pending Review'], icon: 'alert', iconColor: 'red',
                title: `Guide Rejected Assignment - ${trip.guide?.name || 'Guide'}`,
                subtitle: `${trip.guide?.name || 'Assigned guide'} cannot take ${trip.title}. Immediate reassignment needed.`,
                meta: [
                    { icon: 'user', text: trip.guide?.name || 'Tour Guide' },
                    { icon: 'clock', text: relativeTime(trip.updatedAt) },
                    { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
                ],
                banner: { color: 'yellow', title: 'Reassignment Needed:', content: `Trip ${trip.title} (${trip.id}) in ${trip.destination} is missing an active guide. Please assign an available tour guide.` },
                actions: [
                    { label: 'Reassign Guide', icon: 'user', action: 'route', class: 'btn-accept', target: 'travelPartner_guideAssignment.html' },
                    { label: 'View Schedule', icon: 'calendar', action: 'route', class: 'btn-secondary', target: 'travelPartner_travelerSchedules.html' },
                ],
                createdAt: trip.updatedAt,
            });
        }
        (trip.updates || []).filter((u) => u.source === 'Guide' || lower(u.source).includes('guide')).forEach((gUpd, idx) => {
            const isWarning = lower(gUpd.status).includes('warn') || lower(gUpd.status).includes('delay') || lower(gUpd.title).includes('delay');
            const isExpense = lower(gUpd.title).includes('expense') || lower(gUpd.message).includes('expense');
            push({
                id: `guide-upd-${trip.id}-${gUpd.id || idx}`, tripId: trip.id,
                type: isWarning ? 'Guide Alert' : isExpense ? 'Expense' : 'Guide Update',
                badgeColor: isWarning ? 'red' : isExpense ? 'orange' : 'blue', priority: isWarning ? 'HIGH' : 'NORMAL',
                categories: ['Guide Requests', isWarning ? 'Urgent' : 'Pending Review', 'Pending Review'],
                icon: isWarning ? 'alert' : isExpense ? 'dollar-sign' : 'info', iconColor: isWarning ? 'red' : isExpense ? 'orange' : 'blue',
                title: `${gUpd.title} - ${trip.title}`, subtitle: `Tour Guide ${trip.guide?.name || 'Guide'} posted an update for ${trip.title}`,
                meta: [
                    { icon: 'user', text: trip.guide?.name || 'Tour Guide' },
                    { icon: 'clock', text: relativeTime(gUpd.createdAt) },
                    { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
                ],
                banner: { color: isWarning ? 'yellow' : 'blue', title: 'Guide Note:', content: gUpd.message || 'No additional note provided.' },
                actions: [
                    { label: 'Acknowledge', icon: 'check', action: 'ack-update', class: 'btn-accept', tripId: trip.id },
                    { label: 'View Schedule', icon: 'calendar', action: 'route', class: 'btn-secondary', target: 'travelPartner_travelerSchedules.html' },
                ],
                createdAt: gUpd.createdAt,
            });
        });
    });

    trips.forEach((trip) => {
        if (trip.vendorStatus === 'Rejected') {
            push({
                id: `vendor-reject-${trip.id}`, tripId: trip.id, type: 'Vendor Reassignment', badgeColor: 'red', priority: 'HIGH',
                categories: ['Vendor Actions', 'Urgent', 'Pending Review'], icon: 'alert', iconColor: 'red',
                title: `Vendor Declined Request - ${trip.vendor?.name || 'Vendor'}`,
                subtitle: `${trip.vendor?.name || 'Vendor'} declined service for ${trip.title}. Please reassign a service vendor.`,
                meta: [{ icon: 'truck', text: trip.vendor?.name || 'Vendor' }, { icon: 'clock', text: relativeTime(trip.updatedAt) }],
                banner: { color: 'yellow', title: 'Vendor Reassignment Required:', content: `Service (${trip.vendor?.type || 'transport'}) for ${trip.title} was declined. Reassign to ensure seamless execution.` },
                actions: [{ label: 'Reassign Vendor', icon: 'truck', action: 'route', class: 'btn-accept', target: 'travelPartner_vendorAssignment.html' }],
                createdAt: trip.updatedAt,
            });
        }
    });

    (state.messages || []).forEach((msg, idx) => {
        const isGuide = msg.fromRole === 'guide';
        const trip = trips.find((t) => t.id === msg.tripId);
        push({
            id: `msg-${msg.id || idx}`, tripId: msg.tripId || '', type: 'Message', badgeColor: 'blue', priority: 'NORMAL',
            categories: [isGuide ? 'Guide Requests' : 'Traveler Actions', 'Pending Review', 'Messages'], icon: 'message', iconColor: 'blue',
            title: `Message from ${msg.fromName || (isGuide ? 'Tour Guide' : 'Traveler')}`,
            subtitle: `Trip: ${trip ? trip.title : msg.tripTitle || msg.tripId || 'General Coordination'}`,
            meta: [
                { icon: 'user', text: `${msg.fromName || 'User'} (${ROLE_LABELS[msg.fromRole] || msg.fromRole})` },
                { icon: 'clock', text: relativeTime(msg.createdAt) },
            ],
            banner: { color: 'blue', title: 'Message Content:', content: msg.body || msg.message || '' },
            actions: [
                { label: 'Reply', icon: 'message', action: 'quick-reply', class: 'btn-secondary', tripId: msg.tripId, recipientName: msg.fromName, toRole: msg.fromRole },
                { label: 'View Trip', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' },
            ],
            createdAt: msg.createdAt,
        });
    });

    (state.issues || []).filter((iss) => iss.status !== 'Resolved').forEach((iss, idx) => {
        const isUrgent = lower(iss.priority).includes('high') || lower(iss.priority).includes('critical');
        const isGuide = iss.reporterRole === 'Guide' || iss.reporterRole === 'Tour Guide';
        push({
            id: `iss-${iss.id || idx}`, tripId: iss.tripId || '', type: 'Reported Issue', badgeColor: isUrgent ? 'red' : 'orange', priority: isUrgent ? 'HIGH' : 'NORMAL',
            categories: [isGuide ? 'Guide Requests' : 'Traveler Actions', 'Urgent', 'Pending Review'], icon: 'alert', iconColor: isUrgent ? 'red' : 'orange',
            title: `Issue: ${iss.title || iss.type || 'Traveler Issue'}`,
            subtitle: `Reported by ${iss.reportedBy || 'User'} • Trip: ${iss.tripTitle || iss.tripId || 'General'}`,
            meta: [
                { icon: 'user', text: `${iss.reportedBy || 'User'} (${iss.reporterRole || 'Traveler'})` },
                { icon: 'clock', text: relativeTime(iss.createdAt) },
            ],
            banner: { color: 'yellow', title: 'Issue Description:', content: iss.description || 'No description provided.' },
            actions: [
                { label: 'Send to Support', icon: 'headphones', action: 'send-trip-to-support', class: 'btn-accept', tripId: iss.tripId },
                { label: 'View Trip', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' },
            ],
            createdAt: iss.createdAt,
        });
    });

    notificationsForRole(state, 'partner').forEach((ntf, idx) => {
        const type = lower(ntf.type);
        const isCancel = type.includes('cancel');
        const isReq = type.includes('request');
        const isMod = type.includes('itinerary') || lower(ntf.title).includes('itinerary');
        const isGuide = lower(ntf.title).includes('guide') || lower(ntf.message).includes('guide');
        const isUrgent = isCancel || type.includes('warn') || type.includes('urgent');
        const cats = ['Pending Review'];
        cats.push(isGuide ? 'Guide Requests' : 'Traveler Actions');
        if (isUrgent) cats.push('Urgent');
        if (isCancel) cats.push('Cancellations');
        if (isMod) cats.push('Itinerary Mods');
        if (isReq) cats.push('Special Requests');
        push({
            id: `ntf-${ntf.id || idx}`, tripId: ntf.tripId || '', type: ntf.type || 'Notification',
            badgeColor: isUrgent ? 'red' : isMod ? 'purple' : 'blue', priority: isUrgent ? 'HIGH' : 'NORMAL', categories: cats,
            icon: isCancel ? 'x' : isUrgent ? 'alert' : 'bell', iconColor: isUrgent ? 'red' : isMod ? 'purple' : 'blue',
            title: ntf.title || 'System Notification', subtitle: ntf.message || '',
            meta: [{ icon: 'clock', text: relativeTime(ntf.createdAt) }, ...(ntf.tripId ? [{ icon: 'calendar', text: `Trip: ${ntf.tripId}` }] : [])],
            banner: { color: isUrgent ? 'yellow' : 'blue', title: 'Notification Details:', content: ntf.message || '' },
            actions: [{ label: 'View Details', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' }],
            createdAt: ntf.createdAt,
        });
    });

    const deletedIds = new Set(state.deletedNotifIds || []);
    const partnerRead = state.partnerReadItems || [];
    return items
        .filter((item) => !deletedIds.has(item.id))
        .map((item) => ({ ...item, createdAt: item.createdAt || new Date().toISOString(), isUnread: !partnerRead.includes(item.id) }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** Count used for the red dot on the header bell. */
export function unreadNotificationCount(state, role) {
    if (role === 'partner') return getPartnerNotificationItems(state).filter((item) => item.isUnread).length;
    return notificationsForRole(state, role).filter((item) => !(item.readBy || []).includes(role)).length;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
export function storedMessageTripId() {
    try { return localStorage.getItem(MESSAGE_TRIP_KEY) || ''; } catch { return ''; }
}

export function setStoredMessageTripId(id) {
    try { if (id) localStorage.setItem(MESSAGE_TRIP_KEY, id); } catch { /* ignore */ }
}

export function messageTrips(state) {
    const role = currentRole();
    const trips = tripsForCurrentUser(allActiveTrips(state)).filter((trip) => trip.status !== 'cancelled');
    if (role === 'guide') return trips.filter((trip) => trip.guide);
    if (role === 'vendor') return trips.filter((trip) => trip.vendor);
    if (role === 'traveler') return trips;
    if (['partner', 'superuser', 'support'].includes(role)) return allActiveTrips(state).filter((trip) => trip.status !== 'cancelled');
    return trips;
}

export function selectedMessageTrip(state, selectedId) {
    const trips = messageTrips(state);
    const storedId = selectedId || storedMessageTripId();
    const latest = latestTravelerTrip(state);
    return trips.find((trip) => trip.id === storedId) || (latest && trips.find((trip) => trip.id === latest.id)) || trips[0] || null;
}

export function messagesForTrip(state, tripId) {
    if (!tripId) return [];
    return (state.messages || [])
        .filter((message) => message.tripId === tripId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function latestMessagePreview(state, trip) {
    const latest = messagesForTrip(state, trip.id)[0];
    return latest ? latest.body : trip.currentActivity || 'No messages yet';
}

// ---------------------------------------------------------------------------
// Directory (guides / vendors) – effective definitions from workflow.js
// ---------------------------------------------------------------------------
export function assignableGuides(state) {
    let guidesList = [];
    if (Array.isArray(state?.users)) {
        guidesList = state.users.filter((u) => lower(u.role).includes('guide')).map((u) => ({
            id: u.id || u.email,
            name: u.name || u.email,
            experience: u.experience || '8 yrs',
            languages: u.languages || 'English, Hindi, Telugu',
            rating: u.rating || '4.9',
            tours: u.toursCompleted || u.tours || 250,
            status: u.status || 'Available',
            email: u.email,
            phone: u.phone || '',
        }));
    }
    if (!guidesList.some((g) => lower(g.name).includes('koushik'))) {
        guidesList.unshift({ id: 'USER-6', name: 'Koushik', experience: '8 yrs', languages: 'English, Hindi, Telugu', rating: '4.9', tours: '250', status: 'Available', email: 'koushik@gmail.com' });
    }
    return guidesList;
}

export function assignableVendors(state) {
    let vendorsList = [];
    if (Array.isArray(state?.users)) {
        vendorsList = state.users.filter((u) => lower(u.role).includes('vendor')).map((u) => ({
            id: u.id || u.email,
            name: u.name || u.email,
            type: u.serviceType || u.category || 'Transport & Stay',
            location: u.location || 'All Destinations',
            rating: u.rating || '4.9',
            trips: u.tripsCompleted || u.trips || 150,
            status: u.status || 'Available',
            email: u.email,
            phone: u.phone || '',
        }));
    }
    if (!vendorsList.some((v) => lower(v.name).includes('lokesh'))) {
        vendorsList.unshift({ id: 'USER-5', name: 'Lokesh', type: 'Transport & Stay', location: 'All Destinations', rating: '4.9', trips: '150', status: 'Available', email: 'lokesh@gmail.com' });
    }
    return vendorsList;
}

export function isDirectoryAvailable(status, kind) {
    const s = lower(status || 'Available');
    if (kind === 'vendor') return s === 'available' || s === 'active' || s.includes('active') || s.includes('on duty') || s.includes('online');
    return s === 'available' || s === 'active' || s.includes('active') || s.includes('on duty') || s.includes('online');
}

// ---------------------------------------------------------------------------
// Finance / reports
// ---------------------------------------------------------------------------
export function tripRevenue(trips) {
    return (trips || []).reduce((sum, trip) => {
        if (!trip) return sum;
        const ref = trip.refundRecord;
        if (trip.status === 'cancelled') {
            if (ref && ref.processed) {
                const feeAmt = Number(ref.cancellationFeeAmount !== undefined ? ref.cancellationFeeAmount : ((Number(trip.budget || 0) * (ref.cancellationFeePercent || 0)) / 100));
                return sum + (Number.isNaN(feeAmt) ? 0 : feeAmt);
            }
            return sum;
        }
        if (!isTripPaid(trip)) return sum;
        return sum + Number(trip.budget || trip.totalAmount || trip.paidAmount || 0);
    }, 0);
}

export function userRoleCounts(users) {
    return (users || []).reduce((acc, user) => {
        acc[user.role || 'Unknown'] = (acc[user.role || 'Unknown'] || 0) + 1;
        return acc;
    }, {});
}

export function tripStatusCounts(trips) {
    return (trips || []).reduce((acc, trip) => {
        const label = statusLabel(trip);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
    }, {});
}

export function monthKey(value) {
    const date = dateValue(value) || new Date();
    return date.toLocaleDateString('en-US', { month: 'short' });
}

export function lastSixMonthLabels() {
    const labels = [];
    const date = new Date();
    date.setDate(1);
    for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(date);
        d.setMonth(date.getMonth() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    }
    return labels;
}

// ---------------------------------------------------------------------------
// Traveler ↔ partner / support load balancing (crud_controller.js autoAssignTraveler)
// ---------------------------------------------------------------------------
function readAssignments() {
    try { return JSON.parse(localStorage.getItem(TRAVELER_ASSIGNMENTS_KEY) || '{}') || {}; } catch { return {}; }
}

/** Manual partner / support assignment of a traveler (Edit User form). */
export function saveTravelerAssignment(key, { partnerId, supportId }, allUsers = []) {
    if (!key) return null;
    const asgStore = readAssignments();
    const prev = asgStore[key] || {};
    const find = (id) => (allUsers || []).find((u) => u.id === id || u.email === id || u.name === id);
    const partner = partnerId ? find(partnerId) : null;
    const support = supportId ? find(supportId) : null;
    asgStore[key] = {
        partnerId: partnerId || prev.partnerId || null,
        partnerName: partner ? partner.name : (partnerId || prev.partnerName || 'Unassigned'),
        supportId: supportId || prev.supportId || null,
        supportName: support ? support.name : (supportId || prev.supportName || 'Unassigned'),
        updatedAt: new Date().toISOString(),
    };
    try { localStorage.setItem(TRAVELER_ASSIGNMENTS_KEY, JSON.stringify(asgStore)); } catch { /* ignore */ }
    return asgStore[key];
}

export function autoAssignTraveler(travelerKey, allUsers = []) {
    const partners = (allUsers || []).filter((u) => u.role === 'Travel Partner' && u.status !== 'Inactive' && u.status !== 'Suspended');
    const supports = (allUsers || []).filter((u) => (u.role === 'Support Executive' || u.role === 'Support') && u.status !== 'Inactive' && u.status !== 'Suspended');
    const asgStore = readAssignments();
    const partnerCounts = {};
    partners.forEach((p) => { partnerCounts[p.id || lower(p.email)] = 0; });
    const supportCounts = {};
    supports.forEach((s) => { supportCounts[s.id || lower(s.email)] = 0; });
    Object.values(asgStore).forEach((asg) => {
        if (asg && asg.partnerId && partnerCounts[asg.partnerId] !== undefined) partnerCounts[asg.partnerId] += 1;
        if (asg && asg.supportId && supportCounts[asg.supportId] !== undefined) supportCounts[asg.supportId] += 1;
    });
    const pickMin = (list, counts) => (list.length ? list.reduce((min, item) => {
        const id = item.id || lower(item.email);
        const minId = min.id || lower(min.email);
        return counts[id] < counts[minId] ? item : min;
    }, list[0]) : null);
    const chosenPartner = pickMin(partners, partnerCounts);
    const chosenSupport = pickMin(supports, supportCounts);
    const assignment = {
        partnerId: chosenPartner ? (chosenPartner.id || chosenPartner.email) : null,
        partnerName: chosenPartner ? chosenPartner.name : 'Unassigned',
        supportId: chosenSupport ? (chosenSupport.id || chosenSupport.email) : null,
        supportName: chosenSupport ? chosenSupport.name : 'Unassigned',
        assignedAt: new Date().toISOString(),
    };
    if (travelerKey) {
        asgStore[travelerKey] = assignment;
        try { localStorage.setItem(TRAVELER_ASSIGNMENTS_KEY, JSON.stringify(asgStore)); } catch { /* ignore */ }
    }
    return assignment;
}

export function travelerAssignment(traveler, users) {
    const asgStore = readAssignments();
    const key = traveler.id || lower(traveler.email);
    return asgStore[key] || (traveler.email ? asgStore[lower(traveler.email)] : null) || null;
}

/** renderAssignedTravelersWidget() – travelers with their partner/support assignment. */
export function assignedTravelers(state) {
    const users = state.users || [];
    return users.filter((u) => u.role === 'Traveler').map((traveler) => {
        const key = traveler.id || lower(traveler.email);
        let assignment = travelerAssignment(traveler, users);
        if (!assignment) assignment = autoAssignTraveler(key, users);
        return { traveler, assignment };
    });
}

export function userInitials(name) {
    return initialsFor(name);
}
