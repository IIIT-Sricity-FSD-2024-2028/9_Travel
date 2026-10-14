import { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import MemberMessagesPanel from '../../components/workflow/MemberMessages';
import ScheduleItemSelect, { defaultScheduleItemId } from '../../components/workflow/ScheduleItemSelect';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useOperation } from '../../hooks/usePortal';
import { getVendorTrips, relativeTime, vendorUpdate } from '../../services/workflow';
import { TripOptions } from '../guide/GuideTourUpdates';

const STATUS_OPTIONS = [['progress', 'In Progress'], ['enroute', 'En Route'], ['completed', 'Completed']];
const EMPTY = { tripId: '', scheduleItemId: null, serviceType: null, message: '', status: '' };

/** vendor_service_updates.html (renderVendorUpdates + submitVendorUpdate). */
export default function VendorServiceUpdates() {
    const state = useWorkflowState();
    const { toast, success } = useUI();
    const operate = useOperation();
    const [form, setForm] = useState(EMPTY);

    const trips = getVendorTrips(state).filter((trip) => ['Accepted', 'In Progress', 'En Route', 'Completed'].includes(trip.vendorStatus) && trip.status !== 'completed');
    const serviceTypes = [...new Set(trips.map((trip) => trip.vendor?.type).filter(Boolean))];
    // wireSchedulePicker(): first trip pre-selected, its running item and service type as defaults.
    const tripId = form.tripId || trips[0]?.id || '';
    const trip = trips.find((t) => t.id === tripId);
    const scheduleItemId = form.scheduleItemId ?? defaultScheduleItemId(trip, 'vendor');
    const serviceType = form.serviceType ?? (trip?.vendor?.type || '');

    const updates = (state.trips || [])
        .flatMap((t) => (t.updates || []).map((update) => ({ ...update, trip: t })))
        .filter((item) => item.source === 'Vendor')
        .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0))
        .slice(0, 8);

    const submit = () => {
        const statusText = STATUS_OPTIONS.find(([v]) => v === form.status)?.[1] || 'In Progress';
        if (!tripId || !scheduleItemId || !serviceType || !form.status || !form.message.trim()) {
            toast('Fill all vendor update fields first.', 'error');
            return;
        }
        operate(() => {
            vendorUpdate(tripId, { scheduleItemId, status: form.status, statusText, serviceType, message: form.message.trim() });
            setForm(EMPTY);
            success('Vendor Update Saved', 'Vendor update is now visible in traveler progress and partner execution.');
        });
    };

    return (
        <DashboardLayout role="vendor" page="vendor__vendor_service_updates">
            <div className="page-scroll">
                <div className="page-title">
                    <h1>Service Updates</h1>
                    <p>Send real-time updates about service progress to the travel partner</p>
                </div>
                <div className="info-banner">
                    <Icon name="send" /> Send real-time updates directly to Travel Partner &amp; Traveler dashboard
                </div>
                <div className="form-card">
                    <div className="form-group">
                        <label className="form-label" htmlFor="vu-trip">Trip ID</label>
                        <select id="vu-trip" className="form-input" required value={tripId} onChange={(e) => setForm((f) => ({ ...f, tripId: e.target.value, scheduleItemId: null, serviceType: null }))}>
                            <TripOptions trips={trips} />
                        </select>
                    </div>
                    <ScheduleItemSelect trip={trip} role="vendor" className="form-input" value={scheduleItemId} onChange={(value) => setForm((f) => ({ ...f, scheduleItemId: value }))} />
                    <div className="form-group">
                        <label className="form-label" htmlFor="vu-service">Service Type</label>
                        <select id="vu-service" className="form-input" required value={serviceType} onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}>
                            <option value="">Select Service Type</option>
                            {serviceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="vu-message">Update Message</label>
                        <textarea id="vu-message" className="form-input" placeholder="Enter service update message..." required value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="vu-status">Status Update</label>
                        <select id="vu-status" className="form-input" required value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                            <option value="">Select Status</option>
                            {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                    <button type="button" className="btn-submit" onClick={submit}><Icon name="send" /> Send Update</button>
                </div>
                <div className="updates-card">
                    <h2 className="updates-title">Recent Updates</h2>
                    {updates.length ? updates.map((item) => (
                        <div className="update-item" key={`${item.trip.id}-${item.id}`}>
                            <div className="upd-info">
                                <div className="upd-trip">{item.trip.id}</div>
                                <div className="upd-msg">{item.message}</div>
                                <div className="upd-time">{relativeTime(item.createdAt)}</div>
                            </div>
                            <span className="status-pill pill-progress">{item.status}</span>
                        </div>
                    )) : <div className="update-item" style={{ color: '#64748b', padding: 12 }}>No vendor updates yet.</div>}
                </div>
                <MemberMessagesPanel role="vendor" />
            </div>
        </DashboardLayout>
    );
}
