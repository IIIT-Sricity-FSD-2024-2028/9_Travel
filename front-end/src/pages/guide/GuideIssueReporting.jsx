import { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import UploadZone from '../../components/workflow/UploadZone';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useIssueReport } from '../../hooks/useIssueReport';
import { getGuideTrips } from '../../services/workflow';
import { TripOptions } from './GuideTourUpdates';

const ISSUE_TYPES = [
    ['medical', 'Medical Emergency'],
    ['transport', 'Transport Delay / Problem'],
    ['accommodation', 'Accommodation Issue'],
    ['traveler', 'Traveler Dispute'],
    ['other', 'Other'],
];
const URGENCY = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['critical', 'Critical']];
const EMPTY = { tripId: '', type: '', description: '', urgency: '', location: '', attachmentUrl: '' };
const labelOf = (list, value) => list.find(([v]) => v === value)?.[1] || '';

/** guide/issue_reporting.html (renderIssueForms + submitReportedIssue). */
export default function GuideIssueReporting() {
    const state = useWorkflowState();
    const { toast } = useUI();
    const { submit, submitting } = useIssueReport();
    const [form, setForm] = useState(EMPTY);
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

    // Only trips this guide works on can be selected.
    const trips = getGuideTrips(state).filter((trip) => trip.scheduleStarted || trip.status !== 'requested');

    const onSubmit = (event) => {
        event.preventDefault();
        const description = form.description.trim();
        submit({
            tripId: form.tripId,
            type: labelOf(ISSUE_TYPES, form.type),
            priority: labelOf(URGENCY, form.urgency) || 'Medium',
            title: '',
            description: description && form.location.trim() ? `${description}\nCurrent location: ${form.location.trim()}` : description,
            attachmentUrl: form.attachmentUrl,
        }, () => setForm(EMPTY));
    };

    return (
        <DashboardLayout role="guide" page="guide__issue_reporting">
            <div className="page-content">
                <div className="page-header">
                    <h1 className="text-2xl font-bold text-gray-900">Issue Reporting</h1>
                    <p className="text-sm text-gray-500 mt-1">Report issues during the trip to support team</p>
                </div>
                <div className="update-form-card">
                    <form onSubmit={onSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="gi-trip">Tour ID</label>
                            <select id="gi-trip" className="form-select" value={form.tripId} onChange={set('tripId')}>
                                <TripOptions trips={trips} />
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="gi-type">Issue Type</label>
                            <select id="gi-type" className="form-select" value={form.type} onChange={set('type')}>
                                <option value="">Select Issue Type</option>
                                {ISSUE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="gi-desc">Issue Description</label>
                            <textarea id="gi-desc" className="form-textarea" placeholder="Describe the issue in detail..." value={form.description} onChange={set('description')} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="gi-urgency">Urgency Level</label>
                            <select id="gi-urgency" className="form-select" value={form.urgency} onChange={set('urgency')}>
                                <option value="">Select Urgency Level</option>
                                {URGENCY.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="gi-location">Current Location</label>
                            <input id="gi-location" type="text" className="form-input" placeholder="Enter your current location" value={form.location} onChange={set('location')} />
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
                        <button type="submit" className="btn btn-danger red" id="report-issue-btn" disabled={submitting}>
                            <Icon name="alert" /> {submitting ? 'Reporting...' : 'Report Issue'}
                        </button>
                    </form>
                </div>
                <div className="banner-alert relative">
                    <Icon name="alert" />
                    <div>
                        <strong>Important Notice</strong>
                        <span>All reported issues are immediately notified to the support executive. For critical emergencies, please also contact the emergency hotline: <strong>1-800-TRAVEL</strong>.</span>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
