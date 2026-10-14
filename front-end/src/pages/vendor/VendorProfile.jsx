import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import HiddenFileInput from '../../components/HiddenFileInput';
import AvailabilityBadge from '../../components/workflow/AvailabilityBadge';
import SalaryWidget from '../../components/workflow/SalaryWidget';
import { SessionAvatar } from '../../components/Header';
import { useUI } from '../../context/UIContext';
import { useProfile } from '../../hooks/useProfile';
import { ROLE_LABELS, getVendorTrips } from '../../services/workflow';

const AVAILABILITY = [['available', 'Available'], ['busy', 'Busy / Fully Booked'], ['offline', 'Offline']];

/** Maps a stored availability ("Available", "busy", ...) to the select's option value. */
function availabilityValue(status) {
    const s = String(status || '').toLowerCase();
    return (AVAILABILITY.find(([value, label]) => value === s || label.toLowerCase().includes(s)) || AVAILABILITY[0])[0];
}

const fromSession = (session, availability) => ({ name: session.name || '', phone: session.phone || '', email: session.email || '', availability: availabilityValue(availability) });

/** vendor_profile.html (renderProfilePage + saveUserProfileData). */
export default function VendorProfile() {
    const { toast } = useUI();
    const { session, state, availability, memberSince, save, pickAvatar, onAvatarSelected, fileInput } = useProfile();
    const [form, setForm] = useState(() => fromSession(session, availability));
    const [serviceType, setServiceType] = useState('transport');
    const [location, setLocation] = useState('Goa, India');
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

    useEffect(() => { setForm(fromSession(session, availability)); }, [session.name, session.email, session.phone, availability]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <DashboardLayout role="vendor" page="vendor__vendor_profile">
            <div className="page-scroll">
                <div className="page-title">
                    <h1>Vendor Profile</h1>
                    <p>Manage your vendor information and settings</p>
                </div>
                <div className="profile-layout">
                    <div className="profile-sidebar">
                        <HiddenFileInput inputRef={fileInput} onChange={onAvatarSelected} />
                        <div role="button" tabIndex={0} title="Click to change profile picture" style={{ cursor: 'pointer' }} onClick={pickAvatar}>
                            <SessionAvatar className="profile-avatar-big" fallback="VN" />
                        </div>
                        <div className="profile-name">{session.name}</div>
                        <div className="profile-role">{ROLE_LABELS[session.role] || 'Vendor'}</div>
                        <div className="profile-badges">
                            <AvailabilityBadge status={availability} />
                            <span className="badge badge-verified">Verified</span>
                        </div>
                        <div className="profile-stats">
                            <div className="stat-row"><span className="stat-label">Member Since</span><span className="stat-value">{memberSince}</span></div>
                            <div className="stat-row"><span className="stat-label">Total Services</span><span className="stat-value">{getVendorTrips(state).length}</span></div>
                            <div className="stat-row"><span className="stat-label">Rating</span><span className="stat-value">4.8 <Icon name="star" className="stat-star" /></span></div>
                        </div>
                        <SalaryWidget />
                    </div>
                    <div className="profile-content">
                        <h2 className="content-title">Profile Information</h2>
                        <div className="form-group">
                            <label className="form-label" htmlFor="vp-name">Vendor Name</label>
                            <input id="vp-name" type="text" className="form-input" placeholder="Your name" value={form.name} onChange={set('name')} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="vp-type">Service Type</label>
                            <select id="vp-type" className="form-input" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                                <option value="transport">Transport</option>
                                <option value="hotel">Hotel Stay</option>
                                <option value="activity">Activity</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="vp-location">Location</label>
                            <input id="vp-location" type="text" className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="vp-phone">Contact Number</label>
                            <input id="vp-phone" type="text" className="form-input" placeholder="Your phone" value={form.phone} onChange={set('phone')} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="vp-email">Email</label>
                            <input id="vp-email" type="email" className="form-input" placeholder="Your email" value={form.email} onChange={set('email')} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="vp-avail">Availability Status</label>
                            <select id="vp-avail" className="form-input" value={form.availability} onChange={onAvailability}>
                                {AVAILABILITY.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn-save" onClick={onSave}><Icon name="save" /> Save Changes</button>
                            <button type="button" className="btn-update" onClick={onSave}><Icon name="edit" /> Update Availability</button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
