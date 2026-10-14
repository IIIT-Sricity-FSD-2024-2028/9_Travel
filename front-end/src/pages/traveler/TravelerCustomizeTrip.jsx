import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { PATHS } from '../../routes/paths';
import { canOperateSession, makeTripRequest, tripDateLimits } from '../../services/workflow';

const INITIAL_PLACES = [
    { name: 'Male City Tour', note: 'Recommended activity' },
    { name: 'Sunset Dolphin Cruise', note: 'Highly rated by other travelers' },
];

/** traveler_customize_trip.html – customise a base package and send it as a trip request. */
export default function TravelerCustomizeTrip() {
    const { toast, success } = useUI();
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [accom, setAccom] = useState('luxury');
    const [notes, setNotes] = useState('');
    const [places, setPlaces] = useState(INITIAL_PLACES);
    const limits = tripDateLimits();

    const addPlace = () => {
        const placeName = window.prompt('Enter the place or activity name:');
        if (!placeName || !placeName.trim()) return;
        setPlaces((list) => [...list, { name: placeName.trim(), note: 'Custom requested place' }]);
    };

    const submit = (event) => {
        event.preventDefault();
        if (!startDate || !endDate) {
            toast('Please select both check-in and check-out dates.', 'error');
            return;
        }
        if (!canOperateSession()) return;
        try {
            makeTripRequest({ packageName: 'Customized Package', destination: 'Maldives', startDate, endDate, accommodationType: accom, notes });
            success('Request Sent', 'Your customized trip plan has been submitted.', () => navigate(PATHS.traveler.myTrips));
        } catch (error) {
            toast(error.message || 'Failed to submit trip request.', 'error');
        }
    };

    return (
        <DashboardLayout role="traveler" page="traveler__traveler_customize_trip" activeNav={PATHS.traveler.myTrips}>
            <div className="page-container">
                <div>
                    <button type="button" onClick={() => navigate(-1)} aria-label="Back"><Icon name="arrowleft" /></button>
                    <div>
                        <h1>Customize Your Package</h1>
                        <p>Review your base itinerary and submit your preferred trip parameters to your travel partner.</p>
                    </div>
                </div>

                <form id="customizeTripForm" onSubmit={submit}>
                    <div className="card">
                        <h2><Icon name="calendar" /> Decide Your Travel Dates</h2>
                        <div className="date-grid form-group">
                            <div>
                                <label className="form-label" htmlFor="custStartDate">Check-in Date *</label>
                                <input type="date" id="custStartDate" className="form-input" min={limits.min} max={limits.max} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                            </div>
                            <div>
                                <label className="form-label" htmlFor="custEndDate">Check-out Date *</label>
                                <input type="date" id="custEndDate" className="form-input" min={limits.min} max={limits.max} value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                            </div>
                        </div>
                        <div>
                            <p>Select the dates that work best for you. Your travel partner will confirm availability and adjust the itinerary duration.</p>
                        </div>
                    </div>

                    <div className="card">
                        <h2><Icon name="mappin" /> Customize Destinations &amp; Places</h2>
                        <p>The following places were suggested by your partner. You can remove ones you don&apos;t like or request new additions.</p>
                        <div className="places-list" id="placesList">
                            {places.map((place, index) => (
                                <div className="place-item" key={`${place.name}-${index}`}>
                                    <div className="place-info">
                                        <div className="place-icon"><Icon name="star" /></div>
                                        <div>
                                            <div>{place.name}</div>
                                            <div>{place.note}</div>
                                        </div>
                                    </div>
                                    <button type="button" className="remove-place-btn" title="Remove place" onClick={() => setPlaces((list) => list.filter((_, i) => i !== index))}><Icon name="trash2" /></button>
                                </div>
                            ))}
                        </div>
                        <div>
                            <button type="button" className="add-btn" onClick={addPlace}><Icon name="plus" /> Request Additional Place or Activity</button>
                        </div>
                    </div>

                    <div className="card">
                        <h2><Icon name="settings" /> Preferences &amp; Requests</h2>
                        <div className="form-group">
                            <label className="form-label" htmlFor="custAccom">Accommodation Preference</label>
                            <select className="form-select" id="custAccom" value={accom} onChange={(e) => setAccom(e.target.value)}>
                                <option value="luxury">Luxury Resort (Partner Proposed)</option>
                                <option value="premium">Premium Hotel</option>
                                <option value="budget">Budget Friendly</option>
                                <option value="villa">Private Water Villa</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="custNotes">Dietary Requirements or Special Requests</label>
                            <textarea className="form-textarea" id="custNotes" rows="4" placeholder="E.g., We are vegetarians and would prefer rooms with a sunset view..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <Link to={PATHS.traveler.myTrips} className="t-btn" style={{ textDecoration: 'none' }}>Cancel</Link>
                        <button type="submit" className="t-btn" id="btnSendCustomize">Send Confirmation Request <Icon name="send" /></button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
