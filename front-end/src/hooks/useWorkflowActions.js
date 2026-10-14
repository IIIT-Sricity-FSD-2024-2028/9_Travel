import { useMemo } from 'react';
import { useUI } from '../context/UIContext';
import { usePortal } from './usePortal';
import {
    acceptGuide, acceptTrip, acceptTripCancellation, acceptTripSupport, acceptVendor, approveItinerary, assignGuide, assignVendor,
    assignableGuides, assignableVendors, canOperateSession, cancelTrip, completeTrip, currentSession, deleteAllNotifs, deleteNotification,
    getSnapshot, markAllNotifsAsRead, markNotificationRead, rejectGuide, rejectTrip, rejectTripCancellation, rejectVendor, requestTripCancellation,
    resolveIssue, sendTripToSupport, startTrip, vendorUpdate,
} from '../services/workflow';

/**
 * React version of the delegated click handlers in workflow.js attachHandlers():
 * every `data-dd-action` becomes a function with the same confirmation dialogs,
 * toasts and inactive-account guard.
 */
export function useWorkflowActions() {
    const { confirm, toast, success } = useUI();
    const { role } = usePortal();

    return useMemo(() => {
        const guarded = (fn) => (...args) => {
            if (!canOperateSession()) return undefined;
            return fn(...args);
        };
        const ask = (title, message, confirmText, tone) => confirm({ title, message, confirmText, tone });

        return {
            // Notifications (not blocked for inactive accounts, like the original)
            markRead: (notifId) => markNotificationRead(notifId, role),
            deleteNotif: (notifId) => {
                if (deleteNotification(notifId)) toast('Notification deleted', 'info');
            },
            markAllRead: () => markAllNotifsAsRead(role),
            deleteAll: async () => {
                if (await ask('Delete All Notifications', 'Are you sure you want to delete all notifications for this portal?', 'Delete All', 'red')) deleteAllNotifs(role);
            },

            cancelTrip: guarded(async (tripId) => {
                const roleLower = String(currentSession().role || '').toLowerCase();
                const isTraveler = roleLower.includes('traveler') || roleLower.includes('customer') || roleLower === 'user' || !roleLower;
                const ok = await ask(
                    isTraveler ? 'Request Cancellation' : 'Cancel Trip',
                    isTraveler ? 'Submit a cancellation request for this trip? Your Travel Partner will review and approve the cancellation.' : 'Cancel this trip?',
                    isTraveler ? 'Send Request' : 'Cancel Trip',
                    'red',
                );
                if (!ok) return;
                if (isTraveler) {
                    if (requestTripCancellation(tripId)) toast('Cancellation request sent to Travel Partner.', 'warning');
                } else if (cancelTrip(tripId)) {
                    toast('Trip cancelled.', 'warning');
                }
            }),
            acceptCancellation: guarded(async (tripId) => {
                if (!(await ask('Accept Cancellation', "Accept the traveler's cancellation request and officially cancel this trip?", 'Accept & Cancel', 'red'))) return;
                acceptTripCancellation(tripId);
                toast('Trip cancellation accepted. Super Admin has been notified to process the refund.', 'success');
            }),
            declineCancellation: guarded(async (tripId) => {
                if (!(await ask('Decline Cancellation', 'Decline the cancellation request and keep this trip active?', 'Decline', 'gray'))) return;
                rejectTripCancellation(tripId);
                toast('Cancellation request declined. Trip remains active.', 'info');
            }),
            acceptTrip: guarded(async (tripId) => {
                if (!(await ask('Accept Request', 'Accept this traveler request and start planning?', 'Accept', 'green'))) return;
                acceptTrip(tripId);
                toast('Trip request accepted. Assign guide and vendor next.', 'success');
            }),
            rejectTrip: guarded(async (tripId) => {
                if (!(await ask('Reject Request', 'Reject this traveler trip request?', 'Reject', 'red'))) return;
                rejectTrip(tripId);
                toast('Trip request rejected.', 'warning');
            }),
            approveItinerary: guarded(async (tripId) => {
                if (!(await ask('Approve Modifications', 'Approve the updated itinerary preferences for this trip?', 'Approve', 'green'))) return;
                approveItinerary(tripId);
                toast('Itinerary modifications approved! Stakeholders have been notified.', 'success');
            }),
            ackUpdate: guarded(() => toast('Update acknowledged.', 'success')),
            sendToSupport: guarded(async (tripId) => {
                if (!tripId) { toast('This issue is not linked to a trip.', 'warning'); return; }
                if (!(await ask('Send to Support', 'Send this trip to support executive for coordination?', 'Send', 'orange'))) return;
                sendTripToSupport(tripId);
                toast('Trip sent to support executive.', 'success');
            }),
            acceptSupport: guarded(async (tripId) => {
                if (!(await ask('Accept Support Request', 'Accept coordination for this trip?', 'Accept', 'green'))) return;
                acceptTripSupport(tripId);
                toast('Trip support coordination accepted.', 'success');
            }),
            startTrip: guarded((tripId) => {
                const trip = startTrip(tripId);
                if (trip?.scheduleStarted) toast('Trip started by Travel Partner. Package schedule is now active for all members.', 'success');
                else toast('Trip cannot be started yet. Ensure guide/vendor accepted or traveler completed payment.', 'warning');
            }),
            completeTrip: guarded(async (tripId) => {
                if (!(await ask('Complete Trip', `Mark trip ${tripId} as completed?`, 'Complete', 'green'))) return;
                completeTrip(tripId);
                toast('Trip marked as completed successfully!', 'success');
            }),
            assignGuide: guarded(async (tripId, name) => {
                const state = getSnapshot();
                const trip = state.trips.find((t) => t.id === tripId || t.requestId === tripId);
                const target = assignableGuides(state).find((g) => g.name === name);
                const status = target ? String(target.status || 'Available') : 'Available';
                const lower = status.toLowerCase();
                if (!(lower === 'available' || lower.includes('on duty') || lower.includes('active'))) {
                    toast(`${name} is currently ${status} and cannot be assigned.`, 'error');
                    return;
                }
                if (trip && trip.guide && trip.guide.name !== name
                    && !(await ask('Reassign Guide', `Reassign trip ${trip.id} from ${trip.guide.name} to ${name}?`, 'Reassign', 'orange'))) return;
                assignGuide(tripId, name);
                toast(`Assignment request sent to ${name}. Status: Pending Guide Acceptance.`, 'info');
            }),
            assignVendor: guarded(async (tripId, name, service) => {
                const state = getSnapshot();
                const trip = state.trips.find((t) => t.id === tripId || t.requestId === tripId);
                const target = assignableVendors(state).find((v) => v.name === name);
                const status = target ? String(target.status || 'Available') : 'Available';
                const lower = status.toLowerCase();
                if (!(lower === 'available' || lower.includes('active'))) {
                    toast(`${name} is currently ${status} and cannot be assigned.`, 'error');
                    return;
                }
                if (trip && trip.vendor && trip.vendor.name !== name
                    && !(await ask('Reassign Vendor', `Reassign trip ${trip.id} from ${trip.vendor.name} to ${name}?`, 'Reassign', 'orange'))) return;
                assignVendor(tripId, name, service);
                toast(`Assignment request sent to ${name}. Status: Pending Vendor Acceptance.`, 'info');
            }),
            acceptGuide: guarded((tripId) => { acceptGuide(tripId); toast('Guide assignment accepted.', 'success'); }),
            rejectGuide: guarded((tripId) => { rejectGuide(tripId); toast('Guide assignment rejected and returned to partner.', 'warning'); }),
            acceptVendor: guarded((tripId) => { acceptVendor(tripId); toast('Vendor service accepted.', 'success'); }),
            rejectVendor: guarded((tripId) => { rejectVendor(tripId); toast('Vendor request rejected and returned to partner.', 'warning'); }),
            completeService: guarded((tripId) => {
                vendorUpdate(tripId, { status: 'completed', statusText: 'Completed', message: 'Service marked completed by vendor.' });
                toast('Service marked completed.', 'success');
            }),
            /** "resolve-issue" buttons: confirm, resolve and notify every stakeholder. */
            resolveIssue: guarded(async (issueId, resolution) => {
                if (!issueId) { toast('Choose an issue to resolve first.', 'error'); return false; }
                if (!(await ask('Resolve Issue', 'Mark this issue as resolved and notify all stakeholders?', 'Resolve', 'green'))) return false;
                const issue = resolveIssue(issueId, resolution || 'Resolved by support executive.');
                if (!issue) { toast(`Issue ${issueId} not found or already resolved.`, 'warning'); return false; }
                success('Issue Resolved', `${issueId} resolved and stakeholders notified.`);
                return true;
            }),
        };
    }, [confirm, toast, success, role]);
}
