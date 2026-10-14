import { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import StatusBadge from '../../components/StatusBadge';
import MemberMessagesPanel from '../../components/workflow/MemberMessages';
import ScheduleItemSelect, { defaultScheduleItemId } from '../../components/workflow/ScheduleItemSelect';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useOperation } from '../../hooks/usePortal';
import { getGuideTrips, guideMessage, guideUpdate, relativeTime } from '../../services/workflow';

const STATUS_OPTIONS = [
    ['location', 'Location Reached'],
    ['started', 'Tour Started'],
    ['delay', 'Slight Delay'],
    ['completed', 'Tour Completed'],
];
const GUIDANCE_OPTIONS = [
    ['meeting', 'Meeting Point Info'],
    ['safety', 'Safety Tip'],
    ['reminder', 'General Reminder'],
    ['weather', 'Weather Alert'],
];
const EMPTY_STATUS = { tripId: '', scheduleItemId: null, status: '', location: '', notes: '' };
const EMPTY_GUIDANCE = { tripId: '', type: '', message: '' };

export function TripOptions({ trips, placeholder = 'Select Trip ID' }) {
    return (
        <>
            <option value="">{placeholder}</option>
            {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.id} - {trip.title}</option>)}
        </>
    );
}

/** guide/tour_updates.html (renderGuideTourUpdates + submitGuideStatus / submitGuideMessage). */
export default function GuideTourUpdates() {
    const state = useWorkflowState();
    const { toast, success } = useUI();
    const operate = useOperation();
    const [statusForm, setStatusForm] = useState(EMPTY_STATUS);
    const [guidance, setGuidance] = useState(EMPTY_GUIDANCE);

    const trips = getGuideTrips(state).filter((trip) => trip.guide && ['Accepted', 'Completed'].includes(trip.guideStatus) && trip.status !== 'completed');
    // wireSchedulePicker(): the first trip is pre-selected and its running item is the default.
    const statusTripId = statusForm.tripId || trips[0]?.id || '';
    const statusTrip = trips.find((t) => t.id === statusTripId);
    const scheduleItemId = statusForm.scheduleItemId ?? defaultScheduleItemId(statusTrip, 'guide');
    const guidanceTripId = guidance.tripId || (trips.length === 1 ? trips[0].id : '');

    const updates = (state.trips || [])
        .flatMap((trip) => (trip.updates || []).map((update) => ({ ...update, trip })))
        .filter((item) => item.source === 'Guide')
        .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0))
        .slice(0, 8);

    const submitStatus = (event) => {
        event.preventDefault();
        const statusText = STATUS_OPTIONS.find(([value]) => value === statusForm.status)?.[1] || 'Status Update';
        if (!statusTripId || !statusForm.status) { toast('Select a tour and status first.', 'error'); return; }
        if (!scheduleItemId) { toast('Select the current schedule item first.', 'error'); return; }
        operate(() => {
            guideUpdate(statusTripId, { scheduleItemId, status: statusForm.status, statusText, location: statusForm.location, notes: statusForm.notes || statusText });
            setStatusForm(EMPTY_STATUS);
            success('Tour Status Updated', 'Tour status updated for traveler and partner dashboards.');
        });
    };

    const submitGuidance = (event) => {
        event.preventDefault();
        const typeText = GUIDANCE_OPTIONS.find(([value]) => value === guidance.type)?.[1] || 'Traveler Guidance';
        if (!guidanceTripId || !guidance.message.trim()) { toast('Select a tour and enter a message.', 'error'); return; }
        operate(() => {
            guideMessage(guidanceTripId, { typeText, message: guidance.message });
            setGuidance(EMPTY_GUIDANCE);
            success('Guidance Sent', 'Guidance sent to traveler progress.');
        });
    };

    return (
        <DashboardLayout role="guide" page="guide__tour_updates">
            <div className="page-content">
                <div className="page-header">
                    <h1 className="text-2xl font-bold text-gray-900">Tour Updates</h1>
                    <p className="text-sm text-gray-500 mt-1">Update tour status and share guidance with travelers</p>
                </div>
                <div className="banner-alert">
                    <Icon name="info" />
                    <strong>Updates will inform Traveler Progress &amp; Travel Partner Execution dashboards in real-time.</strong>
                </div>
                <div className="forms-layout">
                    <div className="update-form-card">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Update Tour Status</h2>
                        <form onSubmit={submitStatus}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gu-trip">Tour ID</label>
                                <select id="gu-trip" className="form-select" value={statusTripId} onChange={(e) => setStatusForm((f) => ({ ...f, tripId: e.target.value, scheduleItemId: null }))}>
                                    <TripOptions trips={trips} />
                                </select>
                            </div>
                            <ScheduleItemSelect trip={statusTrip} role="guide" value={scheduleItemId} onChange={(value) => setStatusForm((f) => ({ ...f, scheduleItemId: value }))} />
                            <div className="form-group">
                                <label className="form-label" htmlFor="gu-status">Tour Status</label>
                                <select id="gu-status" className="form-select" value={statusForm.status} onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}>
                                    <option value="">Select Status</option>
                                    {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gu-location">Current Location</label>
                                <input id="gu-location" type="text" className="form-input" placeholder="Enter current location" value={statusForm.location} onChange={(e) => setStatusForm((f) => ({ ...f, location: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gu-notes">Status Notes [Optional]</label>
                                <textarea id="gu-notes" className="form-textarea" placeholder="Add any additional notes..." value={statusForm.notes} onChange={(e) => setStatusForm((f) => ({ ...f, notes: e.target.value }))} />
                            </div>
                            <button type="submit" className="btn"><Icon name="check" /> Update Status</button>
                        </form>
                    </div>
                    <div className="update-form-card">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Traveler Guidance</h2>
                        <form onSubmit={submitGuidance}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gg-trip">Tour ID</label>
                                <select id="gg-trip" className="form-select" value={guidanceTripId} onChange={(e) => setGuidance((f) => ({ ...f, tripId: e.target.value }))}>
                                    <TripOptions trips={trips} />
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gg-type">Guidance Type</label>
                                <select id="gg-type" className="form-select" value={guidance.type} onChange={(e) => setGuidance((f) => ({ ...f, type: e.target.value }))}>
                                    <option value="">Select Type</option>
                                    {GUIDANCE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gg-message">Message for travelers</label>
                                <textarea id="gg-message" className="form-textarea" placeholder="Enter instructions or updates for travelers..." value={guidance.message} onChange={(e) => setGuidance((f) => ({ ...f, message: e.target.value }))} />
                            </div>
                            <button type="submit" className="btn"><Icon name="arrowright" /> Send Update</button>
                        </form>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header bg-white p-6 border-b border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900">Recent Updates</h2>
                    </div>
                    <div className="card-body p-0">
                        {updates.length ? updates.map((item) => (
                            <div className="update-item hover:bg-gray-50" key={`${item.trip.id}-${item.id}`}>
                                <div className={`update-icon${item.status === 'Guidance' ? ' guidance' : ''}`}><Icon name={item.status === 'Guidance' ? 'message' : 'activity'} /></div>
                                <div className="update-content">
                                    <div className="update-header">
                                        <div className="update-title"><span className="text-blue-600">{item.trip.id}</span><StatusBadge label={item.title} /></div>
                                        <span className="update-time">{relativeTime(item.createdAt)}</span>
                                    </div>
                                    <div className="update-text font-medium mt-1">{item.message}</div>
                                </div>
                            </div>
                        )) : <div className="update-item">No guide updates yet.</div>}
                    </div>
                </div>
                <MemberMessagesPanel role="guide" />
            </div>
        </DashboardLayout>
    );
}
