import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import HiddenFileInput from '../../components/HiddenFileInput';
import AvailabilityBadge from '../../components/workflow/AvailabilityBadge';
import SalaryWidget from '../../components/workflow/SalaryWidget';
import { SessionAvatar } from '../../components/Header';
import { useUI } from '../../context/UIContext';
import { useProfile } from '../../hooks/useProfile';
import { ROLE_LABELS, getGuideTrips } from '../../services/workflow';

const DEFAULT_BIO = 'Experienced tour guide specializing in historical and cultural tours across India and Europe. Passionate about sharing local stories and creating memorable experiences.';
const fromSession = (session, availability) => ({ name: session.name || '', email: session.email || '', phone: session.phone || '', availability });

/** guide/profile.html (renderProfilePage + toggleEditMode + saveUserProfileData). */
export default function GuideProfile() {
    const { toast } = useUI();
    const { session, state, availability, memberSince, save, pickAvatar, onAvatarSelected, fileInput } = useProfile();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(() => fromSession(session, availability));
    const [extra, setExtra] = useState({ languages: 'English, Hindi, Spanish', specialization: 'Historical Tours', experience: '8', bio: DEFAULT_BIO });
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
    const setX = (key) => (event) => setExtra((f) => ({ ...f, [key]: event.target.value }));

    useEffect(() => {
        if (!editing) setForm(fromSession(session, availability));
    }, [session.name, session.email, session.phone, availability, editing]); // eslint-disable-line react-hooks/exhaustive-deps

    const validEmail = (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const onSubmit = (event) => {
        event.preventDefault();
        if (!validEmail(form.email.trim())) { toast('Please enter a valid email address.', 'error'); return; }
        if (save({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), availability: form.availability })) setEditing(false);
    };

    // Changing the availability saves immediately, like bindProfileAvailabilityEvents().
    const onAvailability = (event) => {
        const value = event.target.value;
        setForm((f) => ({ ...f, availability: value }));
        save({ availability: value });
    };

    const fieldStyle = { cursor: editing ? 'text' : 'default' };

    return (
        <DashboardLayout role="guide" page="guide__profile">
            <div className="page-content">
                <div className="page-header">
                    <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your tour guide profile information</p>
                </div>
                <div className="profile-container">
                    <div className="profile-card">
                        <HiddenFileInput inputRef={fileInput} onChange={onAvatarSelected} />
                        <div role="button" tabIndex={0} title="Click to change profile picture" style={{ cursor: 'pointer' }} onClick={pickAvatar}>
                            <SessionAvatar className="profile-avatar-lg" fallback="PD" />
                        </div>
                        <div className="profile-name">{session.name}</div>
                        <div className="profile-role">{ROLE_LABELS[session.role] || 'Tour Guide'}</div>
                        <div className="profile-badges">
                            <AvailabilityBadge status={availability} />
                            <span className="badge-verified">Verified</span>
                        </div>
                        <div className="profile-stats-list">
                            <div className="stat-item"><span className="label">Experience</span><span className="value">{extra.experience || 8} years</span></div>
                            <div className="stat-item"><span className="label">Tours Completed</span><span className="value">{getGuideTrips(state).length}</span></div>
                            <div className="stat-item"><span className="label">Rating</span><span className="value">4.9 <i>★</i></span></div>
                            <div className="stat-item"><span className="label">Member Since</span><span className="value">{memberSince}</span></div>
                        </div>
                        <SalaryWidget />
                    </div>
                    <div className="info-card">
                        <h2>Profile Information</h2>
                        <form className="form-grid" onSubmit={onSubmit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gp-name">Full Name</label>
                                <input id="gp-name" type="text" className="form-input" placeholder="Your name" disabled={!editing} style={fieldStyle} value={form.name} onChange={set('name')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gp-email">Email</label>
                                <input id="gp-email" type="email" className="form-input" placeholder="Your email" disabled={!editing} style={fieldStyle} value={form.email} onChange={set('email')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gp-phone">Phone Number</label>
                                <input id="gp-phone" type="text" className="form-input" placeholder="Your phone" disabled={!editing} style={fieldStyle} value={form.phone} onChange={set('phone')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gp-langs">Languages</label>
                                <input id="gp-langs" type="text" className="form-input" disabled={!editing} style={fieldStyle} value={extra.languages} onChange={setX('languages')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gp-spec">Specialization</label>
                                <select id="gp-spec" className="form-input" disabled={!editing} style={fieldStyle} value={extra.specialization} onChange={setX('specialization')}>
                                    <option value="Historical Tours">Historical Tours</option>
                                    <option value="City Tours">City Tours</option>
                                    <option value="Adventure">Adventure</option>
                                    <option value="Nature">Nature</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gp-exp">Years of Experience</label>
                                <input id="gp-exp" type="number" className="form-input" min="0" disabled={!editing} style={fieldStyle} value={extra.experience} onChange={setX('experience')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gp-avail">Availability Status</label>
                                <select id="gp-avail" className="form-input" disabled={!editing} style={fieldStyle} value={form.availability} onChange={onAvailability}>
                                    <option value="Available">Available</option>
                                    <option value="Busy">Busy</option>
                                    <option value="On Leave">On Leave</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gp-bio">Bio</label>
                                <textarea id="gp-bio" className="form-textarea" disabled={!editing} style={fieldStyle} value={extra.bio} onChange={setX('bio')} />
                            </div>
                            {!editing ? (
                                <div className="action-container" id="profile-actions-view" style={{ display: 'flex' }}>
                                    <button type="button" className="btn-edit" onClick={() => setEditing(true)}><Icon name="edit" /> Edit Profile</button>
                                </div>
                            ) : (
                                <div className="action-container" id="profile-actions-edit" style={{ display: 'flex' }}>
                                    <button type="submit" className="btn-save"><Icon name="check-circle" /> Save Changes</button>
                                    <button type="button" className="btn-edit" onClick={() => setEditing(false)} style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>Cancel</button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
