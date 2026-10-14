import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import Loading from '../../components/Loading';
import { useUI } from '../../context/UIContext';
import { useWorkflowRefresh, useWorkflowState } from '../../context/WorkflowContext';
import { useOperation } from '../../hooks/usePortal';
import { PATHS } from '../../routes/paths';
import { tripsApi } from '../../services/api';
import { updateTrip } from '../../services/workflow';

const SU = PATHS.superuser;
const STATUS_TO_API = { Planned: 'planning', Ongoing: 'ongoing', Completed: 'completed', Cancelled: 'cancelled' };
const API_TO_STATUS = { planning: 'Planned', requested: 'Planned', ready: 'Planned', ongoing: 'Ongoing', completed: 'Completed', cancelled: 'Cancelled' };
const EMPTY = { title: '', location: '', startDate: '', endDate: '', assignedTo: '', status: 'Planned', budget: '', travelersCount: '' };

/**
 * superuser_add_trip.html / superuser_edit_trip.html. Sends a CreateTripDto / UpdateTripDto
 * compatible payload to POST /trips and PATCH /trips/:id (the original form posted fields the
 * DTO rejects). The travel partner list comes from real "Travel Partner" users.
 */
function TripForm({ mode }) {
    const isEdit = mode === 'edit';
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const id = params.get('id');
    const state = useWorkflowState();
    const refresh = useWorkflowRefresh();
    const { toast, success } = useUI();
    const operate = useOperation();
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [loadingRecord, setLoadingRecord] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const partners = (state.users || []).filter((u) => u.role === 'Travel Partner');
    const set = (key) => (event) => { setForm((f) => ({ ...f, [key]: event.target.value })); setErrors((e) => ({ ...e, [key]: '' })); };

    useEffect(() => {
        if (!isEdit) return undefined;
        if (!id) { setLoadingRecord(false); return undefined; }
        let cancelled = false;
        const fill = (trip) => setForm({
            title: trip.title || '',
            location: trip.destination || trip.location || '',
            startDate: (trip.startDate || '').slice(0, 10),
            endDate: (trip.endDate || '').slice(0, 10),
            assignedTo: trip.partnerEmail || trip.partner?.email || '',
            status: API_TO_STATUS[trip.status] || 'Planned',
            budget: trip.budget !== undefined ? String(trip.budget) : '',
            travelersCount: trip.travelersCount !== undefined ? String(trip.travelersCount) : '',
        });
        (async () => {
            try {
                const trip = await tripsApi.get(id);
                if (!cancelled && trip) fill(trip);
            } catch (err) {
                const local = (state.trips || []).find((t) => t.id === id);
                if (!cancelled && local) fill(local);
                else if (!cancelled) toast(`Could not load trip ${id}: ${err.message}`, 'error');
            } finally {
                if (!cancelled) setLoadingRecord(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isEdit, id]); // eslint-disable-line react-hooks/exhaustive-deps

    const validate = () => {
        const next = {};
        if (!form.title.trim()) next.title = 'Trip name is required.';
        if (!form.location.trim()) next.location = 'Location is required.';
        if (!form.startDate) next.startDate = 'Start date is required.';
        if (!form.endDate) next.endDate = 'End date is required.';
        if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) next.endDate = 'End date must be on or after the start date.';
        if (!isEdit && !form.assignedTo) next.assignedTo = 'Select a travel partner.';
        if (form.budget !== '' && Number(form.budget) < 0) next.budget = 'Budget cannot be negative.';
        if (form.travelersCount !== '' && Number(form.travelersCount) < 1) next.travelersCount = 'At least 1 traveler.';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const submit = (event) => {
        event.preventDefault();
        if (!validate()) return;
        operate(async () => {
            const payload = {
                title: form.title.trim(),
                destination: form.location.trim(),
                startDate: form.startDate,
                endDate: form.endDate,
                status: STATUS_TO_API[form.status] || 'planning',
            };
            if (form.budget !== '') payload.budget = Number(form.budget);
            if (form.travelersCount !== '') payload.adults = Number(form.travelersCount);
            if (!isEdit) payload.travelerName = '';
            setSaving(true);
            try {
                const saved = isEdit ? await tripsApi.update(id, payload) : await tripsApi.create(payload);
                const tripId = saved?.id || id;
                await refresh({ ignoreRecentWrites: true });
                const partner = partners.find((p) => p.email === form.assignedTo);
                if (tripId && partner) {
                    updateTrip(tripId, (trip) => {
                        trip.partner = { name: partner.name, email: partner.email };
                        trip.partnerEmail = partner.email;
                        if (form.travelersCount !== '') trip.travelersCount = Number(form.travelersCount);
                    });
                }
                success(isEdit ? 'Updated Successfully' : 'Created Successfully', isEdit ? 'Trip has been updated! Changes are now live.' : 'New trip created successfully.', () => navigate(SU.trips));
            } catch (err) {
                toast(err.message, 'error');
            } finally {
                setSaving(false);
            }
        });
    };

    const err = (key) => (errors[key] ? <div className="error-feedback">{errors[key]}</div> : null);
    const cls = (key, base) => `${base}${errors[key] ? ' input-error' : ''}`;

    return (
        <DashboardLayout role="superuser" page={isEdit ? 'superuser__superuser_edit_trip' : 'superuser__superuser_add_trip'} activeNav={SU.trips}>
            <div className="sa-dashboard-container sa-dashboard">
                <div className="sa-form-layout">
                    <div className="sa-form-main">
                        <Link to={SU.trips} className="sa-back-link"><Icon name="arrowleft" /> Back to Trips</Link>
                        <div className="sa-form-header">
                            <h1>{isEdit ? 'Edit Trip' : 'Add New Trip'}</h1>
                            <p>{isEdit ? 'Update trip itinerary, assignments, and budget' : 'Create a new trip with itinerary and assignments'}</p>
                        </div>
                        {loadingRecord ? <Loading message="Loading trip..." /> : (
                            <form id={isEdit ? 'crud-trip-edit-form' : 'crud-trip-form'} className="sa-form-card" onSubmit={submit} noValidate>
                                <div className="sa-form-group">
                                    <label className="sa-form-label" htmlFor="tf-title">Trip Name <span className="required">*</span></label>
                                    <input id="tf-title" type="text" name="title" className={cls('title', 'sa-form-control')} placeholder={isEdit ? undefined : 'Enter trip name'} required value={form.title} onChange={set('title')} />
                                    {err('title')}
                                    {!isEdit && <div className="sa-form-hint">Choose a descriptive name for this trip</div>}
                                </div>
                                <div className="sa-form-group">
                                    <label className="sa-form-label" htmlFor="tf-location">Location <span className="required">*</span></label>
                                    <input id="tf-location" type="text" name="location" className={cls('location', 'sa-form-control')} placeholder={isEdit ? undefined : 'e.g., Paris, France'} required value={form.location} onChange={set('location')} />
                                    {err('location')}
                                </div>
                                <div className="sa-form-row">
                                    <div className="sa-form-group">
                                        <label className="sa-form-label" htmlFor="tf-start">Start Date <span className="required">*</span></label>
                                        <input id="tf-start" type="date" name="startDate" className={cls('startDate', 'sa-form-control')} required value={form.startDate} onChange={set('startDate')} />
                                        {err('startDate')}
                                    </div>
                                    <div className="sa-form-group">
                                        <label className="sa-form-label" htmlFor="tf-end">End Date <span className="required">*</span></label>
                                        <input id="tf-end" type="date" name="endDate" className={cls('endDate', 'sa-form-control')} required min={form.startDate || undefined} value={form.endDate} onChange={set('endDate')} />
                                        {err('endDate')}
                                    </div>
                                </div>
                                <div className="sa-form-group">
                                    <label className="sa-form-label" htmlFor="tf-partner">Assign Travel Partner <span className="required">*</span></label>
                                    <select id="tf-partner" name="assignedTo" className={cls('assignedTo', 'sa-form-select')} required value={form.assignedTo} onChange={set('assignedTo')}>
                                        <option value="" disabled>Select a travel partner</option>
                                        {partners.map((p) => <option key={p.id || p.email} value={p.email}>{p.name} ({p.email})</option>)}
                                    </select>
                                    {err('assignedTo')}
                                    {!isEdit && <div className="sa-form-hint">Choose the travel partner who will coordinate this trip</div>}
                                </div>
                                <div className="sa-form-group">
                                    <label className="sa-form-label" htmlFor="tf-status">Status <span className="required">*</span></label>
                                    <select id="tf-status" name="status" className="sa-form-select" required value={form.status} onChange={set('status')}>
                                        <option value="Planned">Planned</option>
                                        <option value="Ongoing">Ongoing</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div className="sa-form-row">
                                    <div className="sa-form-group">
                                        <label className="sa-form-label" htmlFor="tf-budget">{isEdit ? 'Budget ($)' : 'Budget'}</label>
                                        <input id="tf-budget" type="number" name="budget" min="0" className={cls('budget', 'sa-form-control')} placeholder={isEdit ? undefined : '25000'} value={form.budget} onChange={set('budget')} />
                                        {err('budget')}
                                    </div>
                                    <div className="sa-form-group">
                                        <label className="sa-form-label" htmlFor="tf-count">Max Travelers</label>
                                        <input id="tf-count" type="number" name="travelersCount" min="1" className={cls('travelersCount', 'sa-form-control')} placeholder={isEdit ? undefined : '20'} value={form.travelersCount} onChange={set('travelersCount')} />
                                        {err('travelersCount')}
                                    </div>
                                </div>
                                <div className="sa-btn-row">
                                    <button type="submit" className="sa-btn-primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update Trip' : 'Save Trip'}</button>
                                    <button type="button" className="sa-btn-secondary" onClick={() => navigate(SU.trips)}>Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>
                    <div className="sa-info-card">
                        {isEdit ? (
                            <>
                                <div className="info-title">Modifying Trips</div>
                                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>Updating a trip&apos;s location or dates will automatically notify the assigned travel partner. Ensure that all vendor arrangements are consistent with these changes before saving.</p>
                            </>
                        ) : (
                            <>
                                <div className="info-title">Trip Planning Tips</div>
                                <ul className="info-list">
                                    <li><strong>Planning Phase:</strong> Use &quot;Planned&quot; status for trips in the booking stage</li>
                                    <li><strong>Active Trips:</strong> Set to &quot;Ongoing&quot; when the trip has started</li>
                                    <li><strong>After Completion:</strong> Mark as &quot;Completed&quot; to archive trip details</li>
                                    <li><strong>Travel Partner:</strong> Assigned partner will manage vendors, guides, and bookings</li>
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

export const SuperuserAddTrip = () => <TripForm mode="add" />;
export const SuperuserEditTrip = () => <TripForm mode="edit" />;
