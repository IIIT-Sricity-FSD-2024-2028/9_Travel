import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import HiddenFileInput from '../../components/HiddenFileInput';
import SalaryWidget from '../../components/workflow/SalaryWidget';
import { SessionAvatar } from '../../components/Header';
import { useProfile } from '../../hooks/useProfile';
import { useUI } from '../../context/UIContext';
import { PATHS } from '../../routes/paths';
import { ROLE_LABELS, tripsForCurrentUser } from '../../services/workflow';

/** Travel stats of the signed-in traveler (renderProfilePage stats section). */
function travelerStats(state, session) {
    const userTrips = tripsForCurrentUser(Array.isArray(state.trips) ? state.trips : []);
    const completed = userTrips.filter((t) => t.status === 'completed');
    let totalDays = 0;
    userTrips.forEach((t) => {
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        if (t.startDate && t.endDate && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            totalDays += Math.max(1, Math.round((end - start) / 86400000));
        } else {
            totalDays += Number(t.durationDays) || 3;
        }
    });
    const destinations = new Set();
    userTrips.forEach((t) => {
        const dest = t.destination || t.location || t.packageTitle || '';
        if (dest) destinations.add(dest.split(',')[0].trim());
    });
    const key = String(session.email || '').toLowerCase();
    const name = String(session.name || '').toLowerCase();
    const reviews = (state.reviews || []).filter((r) => (r.author && r.author.toLowerCase() === name) || (r.email && r.email.toLowerCase() === key) || (r.userId && r.userId === session.userId));
    return {
        completed: completed.length || userTrips.length,
        days: totalDays || (userTrips.length ? userTrips.length * 4 : 0),
        countries: destinations.size || (userTrips.length ? 1 : 0),
        reviews: reviews.length,
    };
}

function formFromSession(session) {
    const parts = String(session.name || '').split(' ');
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' '), email: session.email || '', phone: session.phone || '' };
}

function Toggle({ defaultChecked }) {
    return (
        <label className="switch">
            <input type="checkbox" defaultChecked={defaultChecked} />
            <span className="slider" />
        </label>
    );
}

