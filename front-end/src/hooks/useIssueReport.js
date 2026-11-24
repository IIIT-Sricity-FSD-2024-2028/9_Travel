import { useCallback, useState } from 'react';
import { useUI } from '../context/UIContext';
import { useAppDispatch } from '../store/hooks';
import { createIssue } from '../store/slices/issuesSlice';
import {
    ROLE_LABELS, canOperateSession, currentRole, currentSession, getSnapshot, hydrateStateFromBackend, latestTravelerTrip, reportIssue,
} from '../services/workflow';

/**
 * submitReportedIssue() from workflow.js: validates, creates the issue and shows the success dialog.
 *
 * Redux: the issue is created by dispatching the `createIssue` thunk (POST /issues), which adds
 * it to the `issues` slice. The backend also writes the trip update and notifies Support, so the
 * workflow copy is refreshed afterwards. If the trip is not known to the backend yet (404), it
 * falls back to the local workflow store (PUT /workflow/state) like before.
 */
export function useIssueReport() {
    const { toast, success } = useUI();
    const dispatch = useAppDispatch();
    const [submitting, setSubmitting] = useState(false);

    const submit = useCallback(async ({ tripId, type, priority, title, description, attachmentUrl }, onDone) => {
        if (!canOperateSession()) return null;
        let finalTitle = title;
        if (!finalTitle && type) finalTitle = `${type} Issue`;
        if (!finalTitle) finalTitle = 'Reported Issue';
        if (!description || !description.trim()) {
            toast('Please describe the issue in detail.', 'warning');
            return null;
        }
        setSubmitting(true);
        try {
            const state = getSnapshot();
            const trip = state.trips.find((item) => item.id === tripId) || latestTravelerTrip(state) || state.trips[0];
            const payload = {
                type,
                priority: priority || 'Medium',
                title: finalTitle,
                description: description.trim(),
                attachmentUrl: attachmentUrl || '',
                reportedBy: currentSession().name || 'User',
                reporterRole: ROLE_LABELS[currentRole()] || 'Traveler',
            };
            let issue = null;
            if (trip && trip.id) {
                try {
                    issue = await dispatch(createIssue({ ...payload, tripId: trip.id })).unwrap();
                    hydrateStateFromBackend({ force: true, ignoreRecentWrites: true });
                } catch (error) {
                    if (error.status !== 404) throw error;
                }
            }
            if (!issue) issue = reportIssue({ ...payload, tripId });
            success('Issue Reported Successfully', `Issue ${issue.id} has been submitted with details${attachmentUrl ? ' and photo/screenshot attachment' : ''}. Support executive has been notified.`, onDone);
            return issue;
        } catch (error) {
            toast(error.message || 'Could not submit the issue report.', 'error');
            return null;
        } finally {
            setSubmitting(false);
        }
    }, [dispatch, toast, success]);

    return { submit, submitting };
}
