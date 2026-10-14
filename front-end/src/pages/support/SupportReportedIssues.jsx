import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import StatusBadge from '../../components/StatusBadge';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { fileUrl } from '../../services/api';

/** getIssuePhotoUrl() from workflow.js. */
export function issuePhotoUrl(issue) {
    if (!issue) return '';
    return fileUrl(issue.attachmentUrl || issue.photoUrl || issue.screenshotUrl || issue.attachment || issue.photo || '');
}

/** support/reported_issues.html (renderSupportIssues). */
export default function SupportReportedIssues() {
    const state = useWorkflowState();
    const { viewAttachment } = useUI();
    const actions = useWorkflowActions();
    const issues = (state.issues || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const cards = [
        ['Total Issues', issues.length],
        ['Unassigned', issues.filter((issue) => issue.status === 'Open').length],
        ['Assigned', issues.filter((issue) => issue.status === 'In Progress').length],
        ['High Priority', issues.filter((issue) => ['High', 'Critical', 'high', 'critical'].includes(issue.priority)).length],
    ];

    return (
        <DashboardLayout role="support" page="support__reported_issues">
            <div className="dashboard-container">
                <div>
                    <h1>Reported Issues</h1>
                    <p>View and manage all reported issues from stakeholders</p>
                </div>
                <div>
                    <Icon name="alertcircle" /> Issues received from Traveler, Vendor, or Guide
                </div>
                <div>
                    {cards.map(([label, value]) => (
                        <div className="info-card" key={label}>
                            <div>{label}</div>
                            <div>{value}</div>
                        </div>
                    ))}
                </div>
                <div>
                    <div>
                        <h2>All Reported Issues</h2>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Issue ID</th>
                                <th>Reported By</th>
                                <th>Issue Type</th>
                                <th>Trip ID</th>
                                <th>Priority Level</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {issues.length ? issues.map((issue) => {
                                const photo = issuePhotoUrl(issue);
                                return (
                                    <tr key={issue.id}>
                                        <td>{issue.id}</td>
                                        <td><div>{issue.reportedBy}</div><div>{issue.reporterRole}</div></td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}><Icon name="alert" /> {issue.title}</div>
                                            {issue.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{issue.description}</div>}
                                            {photo && (
                                                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(14,165,233,0.06)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(14,165,233,0.2)' }}>
                                                    <img src={photo} alt="Uploaded" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1', cursor: 'pointer', flexShrink: 0, background: '#fff' }} onClick={() => viewAttachment(photo)} />
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>📷 Attached Photo / Screenshot</span>
                                                        <button type="button" style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }} onClick={() => viewAttachment(photo)}>
                                                            <Icon name="eye" style={{ width: 12, height: 12 }} /> View Full Photo
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td>{issue.tripId || '-'}</td>
                                        <td><StatusBadge label={issue.priority} /></td>
                                        <td><StatusBadge label={issue.status} /></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                {photo && <button type="button" className="action-btn" style={{ background: '#0284c7', color: '#fff', border: 'none' }} onClick={() => viewAttachment(photo)}><Icon name="image" /> Photo</button>}
                                                <button type="button" className="action-btn btn-view" disabled={issue.status === 'Resolved'} title={issue.status === 'Resolved' ? 'Already resolved' : undefined} onClick={() => actions.resolveIssue(issue.id, 'Resolved by support executive.')}><Icon name="checkcircle" /> Resolve</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center' }}>No reported issues yet.</td></tr>}
                        </tbody>
                    </table>
                    <div>
                        <div>Showing {issues.length ? `1-${issues.length}` : 0} of {issues.length} issues</div>
                        <div>
                            <button type="button" disabled>Previous</button>
                            <button type="button">1</button>
                            <button type="button" disabled>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
