import { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useOperation } from '../../hooks/usePortal';
import { allActiveTrips, relativeTime, reportIssue } from '../../services/workflow';
import Icon from '../../components/icons/Icon';
import { issuePhotoUrl } from './SupportReportedIssues';

const STAKEHOLDERS = ['Traveler', 'Travel Partner', 'Vendor', 'Tour Guide'];
const PRIORITIES = [['Low Priority', 'Low'], ['Medium Priority', 'Medium'], ['High Priority', 'High'], ['Emergency', 'Critical']];
const ASSIGNEES = ['Vendor Coordination Team', 'Travel Partner Contact', 'Guide Support Team'];
const EMPTY = { title: '', tripId: '', stakeholder: '', description: '', priority: '', assignTo: '' };

/** Trips the support executive coordinates (renderIssueForms on support pages). */
export function supportTrips(state) {
    return allActiveTrips(state).filter((trip) => (trip.scheduleStarted || trip.status !== 'requested') && trip.supportStatus === 'Accepted');
}

/**
 * support/issue_log.html. The original "Submit Issue" button only opened the success
 * dialog; here the issue is logged in the workflow state (same reportIssue() used by
 * every other portal) so it appears in "Recently Logged Issues".
 */
export default function SupportIssueLog() {
    const state = useWorkflowState();
    const { toast, success, viewAttachment } = useUI();
    const operate = useOperation();
    const [form, setForm] = useState(EMPTY);
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
    const trips = supportTrips(state);
    const issues = (state.issues || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

    const submit = (event) => {
        event.preventDefault();
        if (!form.title.trim() || !form.tripId || !form.stakeholder || !form.description.trim() || !form.priority || !form.assignTo) {
            toast('Please fill in all issue fields before submitting.', 'warning');
            return;
        }
        const priority = PRIORITIES.find(([label]) => label === form.priority)?.[1] || 'Medium';
        operate(() => {
            reportIssue({
                tripId: form.tripId,
                type: form.priority === 'Emergency' ? 'Emergency' : `${form.stakeholder} Issue`,
                title: form.title.trim(),
                description: `${form.description.trim()} (Stakeholder: ${form.stakeholder}; Assigned to: ${form.assignTo})`,
                priority,
            });
            setForm(EMPTY);
            success('Success', 'Your issue has been submitted successfully. The concerned team will review it shortly.');
        });
    };

    return (
        <DashboardLayout role="support" page="support__issue_log">
            <div className="page-content dashboard-container">
                <div>
                    <h1>Issue Logging</h1>
                    <p>Log new issues and assign to appropriate stakeholders</p>
                </div>
                <div>
                    <div>
                        <h2>Log New Issue</h2>
                        <form onSubmit={submit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="il-title">Issue Title</label>
                                <input id="il-title" type="text" className="form-input" placeholder="Enter a brief title for the issue" required value={form.title} onChange={set('title')} />
                            </div>
                            <div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="il-trip">Trip ID</label>
                                    <select id="il-trip" className="form-select" required value={form.tripId} onChange={set('tripId')}>
                                        <option value="" disabled>Select Trip ID</option>
                                        {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.id} - {trip.title}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="il-stakeholder">Stakeholder Involved</label>
                                    <select id="il-stakeholder" className="form-select" required value={form.stakeholder} onChange={set('stakeholder')}>
                                        <option value="" disabled>Select Stakeholder</option>
                                        {STAKEHOLDERS.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="il-desc">Issue Description</label>
                                <textarea id="il-desc" className="form-textarea" rows="4" placeholder="Describe the issue in detail..." required value={form.description} onChange={set('description')} />
                            </div>
                            <div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="il-priority">Priority Level</label>
                                    <select id="il-priority" className="form-select" required value={form.priority} onChange={set('priority')}>
                                        <option value="" disabled>Select Priority</option>
                                        {PRIORITIES.map(([label]) => <option key={label}>{label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="il-assign">Assign To</label>
                                    <select id="il-assign" className="form-select" required value={form.assignTo} onChange={set('assignTo')}>
                                        <option value="" disabled>Select Role to Assign</option>
                                        {ASSIGNEES.map((a) => <option key={a}>{a}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn-submit-cyan"><Icon name="send" /> Submit Issue</button>
                        </form>
                    </div>
                    <div>
                        <h2>Recently Logged Issues</h2>
                        {issues.length ? issues.map((issue) => {
                            const photo = issuePhotoUrl(issue);
                            return (
                                <div className="recent-issue" key={issue.id}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{issue.id}</div>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginTop: 2 }}>{issue.title}</div>
                                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Trip: {issue.tripId || '-'} - Reported by {issue.reporterRole || 'Member'} ({issue.reportedBy || ''})</div>
                                        {issue.description && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{issue.description}</div>}
                                        {photo && (
                                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, background: '#f0f9ff', padding: '8px 12px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                                                <img src={photo} alt="Uploaded" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #93c5fd', cursor: 'pointer', flexShrink: 0, background: '#fff' }} onClick={() => viewAttachment(photo)} />
                                                <button type="button" onClick={() => viewAttachment(photo)} style={{ fontSize: 12, color: '#0284c7', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0 }}>
                                                    📷 View Attached Photo ↗
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <StatusBadge label={issue.priority} />
                                        <div>{relativeTime(issue.createdAt)}</div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="recent-issue"><div><div>No issues logged yet.</div><div>Submitted report forms will appear here.</div></div></div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
