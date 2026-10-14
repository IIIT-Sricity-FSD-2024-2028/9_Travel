import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../icons/Icon';
import ScheduleFeed from './ScheduleFeed';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useUI } from '../../context/UIContext';
import { useOperation } from '../../hooks/usePortal';
import {
    addScheduleItem, allActiveTrips, currentSession, formatDateRange, formatShortDate, regenerateTripSchedule, removeScheduleItem,
    statusLabel, tripDays, tripsForCurrentUser,
} from '../../services/workflow';

/**
 * Shared trip schedule page (renderScheduleDetailPages in workflow.js) used by the
 * Travel Partner, Tour Guide and Vendor "schedule detail" routes (?trip=TRIP-ID).
 * Travel Partners can regenerate the itinerary and add / remove schedule items.
 */
export default function ScheduleDetailPage({ role, containerClass = 'page-content', containerId }) {
    const state = useWorkflowState();
    const [params] = useSearchParams();
    const { toast } = useUI();
    const operate = useOperation();
    const requestedId = params.get('trip');
    const isPartnerPage = role === 'partner';

    const active = allActiveTrips(state);
    const userTrips = tripsForCurrentUser(active);
    const sessionRole = String(currentSession().role || '').toLowerCase();
    const restricted = ['traveler', 'vendor', 'guide'].includes(sessionRole);
    let trip;
    if (requestedId) trip = (restricted ? userTrips : active).find((t) => t.id === requestedId) || null;
    else trip = restricted ? (userTrips[0] || null) : (active.find((t) => t.scheduleStarted) || active[0] || null);

    const [dates, setDates] = useState({ start: '', end: '' });
    const [newItem, setNewItem] = useState({ day: 1, time: '', title: '', location: '', owner: 'guide' });

    useEffect(() => {
        setDates({ start: trip?.startDate || '', end: trip?.endDate || '' });
    }, [trip?.id, trip?.startDate, trip?.endDate]);

    if (!trip) {
        return (
            <div className={containerClass} id={containerId}>
                <div className="page-header">
                    <h1>Schedule Details</h1>
                    <p>No active trip found.</p>
                </div>
                <div className="card" style={{ padding: 24 }}>No trip request found. Go to Dashboard to select a package and send a request first.</div>
            </div>
        );
    }

    const days = tripDays(trip);

    const submitDates = (event) => {
        event.preventDefault();
        if (!dates.start || !dates.end) { toast('Please select both start and end dates.', 'warning'); return; }
        if (new Date(dates.end) <= new Date(dates.start)) { toast('End date must be after start date.', 'warning'); return; }
        operate(() => {
            regenerateTripSchedule(trip.id, dates.start, dates.end);
            toast(`Itinerary regenerated for ${dates.start} to ${dates.end}. All days are now covered.`, 'success');
        });
    };

    const submitItem = (event) => {
        event.preventDefault();
        if (!newItem.time.trim() || !newItem.title.trim() || !newItem.location.trim()) {
            toast('Please fill in the time, activity title and location.', 'warning');
            return;
        }
        operate(() => {
            addScheduleItem(trip.id, { day: parseInt(newItem.day, 10) || 1, time: newItem.time, title: newItem.title, location: newItem.location, owner: newItem.owner });
            setNewItem((prev) => ({ ...prev, time: '', title: '', location: '' }));
            toast('Schedule item added successfully!', 'success');
        });
    };

    const removeItem = (itemId) => operate(() => {
        removeScheduleItem(trip.id, itemId);
        toast('Schedule item removed successfully!', 'success');
    });

    const smallInput = { padding: 8, borderRadius: 4, border: '1px solid var(--border)' };

    return (
        <div className={containerClass} id={containerId}>
            <div className="page-header">
                <h1>{trip.title} Schedule</h1>
                <p>{formatDateRange(trip)} - {statusLabel(trip)}</p>
            </div>
            {trip.status === 'completed' ? (
                <div className="info-banner" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #dcfce7, #f0fdf4)', borderColor: '#22c55e', color: '#15803d' }}>
                    <Icon name="checkcircle" /> <strong>Trip Completed!</strong> All {days} days of the {trip.title} itinerary have been successfully completed.
                </div>
            ) : (
                <div className="info-banner" style={{ marginBottom: '1.5rem' }}>
                    <Icon name="calendar" /> Package schedule is shared across traveler, guide, vendor, and travel partner pages. Schedule covers all <strong>{days} days</strong> from {formatDateRange(trip)}.
                </div>
            )}

            {isPartnerPage && trip.status !== 'completed' && (
                <>
                    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--primary, #0ea5e9)' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main, var(--foreground, #1e293b))' }}>
                            <Icon name="edit-3" /> Traveler&apos;s Customization Request
                        </h3>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-muted, var(--muted-foreground, #475569))' }}>
                            <strong>Requested Places / Special Requirements:</strong><br />
                            {trip.notes || 'None specified'}
                        </p>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted, var(--muted-foreground, #475569))' }}>
                            <strong>Trip Duration:</strong> {days} days ({formatDateRange(trip)})
                        </p>
                    </div>

                    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-main, var(--foreground, #1e293b))' }}><Icon name="calendar" /> Adjust Trip Duration &amp; Regenerate Schedule</h3>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>Update start/end dates to regenerate the full itinerary for all days requested by the traveler.</p>
                        <form id="extend-trip-form" onSubmit={submitDates} style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                                <label className="form-label" htmlFor="trip-start-date" style={{ fontSize: '0.85rem' }}>Start Date</label>
                                <input type="date" className="form-control" id="trip-start-date" value={dates.start} onChange={(e) => setDates((d) => ({ ...d, start: e.target.value }))} style={smallInput} />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                                <label className="form-label" htmlFor="trip-end-date" style={{ fontSize: '0.85rem' }}>End Date</label>
                                <input type="date" className="form-control" id="trip-end-date" value={dates.end} onChange={(e) => setDates((d) => ({ ...d, end: e.target.value }))} style={smallInput} />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: 4 }}>
                                <button type="submit" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    <Icon name="check" /> Update &amp; Regenerate Itinerary
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {isPartnerPage && trip.status === 'completed' && (
                <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid #22c55e', background: '#f0fdf4' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="checkcircle" /> Trip Successfully Completed</h3>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#166534' }}>
                        <strong>Traveler:</strong> {trip.travelerName} &nbsp;|&nbsp; <strong>Duration:</strong> {days} days &nbsp;|&nbsp; <strong>Completed:</strong> {formatShortDate(trip.completedAt || trip.endDate)}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#166534', fontStyle: 'italic' }}>This trip record is read-only. No further edits can be made.</p>
                </div>
            )}

            <div className="schedule-feed">
                <ScheduleFeed trip={trip} onRemove={isPartnerPage && trip.status !== 'completed' ? removeItem : undefined} />
            </div>

            {isPartnerPage && trip.status !== 'completed' && (
                <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main, var(--foreground, #1e293b))' }}><Icon name="plus-circle" /> Add Custom Activity to Schedule</h3>
                    <form id="add-schedule-item-form" onSubmit={submitItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="new-item-day" style={{ fontSize: '0.85rem' }}>Day Number</label>
                            <input type="number" className="form-control" id="new-item-day" min="1" max={days || 30} value={newItem.day} onChange={(e) => setNewItem((p) => ({ ...p, day: e.target.value }))} required style={smallInput} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="new-item-time" style={{ fontSize: '0.85rem' }}>Time</label>
                            <input type="text" className="form-control" id="new-item-time" placeholder="e.g. 10:00 AM" value={newItem.time} onChange={(e) => setNewItem((p) => ({ ...p, time: e.target.value }))} required style={smallInput} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="new-item-title" style={{ fontSize: '0.85rem' }}>Activity / Service Title</label>
                            <input type="text" className="form-control" id="new-item-title" placeholder="e.g. Visit Eiffel Tower" value={newItem.title} onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))} required style={smallInput} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="new-item-loc" style={{ fontSize: '0.85rem' }}>Location</label>
                            <input type="text" className="form-control" id="new-item-loc" placeholder="e.g. Champ de Mars" value={newItem.location} onChange={(e) => setNewItem((p) => ({ ...p, location: e.target.value }))} required style={smallInput} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="new-item-owner" style={{ fontSize: '0.85rem' }}>Assigned Role</label>
                            <select className="form-control" id="new-item-owner" value={newItem.owner} onChange={(e) => setNewItem((p) => ({ ...p, owner: e.target.value }))} style={{ ...smallInput, background: 'var(--bg-card, #fff)', color: 'var(--text-main, #000)' }}>
                                <option value="guide">Tour Guide</option>
                                <option value="vendor">Vendor (Transport/Hotel)</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button type="submit" style={{ background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                                Add to Itinerary
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
