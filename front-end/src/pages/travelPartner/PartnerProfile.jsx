import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import HiddenFileInput from '../../components/HiddenFileInput';
import AvailabilityBadge from '../../components/workflow/AvailabilityBadge';
import SalaryWidget from '../../components/workflow/SalaryWidget';
import { SessionAvatar } from '../../components/Header';
import { useUI } from '../../context/UIContext';
import { useProfile } from '../../hooks/useProfile';
import { ROLE_LABELS } from '../../services/workflow';

const AVAILABILITY = [['available', 'Available for new trips'], ['busy', 'Busy (Limited capacity)'], ['unavailable', 'Not accepting new trips']];

function availabilityValue(status) {
    const s = String(status || '').toLowerCase();
    return (AVAILABILITY.find(([value, label]) => value === s || label.toLowerCase().includes(s)) || AVAILABILITY[0])[0];
}

const fromSession = (session, availability) => ({ name: session.name || '', phone: session.phone || '', email: session.email || '', availability: availabilityValue(availability) });

/** travelPartner_profile.html (renderProfilePage + saveUserProfileData). */
export default function PartnerProfile() {
    const { toast } = useUI();
    const { session, state, availability, memberSince, save, pickAvatar, onAvatarSelected, fileInput } = useProfile();
    const [form, setForm] = useState(() => fromSession(session, availability));
    const [agency, setAgency] = useState('');
    const [location, setLocation] = useState('New Delhi, India');
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
    const discard = () => setForm(fromSession(session, availability));

    useEffect(discard, [session.name, session.email, session.phone, availability]); // eslint-disable-line react-hooks/exhaustive-deps

    const onSave = () => {
        const email = form.email.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Please enter a valid email address.', 'error'); return; }
        save({ name: form.name.trim(), email, phone: form.phone.trim(), availability: form.availability });
    };

    const onAvailability = (event) => {
        const value = event.target.value;
        setForm((f) => ({ ...f, availability: value }));
        save({ availability: value });
    };

    return (
        <DashboardLayout role="partner" page="travelPartner__travelPartner_profile">
            <div className="page-content">
                <div className="page-header">
                    <h1 className="text-2xl font-bold text-gray-900">Travel Partner Profile</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your partner information and settings</p>
                </div>
                <div className="split-layout">
                    <div className="profile-summary-card">
                        <HiddenFileInput inputRef={fileInput} onChange={onAvatarSelected} />
                        <div role="button" tabIndex={0} title="Click to change profile picture" style={{ cursor: 'pointer' }} onClick={pickAvatar}>
                            <SessionAvatar className="profile-avatar-large" fallback="D" />
                        </div>
                        <div className="profile-name">{session.name}</div>
                        <div className="profile-role">{ROLE_LABELS[session.role] || 'Travel Partner'}</div>
                        <div className="profile-badges">
                            <AvailabilityBadge status={availability} />
                            <span className="badge badge-blue">Verified</span>
                        </div>
                        <div className="profile-stats">
                            <div className="stat-row"><span className="stat-label">Member Since</span><span className="stat-value">{memberSince}</span></div>
                            <div className="stat-row"><span className="stat-label">Total Managed Trips</span><span className="stat-value">{(state.trips || []).length}</span></div>
                            <div className="stat-row">
                                <span className="stat-label">Partner Rating</span>
                                <span className="stat-value text-amber-500">
                                    4.9{' '}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                </span>
                            </div>
                        </div>
                        <SalaryWidget />
                    </div>
                    <div className="profile-form-card">
                        <div className="form-section-title">Profile Information</div>
                        <form id="profileForm" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="pp-name">Partner Name</label>
                                <input id="pp-name" type="text" className="form-input" placeholder="Your name" value={form.name} onChange={set('name')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="pp-agency">Agency Name</label>
                                <input id="pp-agency" type="text" className="form-input" placeholder="Your agency" value={agency} onChange={(e) => setAgency(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="pp-location">Location</label>
                                <input id="pp-location" type="text" className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="pp-phone">Contact Number</label>
                                <input id="pp-phone" type="text" className="form-input" placeholder="Your phone" value={form.phone} onChange={set('phone')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="pp-email">Email Address</label>
                                <input id="pp-email" type="email" className="form-input" placeholder="Your email" value={form.email} onChange={set('email')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="pp-avail">Availability Status</label>
                                <select id="pp-avail" className="form-select" value={form.availability} onChange={onAvailability}>
                                    {AVAILABILITY.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn btn-outline" onClick={discard}>Discard</button>
                                <button type="submit" className="btn-save"><Icon name="save" /> Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
