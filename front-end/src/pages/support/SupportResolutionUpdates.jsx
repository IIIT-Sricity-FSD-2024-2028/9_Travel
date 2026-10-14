import { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useOperation } from '../../hooks/usePortal';
import { resolveIssue } from '../../services/workflow';
import { issuePhotoUrl } from './SupportReportedIssues';

/** support/resolution_updates.html (renderResolutionUpdates + confirm / success dialogs + submitResolution). */
export default function SupportResolutionUpdates() {
    const state = useWorkflowState();
    const { toast, confirm, success, viewAttachment } = useUI();
    const operate = useOperation();
    const [issueId, setIssueId] = useState('');
    const [details, setDetails] = useState('');
    const [notify, setNotify] = useState(true);
    const pending = (state.issues || []).filter((issue) => issue.status !== 'Resolved');

    const confirmResolution = async (id, resolution) => {
        if (!id) { toast('Choose an issue to resolve first.', 'error'); return; }
        const ok = await confirm({ title: 'Confirm Resolution', message: "Are you sure you want to confirm this issue's resolution?", confirmText: 'Confirm', tone: 'green' });
        if (!ok) return;
        operate(() => {
            if (!resolveIssue(id, resolution || 'Resolved by support executive.')) {
                toast(`Issue ${id} was not found.`, 'error');
                return;
            }
            setIssueId('');
            setDetails('');
            success('Success', 'The issue resolution has been confirmed successfully. Handlers and travelers have been notified.');
        });
    };

    const onSubmit = (event) => {
        event.preventDefault();
        confirmResolution(issueId, details.trim());
    };

    return (
        <DashboardLayout role="support" page="support__resolution_updates">
            <div className="dashboard-container">
                <div>
                    <h1>Resolution Updates</h1>
                    <p>Confirm issue resolutions and notify stakeholders</p>
                </div>
                <div className="success-banner">
                    <Icon name="check" /> Resolved issues notify all stakeholders automatically
                </div>
                <div>
                    <div>
                        <h2>Confirm Issue Resolution</h2>
                        <form onSubmit={onSubmit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ru-issue">Select Issue</label>
                                <select id="ru-issue" className="form-select" required value={issueId} onChange={(e) => setIssueId(e.target.value)}>
                                    <option value="" disabled>Choose an issue to confirm resolution</option>
                                    {pending.map((issue) => <option key={issue.id} value={issue.id}>{issue.id} - {issue.title} ({issue.tripId})</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ru-details">Resolution Details</label>
                                <textarea id="ru-details" className="form-textarea" rows="4" placeholder="Describe how the issue was resolved..." required value={details} onChange={(e) => setDetails(e.target.value)} />
                            </div>
                            <label className="checkbox-box">
                                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                                <span>Notify traveler, vendor, guide, and travel partner of resolution</span>
                            </label>
                            <button type="submit"><Icon name="check" /> Confirm Resolution</button>
                        </form>
                    </div>
                    <div>
                        <div><h2>Pending Resolution Confirmations</h2></div>
                        {pending.length ? pending.map((issue) => {
                            const photo = issuePhotoUrl(issue);
                            return (
                                <div className="pending-item" key={issue.id}>
                                    <div>
                                        <div>
                                            <div>{issue.id} <span className="badge-yellow">Pending Confirmation</span></div>
                                            <div>Trip: <span>{issue.tripId || '-'}</span></div>
                                        </div>
                                    </div>
                                    <div className="res-notes">
                                        <div className="res-notes-label">{issue.title}</div>
                                        <div>{issue.description}</div>
                                        {photo && (
                                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                                <img src={photo} alt="Uploaded" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1', cursor: 'pointer', flexShrink: 0, background: '#fff' }} onClick={() => viewAttachment(photo)} />
                                                <button type="button" onClick={() => viewAttachment(photo)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <Icon name="image" /> View Attached Photo
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" className="btn-teal-full" onClick={() => confirmResolution(issue.id)}><Icon name="checkcircle" /> Confirm Resolution</button>
                                </div>
                            );
                        }) : <div className="pending-item">No pending issues to resolve.</div>}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
