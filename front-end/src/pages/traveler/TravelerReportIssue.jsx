import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import UploadZone from '../../components/workflow/UploadZone';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useIssueReport } from '../../hooks/useIssueReport';
import { PATHS } from '../../routes/paths';
import { allActiveTrips, tripsForCurrentUser } from '../../services/workflow';

const EMPTY = { type: '', priority: '', tripId: '', title: '', description: '', attachmentUrl: '' };

/** traveler_report_issue.html (renderIssueForms + submitReportedIssue). */
export default function TravelerReportIssue() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const { toast } = useUI();
    const { submit, submitting } = useIssueReport();
    const [form, setForm] = useState(EMPTY);
    const [sendUpdates, setSendUpdates] = useState(true);
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

    const trips = tripsForCurrentUser(allActiveTrips(state).filter((trip) => trip.scheduleStarted || trip.status !== 'requested'));

    const onSubmit = () => {
        submit({ ...form, priority: form.priority || 'Medium' }, () => setForm(EMPTY));
    };

    return (
        <DashboardLayout role="traveler" page="traveler__traveler_report_issue">
            <div className="page-content">
                <div>
                    <div role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => navigate(PATHS.traveler.tripDetails)}>
                        <Icon name="arrowleft" /> Back to Trip Details
                    </div>
                    <h1>Report an Issue</h1>
                    <p>Tell us more if you&apos;re facing any problems.</p>
                </div>
                <div className="issue-layout">
                    <div className="form-panel">
                        <div className="form-alert">
                            <Icon name="info" />
                            Your local guide will be notified immediately to assist you.
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="issueType">Issue Type <span>*</span></label>
                                <select id="issueType" className="form-control" value={form.type} onChange={set('type')}>
                                    <option value="">Select issue type</option>
                                    <option>Transportation</option>
                                    <option>Accommodation</option>
                                    <option>Health/Safety</option>
                                    <option>Itinerary/Schedule</option>
                                </select>
                            </div>
                            <div className="form-row-2">
                                <div className="form-group">
                                    <label htmlFor="issueSeverity">Severity/Urgency Level</label>
                                    <select id="issueSeverity" className="form-control" value={form.priority} onChange={set('priority')}>
                                        <option value="">Select severity</option>
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                        <option>Critical</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="issueTrip">Related Trip <span>*</span></label>
                                    <select id="issueTrip" className="form-control" value={form.tripId} onChange={set('tripId')}>
                                        <option value="">Select Trip ID</option>
                                        {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.id} - {trip.title}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="issueTitle">Issue Title <span>*</span></label>
                                <input id="issueTitle" type="text" className="form-control" placeholder="Brief statement of the issue" value={form.title} onChange={set('title')} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="issueDesc">Detailed Description <span>*</span></label>
                                <textarea id="issueDesc" className="form-control" rows="5" placeholder="Please describe the issue in detail. What happened? Who is involved? How has this impacted your stay?" value={form.description} onChange={set('description')} />
                            </div>
                            <div className="form-group">
                                <label>Include relevant details like times, locations, names, and any steps you&apos;ve already taken.</label>
                                <div>
                                    <label>Upload Photos/Screenshots (Optional)</label>
                                    <UploadZone value={form.attachmentUrl} onChange={(url) => setForm((f) => ({ ...f, attachmentUrl: url }))} toast={toast} />
                                </div>
                            </div>
                            <div className="checkbox-wrap">
                                <input type="checkbox" id="sendupdates" checked={sendUpdates} onChange={(e) => setSendUpdates(e.target.checked)} />
                                <label htmlFor="sendupdates">Send me updates about this issue via email and SMS</label>
                            </div>
                            <div>
                                <button type="button" className="btn-submit" disabled={submitting} onClick={onSubmit}>{submitting ? 'Submitting...' : 'Submit Issue Report'}</button>
                                <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                    <div className="right-panels">
                        <div className="panel-card panel-emergency">
                            <div className="em-title"><Icon name="alerttriangle" /> Emergency?</div>
                            <div className="em-desc">For critical or safety-related issues, contact our emergency support immediately.</div>
                            <button type="button" className="btn-em" onClick={() => navigate(PATHS.traveler.messages)}><Icon name="phone" /> Emergency Support</button>
                        </div>
                        <div className="panel-card">
                            <div className="pt-title">Reporting Tips</div>
                            <ul className="tips-list">
                                <li><Icon name="info" /> Be as specific as possible about the issue</li>
                                <li><Icon name="info" /> Include relevant times and locations</li>
                                <li><Icon name="info" /> Attach photos or screenshots if available</li>
                                <li><Icon name="info" /> Mention any immediate actions you&apos;ve taken</li>
                            </ul>
                        </div>
                        <div className="panel-card">
                            <div className="pt-title">Response Times</div>
                            <div className="rt-row"><span className="rt-label">Critical</span><span className="rt-time rt-critical">15 Min</span></div>
                            <div className="rt-row"><span className="rt-label">High</span><span className="rt-time rt-high">1 Hour</span></div>
                            <div className="rt-row"><span className="rt-label">Medium</span><span className="rt-time rt-medium">4 Hours</span></div>
                            <div className="rt-row"><span className="rt-label">Low</span><span className="rt-time rt-low">24 Hours</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
