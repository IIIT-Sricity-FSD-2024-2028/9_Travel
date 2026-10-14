import { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import UploadZone from '../../components/workflow/UploadZone';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useIssueReport } from '../../hooks/useIssueReport';
import { useOperation } from '../../hooks/usePortal';
import { fileUrl } from '../../services/api';
import { getVendorTrips, relativeTime, resolveIssue } from '../../services/workflow';

const SERVICE_TYPES = [['transport', 'Transport'], ['hotel', 'Hotel Stay'], ['activity', 'Activity']];
const PRIORITIES = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['critical', 'Critical']];
const EMPTY = { tripId: '', type: '', description: '', priority: '', attachmentUrl: '' };
const labelOf = (list, value) => list.find(([v]) => v === value)?.[1] || '';
const isHigh = (issue) => ['High', 'Critical'].includes(issue.priority);

/** Issues related to this vendor (renderVendorReportedIssues). */
function vendorIssues(state, session, vendorTripIds) {
    const email = String(session.email || '').toLowerCase();
    const name = String(session.name || '').toLowerCase();
    return (state.issues || []).filter((issue) => vendorTripIds.has(issue.tripId)
        || (issue.vendorEmail && email && issue.vendorEmail.toLowerCase() === email)
        || (issue.reporterRole && String(issue.reporterRole).toLowerCase().includes('vendor'))
        || (issue.reportedBy && name && String(issue.reportedBy).toLowerCase() === name))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** vendor_report_issue.html */
export default function VendorReportIssue() {
    const state = useWorkflowState();
    const { session } = useAuth();
    const { toast } = useUI();
    const operate = useOperation();
    const { submit, submitting } = useIssueReport();
    const [form, setForm] = useState(EMPTY);
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

    const vendorTrips = getVendorTrips(state);
    const issues = vendorIssues(state, session, new Set(vendorTrips.map((t) => t.id)));

    const onSubmit = () => {
        submit({
            tripId: form.tripId,
            type: labelOf(SERVICE_TYPES, form.type),
            priority: labelOf(PRIORITIES, form.priority) || 'Medium',
            title: '',
            description: form.description,
            attachmentUrl: form.attachmentUrl,
        }, () => setForm(EMPTY));
    };

    const resolve = (issueId) => {
        const resolution = window.prompt(`Enter resolution notes for issue ${issueId} to notify Support Executive:`);
        if (resolution === null || !resolution.trim()) return;
        operate(() => {
            resolveIssue(issueId, resolution.trim());
            toast(`Resolution sent to Support for issue ${issueId}!`, 'success');
        });
    };

    return (
        <DashboardLayout role="vendor" page="vendor__vendor_report_issue">
            <div className="page-scroll">
                <div className="page-title">
                    <h1>Report Issue</h1>
                    <p>Report service problems to the travel partner &amp; support team</p>
                </div>
                <div className="form-card">
                    <div className="form-group">
                        <label className="form-label" htmlFor="vr-trip">Trip ID</label>
                        <select id="vr-trip" className="form-input" value={form.tripId} onChange={set('tripId')}>
                            <option value="">Select Trip ID</option>
                            {vendorTrips.map((t) => <option key={t.id} value={t.id}>{t.id} - {t.title || t.destination || 'Trip'}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="vr-type">Service Type</label>
                        <select id="vr-type" className="form-input" value={form.type} onChange={set('type')}>
                            <option value="">Select Service Type</option>
                            {SERVICE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="vr-desc">Issue Description</label>
                        <textarea id="vr-desc" className="form-input" placeholder="Describe the issue in detail..." value={form.description} onChange={set('description')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="vr-priority">Priority Level</label>
                        <select id="vr-priority" className="form-input" value={form.priority} onChange={set('priority')}>
                            <option value="">Select Priority</option>
                            {PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Upload Photos/Screenshots (Optional)</label>
                        <UploadZone
                            value={form.attachmentUrl}
                            onChange={(url) => setForm((f) => ({ ...f, attachmentUrl: url }))}
                            toast={toast}
                            style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 20, textAlign: 'center', background: '#f8fafc' }}
                        />
                    </div>
                    <button type="button" className="btn-submit" disabled={submitting} onClick={onSubmit}>
                        <Icon name="alert" /> {submitting ? 'Submitting...' : 'Submit Issue'}
                    </button>
                </div>

                <div className="reported-issues-title" style={{ marginTop: 32, fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: 16 }}>
                    Reported Issues Log
                </div>
                <div className="reported-issues-container">
                    {issues.length ? issues.map((issue) => {
                        const photo = issue.attachmentUrl || issue.photoUrl;
                        return (
                            <div className="issue-card" key={issue.id} style={{ marginBottom: 12, background: 'var(--bg-surface, #fff)', padding: 16, borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)' }}>
                                <div className="issue-info" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <Icon name="alerttriangle" className="issue-icon" style={{ color: isHigh(issue) ? '#ef4444' : '#f59e0b', width: 24, height: 24, flexShrink: 0 }} />
                                    <div className="issue-details" style={{ flex: 1 }}>
                                        <div className="issue-desc" style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)', fontSize: 15 }}>{issue.title || issue.type}</div>
                                        <div className="issue-sub" style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', marginTop: 2 }}>{issue.description}</div>
                                        <div className="issue-trip" style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, marginTop: 4 }}>
                                            {issue.tripId ? `Trip: ${issue.tripId} (${issue.tripTitle || ''}) • ` : ''}Reported by {issue.reportedBy} ({issue.reporterRole})
                                        </div>
                                        {photo && (
                                            <div style={{ marginTop: 8 }}>
                                                <a href={fileUrl(photo)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0ea5e9', fontWeight: 600, textDecoration: 'none', background: 'rgba(14,165,233,0.1)', padding: '4px 10px', borderRadius: 6 }}>
                                                    <Icon name="image" style={{ width: 14, height: 14 }} /> View Attachment Image
                                                </a>
                                            </div>
                                        )}
                                        <div className="issue-time" style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{relativeTime(issue.createdAt)}</div>
                                    </div>
                                </div>
                                <div className="issue-status" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <span className={`status-pill ${isHigh(issue) ? 'pill-high' : 'pill-review'}`} style={{ fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{issue.priority} Priority</span>
                                        <span className="status-pill pill-review" style={{ background: issue.status === 'Resolved' ? '#ecfdf5' : '#f0fdf4', color: issue.status === 'Resolved' ? '#047857' : '#166534', fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{issue.status || 'Open'}</span>
                                    </div>
                                    {issue.status !== 'Resolved' && (
                                        <button type="button" className="btn-resolve-vendor-issue" onClick={() => resolve(issue.id)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Icon name="checkcircle" style={{ width: 14, height: 14 }} /> Resolve &amp; Update Support
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    }) : <div className="issue-card" style={{ color: '#64748b', padding: 16, textAlign: 'center' }}>No issues reported yet.</div>}
                </div>
            </div>
        </DashboardLayout>
    );
}
