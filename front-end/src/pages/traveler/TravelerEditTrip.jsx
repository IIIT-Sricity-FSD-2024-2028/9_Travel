import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { canOperateSession, dateOnly, latestTravelerTrip, statusLabel, submitTravelerTripEdit, tripDateLimits } from '../../services/workflow';

/** "Save Changes" handler shared by both edit pages (submitTravelerTripEdit). */
function useTripEdit(mode) {
    const state = useWorkflowState();
    const [params] = useSearchParams();
    const { toast, success } = useUI();
    const navigate = useNavigate();
    const requested = params.get('trip');
    const trip = (requested && state.trips.find((t) => t.id === requested)) || latestTravelerTrip(state);
    const [values, setValues] = useState({ startDate: '', endDate: '', travelersCount: '', accommodation: '' });

    useEffect(() => {
        if (!trip) return;
        setValues({
            startDate: trip.startDate ? dateOnly(trip.startDate) : '',
            endDate: trip.endDate ? dateOnly(trip.endDate) : '',
            travelersCount: String(trip.travelersCount || 1),
            accommodation: trip.accommodationType || '',
        });
    }, [trip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const save = () => {
        if (!trip) { toast('No active trip found to edit.', 'warning'); return; }
        if (!canOperateSession()) return;
        if (mode === 'upcoming' && values.startDate && values.endDate && new Date(values.endDate) <= new Date(values.startDate)) {
            toast('End date must be after start date.', 'warning');
            return;
        }
        submitTravelerTripEdit(trip.id, mode === 'upcoming'
            ? { startDate: values.startDate, endDate: values.endDate, travelersCount: values.travelersCount, accommodationType: values.accommodation }
            : {});
        success('Trip Modified', 'Trip modifications saved! Travel partner has been notified.', () => navigate(PATHS.traveler.myTrips));
    };
    return { trip, values, setValues, save };
}

function Subtitle({ trip, fallback, badgeStyle }) {
    if (!trip) return <div className="subtitle">{fallback}</div>;
    return (
        <div className="subtitle">
            {trip.title} • <span style={{ fontWeight: 600, color: '#2563eb' }}>{trip.id}</span> <span className="badge-upcoming" style={badgeStyle}>{statusLabel(trip)}</span>
        </div>
    );
}

const ACCOMMODATION_OPTIONS = ['Deluxe Suite', 'Standard Room', 'Luxury Villa', 'standard', 'luxury', 'budget', 'authentic'];

export function TravelerEditTripUpcoming() {
    const { trip, values, setValues, save } = useTripEdit('upcoming');
    const limits = tripDateLimits();
    const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
    const accommodationOptions = Array.from(new Set([values.accommodation, ...ACCOMMODATION_OPTIONS].filter(Boolean)));

    return (
        <DashboardLayout role="traveler" page="traveler__traveler_edit_trip_upcoming" activeNav={PATHS.traveler.myTrips}>
            <div className="page-content">
                <Link to={PATHS.traveler.myTrips} className="top-header-edit">
                    <Icon name="arrow-left" style={{ width: 16, height: 16 }} /> Back to My Trips
                </Link>
                <div className="page-title-row">
                    <h1>Edit Trip</h1>
                    <Subtitle trip={trip} fallback="No active trip found" />
                </div>
                <div className="alert-banner">
                    <Icon name="info" style={{ width: 18, height: 18 }} />
                    <div>
                        <h4>Full Editing Available - Advanced Customization</h4>
                        <p>You have full control to customize pendings lists, including areas like activities, transportation, budget and more. Check below to edit your saved settings.</p>
                    </div>
                </div>

                <div className="edit-layout">
                    <div className="edit-left">
                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="calendar" /> Trip Dates</div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="editStart">Start Date</label>
                                    <input id="editStart" type="date" className="form-control" min={limits.min} max={limits.max} value={values.startDate} onChange={set('startDate')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="editEnd">End Date</label>
                                    <input id="editEnd" type="date" className="form-control" min={limits.min} max={limits.max} value={values.endDate} onChange={set('endDate')} />
                                </div>
                            </div>
                            <div className="help-text info"><Icon name="info" style={{ width: 14, height: 14 }} /> Date changes may require approval depending on your partner&apos;s cancellation policy.</div>
                        </div>

                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="map-pin" /> Places to Visit</div>
                            {['Ubud Forest', 'Neka Art Museum', 'Sacred Monkey Sanctuary'].map((place) => (
                                <div className="place-item" key={place}><div className="place-name"><Icon name="map-pin" style={{ width: 16 }} /> {place}</div><Icon name="x" className="place-remove" style={{ width: 16 }} /></div>
                            ))}
                            <div className="add-place-row">
                                <input type="text" className="form-control" placeholder="Name of venue (e.g., Arc de Triomphe)" aria-label="Venue name" />
                                <select className="form-control" style={{ width: 120 }} aria-label="Venue type"><option>Sight</option></select>
                                <button type="button" className="btn-outline">Add</button>
                            </div>
                            <div className="help-text success"><Icon name="check" style={{ width: 14 }} /> Add places you&apos;d like to visit on your trip.</div>
                        </div>

                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="activity" /> Activities &amp; Experiences</div>
                            <div className="act-columns">
                                <div className="act-col"><div className="act-header">City Tour</div><div className="act-item">Historical Walks</div><div className="act-item">Night Life</div><div className="act-item">Cultural Shows</div></div>
                                <div className="act-col"><div className="act-header">Water Cruise</div><div className="act-item">Museum Visits</div><div className="act-item">Spa &amp; Wellness</div><div className="act-item">Photography Tour</div></div>
                                <div className="act-col"><div className="act-header">Wine Tasting</div><div className="act-item">Shopping Experience</div><div className="act-item">Theme Parks</div><div className="act-item">Food Tour</div></div>
                            </div>
                            <div className="help-text info"><Icon name="check" style={{ width: 14 }} /> Choose Activities.</div>
                        </div>

                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="navigation" style={{ transform: 'rotate(45deg)' }} /> Transportation &amp; Logistics</div>
                            <div className="form-grid-2">
                                <div className="form-group"><label className="form-label">Flight Preference</label><select className="form-control" aria-label="Flight Preference"><option>Business Class</option></select></div>
                                <div className="form-group"><label className="form-label">Ground Transportation</label><select className="form-control" aria-label="Ground Transportation"><option>Private Car + Public Transit</option></select></div>
                            </div>
                            <div className="help-text success"><Icon name="check" style={{ width: 14 }} /> Transportation preferences saved.</div>
                        </div>

                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="dollar-sign" /> Budget &amp; Insurance</div>
                            <div className="form-grid-2">
                                <div className="form-group"><label className="form-label">Budget Category</label><select className="form-control" aria-label="Budget Category"><option>Premium (High-end)</option></select></div>
                                <div className="form-group"><label className="form-label">Travel Insurance</label><select className="form-control" aria-label="Travel Insurance"><option>Comprehensive Coverage</option></select></div>
                            </div>
                            <div className="help-text success"><Icon name="check" style={{ width: 14 }} /> Budget changes may delay processing until new quotes are secured for you.</div>
                        </div>

                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="users" /> Travelers &amp; Accommodation</div>
                            <div className="form-group"><label className="form-label" htmlFor="editTravelers">Number of Travelers</label><input id="editTravelers" type="number" min="1" className="form-control" value={values.travelersCount} onChange={set('travelersCount')} /></div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="editAccommodation">Accommodation Preference</label>
                                <select id="editAccommodation" className="form-control" value={values.accommodation} onChange={set('accommodation')}>
                                    {accommodationOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="form-group"><label className="form-label">Room Configuration</label><select className="form-control" aria-label="Room Configuration"><option>Double Bed</option></select></div>
                        </div>

                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="user" /> Tour Guide Preferences</div>
                            <div className="form-group"><label className="form-label">Language Preference</label><select className="form-control" aria-label="Language Preference"><option>English Speaking</option></select></div>
                            <div className="help-text info"><Icon name="info" style={{ width: 14 }} /> Guide will be selected based on your preferences.</div>
                            <div className="help-text success"><Icon name="check" style={{ width: 14 }} /> Guide preferences can be updated.</div>
                        </div>

                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="coffee" /> Meal Preferences</div>
                            <div className="form-group"><label className="form-label">Meal Plan</label><select className="form-control" aria-label="Meal Plan"><option>All Meals Included</option></select></div>
                            <div className="form-group"><label className="form-label" htmlFor="editDiet">Dietary Restrictions</label><input id="editDiet" type="text" className="form-control" defaultValue="Vegetarian" /></div>
                        </div>
                    </div>

                    <div className="edit-right">
                        <div className="edit-card">
                            <div className="edit-card-title" style={{ marginBottom: 16, paddingBottom: 0, border: 'none', fontSize: 14 }}><Icon name="phone" style={{ color: '#ef4444' }} /> Emergency Contact</div>
                            <div className="form-group" style={{ marginBottom: 12 }}><label className="form-label" htmlFor="emName">Contact Name</label><input id="emName" type="text" className="form-control" defaultValue="Jane Doe" /></div>
                            <div className="form-group"><label className="form-label" htmlFor="emPhone">Contact Phone</label><input id="emPhone" type="text" className="form-control" defaultValue="+1 555-0199" /></div>
                        </div>
                        <div className="gradient-card">
                            <h3>Advanced Customization</h3>
                            <ul>
                                {['Trip dates & duration', 'Places to visit & durations', 'Activities & experiences', 'Transportation & flights', 'Budget & insurance', 'Accommodation & rooms', 'Tour guide preferences', 'Meals & dietary needs'].map((item) => (
                                    <li key={item}><Icon name="check" style={{ width: 14 }} /> {item}</li>
                                ))}
                            </ul>
                            <div className="gradient-alert"><Icon name="alert-circle" style={{ width: 16 }} /> Your travel partner will be notified of any changes.</div>
                        </div>
                        <div>
                            <button type="button" className="btn-save-primary" onClick={save}><Icon name="save" style={{ width: 16 }} /> Save Changes</button>
                            <Link to={PATHS.traveler.myTrips} className="btn-cancel-link">Cancel</Link>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

export function TravelerEditTripOngoing() {
    const { trip, values, save } = useTripEdit('ongoing');
    const lockedNote = (text) => <div className="help-text locked"><Icon name="lock" style={{ width: 14, height: 14 }} /> {text}</div>;
    const editable = <div className="help-text success"><Icon name="check" style={{ width: 14, height: 14 }} /> Can be updated anytime</div>;

    return (
        <DashboardLayout role="traveler" page="traveler__traveler_edit_trip_ongoing" activeNav={PATHS.traveler.myTrips}>
            <div className="page-content">
                <Link to={PATHS.traveler.myTrips} className="top-header-edit">
                    <Icon name="arrow-left" style={{ width: 16, height: 16 }} /> Back to My Trips
                </Link>
                <div className="page-title-row">
                    <h1>Edit Trip</h1>
                    <Subtitle trip={trip} fallback="No active trip found" badgeStyle={{ background: '#dcfce7', color: '#16a34a' }} />
                </div>
                <div className="alert-banner warning">
                    <Icon name="alert-triangle" style={{ width: 18, height: 18 }} />
                    <div>
                        <h4>Limited Editing - Trip in Progress</h4>
                        <p>Since your trip is ongoing, you can only update preferences, special requests, and emergency contact information. Major changes like dates and travelers cannot be modified.</p>
                    </div>
                </div>

                <div className="edit-layout single-col">
                    <div className="edit-left">
                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="calendar" /> Trip Dates</div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="ongoingStart">Start Date</label>
                                    <input id="ongoingStart" type="text" className="form-control" value={values.startDate} disabled readOnly />
                                    {lockedNote('Cannot change - trip in progress')}
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="ongoingEnd">End Date</label>
                                    <input id="ongoingEnd" type="text" className="form-control" value={values.endDate} disabled readOnly />
                                    {lockedNote('Cannot change - trip in progress')}
                                </div>
                            </div>
                        </div>

                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="users" /> Travelers &amp; Accommodation</div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ongoingTravelers">Number of Travelers</label>
                                <input id="ongoingTravelers" type="number" className="form-control" value={values.travelersCount} disabled readOnly />
                                {lockedNote('Cannot change - trip in progress')}
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ongoingAccommodation">Accommodation Preference</label>
                                <select id="ongoingAccommodation" className="form-control" disabled value={values.accommodation || 'Deluxe Suite'} onChange={() => {}}>
                                    <option value={values.accommodation || 'Deluxe Suite'}>{values.accommodation || 'Deluxe Suite'}</option>
                                </select>
                                {lockedNote('Cannot change - accommodation booked')}
                            </div>
                        </div>

                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="coffee" /> Meal Preferences</div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ongoingMeal">Meal Plan</label>
                                <select id="ongoingMeal" className="form-control">
                                    <option>All Meals Included</option>
                                    <option>Breakfast &amp; Dinner</option>
                                    <option>Breakfast Only</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ongoingDiet">Dietary Restrictions</label>
                                <input id="ongoingDiet" type="text" className="form-control" defaultValue="Vegetarian" />
                                {editable}
                            </div>
                        </div>

                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="info" /> Special Requests &amp; Accessibility</div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ongoingRequests">Special Requests</label>
                                <input id="ongoingRequests" type="text" className="form-control" defaultValue="Late check-in requested" />
                                {editable}
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ongoingAccess">Accessibility Needs</label>
                                <input id="ongoingAccess" type="text" className="form-control" defaultValue="None" />
                                {editable}
                            </div>
                        </div>

                        <div className="edit-card">
                            <div className="edit-card-title"><Icon name="phone" style={{ color: '#ef4444' }} /> Emergency Contact</div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ongoingEmName">Contact Name</label>
                                <input id="ongoingEmName" type="text" className="form-control" defaultValue="Jane Doe" />
                                {editable}
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ongoingEmPhone">Contact Phone</label>
                                <input id="ongoingEmPhone" type="text" className="form-control" defaultValue="+1 555-0199" />
                                {editable}
                            </div>
                        </div>

                        <div style={{ maxWidth: 300, marginTop: 24 }}>
                            <button type="button" className="btn-save-primary" onClick={save}><Icon name="save" style={{ width: 16 }} /> Save Changes</button>
                            <Link to={PATHS.traveler.myTrips} className="btn-cancel-link">Cancel</Link>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
