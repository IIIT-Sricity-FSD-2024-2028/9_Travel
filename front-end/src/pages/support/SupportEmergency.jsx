import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { relativeTime } from '../../services/workflow';
import { issuePhotoUrl } from './SupportReportedIssues';

/** support/emergency_support.html (renderSupportEmergencySupport). */
export default function SupportEmergency() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const { viewAttachment } = useUI();
    const emergencies = (state.issues || []).filter((issue) => issue.status !== 'Resolved' && /high|critical|emergency/i.test(`${issue.priority} ${issue.type}`));

    return (
        <DashboardLayout role="support" page="support__emergency_support">
            <div className="dashboard-container">
                <div><h1>Emergency Support</h1><p>Handle high-priority traveler support issues</p></div>
                <div className="emergency-banner">
                    <div><div>Emergency Hotline</div><div>Direct line for critical situations</div><div className="emergency-number">1-800-TRAVEL</div></div>
                    <div><Icon name="phone" /></div>
                </div>
                <h2>Active Emergency Cases</h2>
                {emergencies.length ? emergencies.map((issue) => {
                    const photo = issuePhotoUrl(issue);
                    return (
                        <div className="emergency-card" key={issue.id}>
                            <div className="e-card-header">
                                <div className="e-icon"><Icon name="phone" /></div>
                                <div>
                                    <div><h3>{issue.title} <span className="active-badge">Active</span></h3><span>{relativeTime(issue.createdAt)}</span></div>
                                    <div>{issue.id} - Trip: {issue.tripId || '-'}</div>
                                </div>
                            </div>
                            <div className="e-info-grid">
                                <div><div className="e-label">Reporter</div><div className="e-value"><Icon name="user" /> {issue.reportedBy}</div></div>
                                <div><div className="e-label">Priority</div><div className="e-value"><Icon name="alert" /> {issue.priority}</div></div>
                            </div>
                            {photo && (
                                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239, 68, 68, 0.08)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <img src={photo} alt="Emergency" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #fca5a5', cursor: 'pointer', flexShrink: 0, background: '#fff' }} onClick={() => viewAttachment(photo)} />
                                    <button type="button" onClick={() => viewAttachment(photo)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <Icon name="image" /> View Emergency Photo
                                    </button>
                                </div>
                            )}
                            <div className="e-actions">
                                <button type="button" className="btn-red-solid" onClick={() => navigate(PATHS.support.messages)}><Icon name="phone" /> Contact Members</button>
                                <button type="button" className="btn-red-outline" onClick={() => navigate(PATHS.support.reportedIssues)}><Icon name="alert" /> View Issue</button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="emergency-card">
                        <div className="e-card-header">
                            <div className="e-icon"><Icon name="checkcircle" /></div>
                            <div><div><h3>No active emergency cases</h3></div><div>High-priority issue reports will appear here.</div></div>
                        </div>
                    </div>
                )}
                <h2>Emergency Response Guidelines</h2>
                <div>
                    <div className="guideline-card">
                        <div className="g-title">Medical Emergencies</div>
                        <ul className="g-list"><li>Contact traveler immediately</li><li>Coordinate with local services</li><li>Notify travel partner</li></ul>
                    </div>
                    <div className="guideline-card">
                        <div className="g-title">Safety Concerns</div>
                        <ul className="g-list"><li>Assess the situation</li><li>Contact authorities if needed</li><li>Coordinate guide and vendor support</li></ul>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
