import { useCallback, useState } from 'react';
import { useUI } from '../context/UIContext';
import { canOperateSession, reportIssue } from '../services/workflow';

/**
 * submitReportedIssue() from workflow.js: validates, creates the issue in the workflow
 * state (persisted through PUT /workflow/state) and shows the success dialog.
 */
export function useIssueReport() {
    const { toast, success } = useUI();
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
            const issue = reportIssue({ tripId, type, priority: priority || 'Medium', title: finalTitle, description: description.trim(), attachmentUrl });
            success('Issue Reported Successfully', `Issue ${issue.id} has been submitted with details${attachmentUrl ? ' and photo/screenshot attachment' : ''}. Support executive has been notified.`, onDone);
            return issue;
        } catch (error) {
            toast(error.message || 'Could not submit the issue report.', 'error');
            return null;
        } finally {
            setSubmitting(false);
        }
    }, [toast, success]);

    return { submit, submitting };
}