/** traveler_profile.html */
export default function TravelerProfile() {
    const navigate = useNavigate();
    const { toast } = useUI();
    const { session, state, memberSince, save, pickAvatar, onAvatarSelected, fileInput } = useProfile();
    const [form, setForm] = useState(() => formFromSession(session));
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
    const stats = travelerStats(state, session);

    useEffect(() => { setForm(formFromSession(session)); }, [session.name, session.email, session.phone]); // eslint-disable-line react-hooks/exhaustive-deps

    const onSave = () => {
        const email = form.email.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast('Please enter a valid email address.', 'error');
            return;
        }
        save({ name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(), email, phone: form.phone.trim() });
    };

    return (
        <DashboardLayout role="traveler" page="traveler__traveler_profile">
            <div className="page-content">
                <div>
                    <h1>My Profile</h1>
                    <p>Manage your personal information and preferences</p>
                </div>
                <div className="profile-layout">
                    <div className="profile-card">
                        <HiddenFileInput inputRef={fileInput} onChange={onAvatarSelected} />
                        <div className="avatar-wrapper" role="button" tabIndex={0} title="Click to change profile picture" style={{ cursor: 'pointer' }} onClick={pickAvatar}>
                            <SessionAvatar className="profile-avatar" fallback="SJ" />
                            <div className="avatar-edit"><Icon name="camera" /></div>
                        </div>
                        <div className="profile-name">{session.name}</div>
                        <div className="profile-role">{ROLE_LABELS[session.role] || session.role}</div>
                        <div className="verified-badge"><Icon name="check" /> Verified Account</div>
                        <div className="profile-list">
                            <div className="pl-item"><Icon name="mail" className="pl-icon" /> <span>{session.email}</span></div>
                            <div className="pl-item"><Icon name="phone" className="pl-icon" /> <span>{session.phone || 'Not provided'}</span></div>
                            <div className="pl-item"><Icon name="mappin" className="pl-icon" /> New York, USA</div>
                            <div className="pl-item"><Icon name="calendar" className="pl-icon" /> Member Since: {memberSince}</div>
                        </div>
                        <div className="ts-header">Travel Stats</div>
                        <div className="travel-stats-grid">
                            <div className="ts-box blue"><div className="ts-val">{stats.completed}</div><div className="ts-label">Completed Trips</div></div>
                            <div className="ts-box green"><div className="ts-val">{stats.days}</div><div className="ts-label">Total Days</div></div>
                            <div className="ts-box purple"><div className="ts-val">{stats.countries}</div><div className="ts-label">Countries Visited</div></div>
                            <div className="ts-box orange"><div className="ts-val">{stats.reviews}</div><div className="ts-label">Reviews Left</div></div>
                        </div>
                        <SalaryWidget />
                    </div>
                    <div>
                        <div className="form-panel">
                            <div className="fp-header">
                                <div className="fp-title">Personal Information</div>
                                <button type="button" className="btn-fp-edit" onClick={() => navigate(PATHS.traveler.editOngoing)}>Edit</button>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="profile-firstname">First Name</label>
                                    <input type="text" id="profile-firstname" className="form-control" value={form.firstName} onChange={set('firstName')} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="profile-lastname">Last Name</label>
                                    <input type="text" id="profile-lastname" className="form-control" value={form.lastName} onChange={set('lastName')} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="profile-email">Email Address</label>
                                    <input type="email" id="profile-email" className="form-control" value={form.email} onChange={set('email')} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="phone">Phone Number</label>
                                    <input type="tel" name="phone" id="phone" className="form-control" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} maxLength={10} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="profile-dob">Date of Birth</label>
                                    <input id="profile-dob" type="text" className="form-control" defaultValue="15 Jan 1990" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="profile-nationality">Nationality</label>
                                    <select id="profile-nationality" className="form-control" defaultValue="United States">
                                        <option>United States</option>
                                        <option>Canada</option>
                                        <option>United Kingdom</option>
                                    </select>
                                </div>
                                <div className="form-group full">
                                    <label htmlFor="profile-address">Address</label>
                                    <input id="profile-address" type="text" className="form-control" defaultValue="123 Main Street, New York, NY 10001" />
                                </div>
                            </div>
                        </div>
                        <div className="form-panel">
                            <div className="fp-header"><div className="fp-title">Travel Preferences</div></div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="pref-lang">Preferred Language</label>
                                    <select id="pref-lang" className="form-control"><option>English</option><option>French</option><option>Spanish</option></select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="pref-currency">Currency</label>
                                    <select id="pref-currency" className="form-control"><option>USD - US Dollar</option><option>EUR - Euro</option></select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="pref-diet">Diet Requirements</label>
                                    <select id="pref-diet" className="form-control"><option>Dietary</option><option>Vegetarian</option><option>Vegan</option><option>Gluten-Free</option></select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="pref-accom">Accommodation Type</label>
                                    <select id="pref-accom" className="form-control"><option>Hotel</option><option>Resort</option><option>AirBnb</option></select>
                                </div>
                                <div className="form-group full">
                                    <label htmlFor="pref-notes">Special Notes</label>
                                    <input id="pref-notes" type="text" className="form-control" placeholder="e.g. Vegetarian, Gluten-free, etc." />
                                </div>
                            </div>
                        </div>
                        <div className="form-panel">
                            <div className="fp-header"><div className="fp-title">Notification Settings</div></div>
                            <div className="setting-row">
                                <div className="sr-info"><div className="sr-title">Email Notifications</div><div className="sr-desc">Receive trip updates via email.</div></div>
                                <Toggle defaultChecked />
                            </div>
                            <div className="setting-row">
                                <div className="sr-info"><div className="sr-title">SMS Alerts</div><div className="sr-desc">Text messages during your journey.</div></div>
                                <Toggle defaultChecked />
                            </div>
                            <div className="setting-row">
                                <div className="sr-info"><div className="sr-title">Push Notifications</div><div className="sr-desc">System and app notifications.</div></div>
                                <Toggle defaultChecked />
                            </div>
                            <div className="setting-row">
                                <div className="sr-info"><div className="sr-title">Marketing Communications</div><div className="sr-desc">Special offers and updates.</div></div>
                                <Toggle defaultChecked={false} />
                            </div>
                            <div className="action-footer">
                                <button type="button" className="btn-save" onClick={onSave}>Save Changes</button>
                                <button type="button" className="btn-cancel" onClick={() => setForm(formFromSession(session))}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
