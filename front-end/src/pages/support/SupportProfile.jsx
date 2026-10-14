import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import HiddenFileInput from '../../components/HiddenFileInput';
import AvailabilityBadge from '../../components/workflow/AvailabilityBadge';
import SalaryWidget from '../../components/workflow/SalaryWidget';
import { SessionAvatar } from '../../components/Header';
import { useUI } from '../../context/UIContext';
import { usePasswordChange } from '../../hooks/usePasswordChange';
import { useProfile } from '../../hooks/useProfile';
import { ROLE_LABELS } from '../../services/workflow';

const SHIFTS = ['Active (On Duty)', 'On Call', 'Off Duty'];
const DEPARTMENTS = ['Emergency & Incident Response', 'Customer Care', 'Partner Coordination', 'Technical Support'];

function shiftValue(status) {
    const s = String(status || '').toLowerCase();
    return SHIFTS.find((o) => o.toLowerCase() === s || o.toLowerCase().includes(s)) || SHIFTS[0];
}

const fromSession = (session, availability) => ({ name: session.name || '', email: session.email || '', phone: session.phone || '', shift: shiftValue(availability) });

/** support/profile.html (renderProfilePage + profile form submit). */
export default function SupportProfile() {
    const { toast } = useUI();
    const { session, state, availability, memberSince, save, pickAvatar, onAvatarSelected, fileInput } = useProfile();
    const { change: changePassword, saving } = usePasswordChange();
    const [form, setForm] = useState(() => fromSession(session, availability));
    const [department, setDepartment] = useState(DEPARTMENTS[0]);
    const [scope, setScope] = useState('Emergency escalation management, flight/hotel rebooking support, vendor resolution');
    const [passwords, setPasswords] = useState({ current: '', next: '' });
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
    const resolvedTickets = (state.issues || []).filter((i) => i.status === 'Resolved').length;

    const reset = () => {
        setForm(fromSession(session, availability));
        setPasswords({ current: '', next: '' });
    };
    useEffect(reset, [session.name, session.email, session.phone, availability]); // eslint-disable-line react-hooks/exhaustive-deps

    const onSubmit = async (event) => {
        event.preventDefault();
        const email = form.email.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Please enter a valid email address.', 'error'); return; }
        if (passwords.current || passwords.next) {
            const changed = await changePassword(passwords.current, passwords.next);
            if (!changed) return;
            setPasswords({ current: '', next: '' });
        }
        save({ name: form.name.trim(), email, phone: form.phone.trim(), availability: form.shift });
    };

    const onShift = (event) => {
        const value = event.target.value;
        setForm((f) => ({ ...f, shift: value }));
        save({ availability: value });
    };

    return (
        <DashboardLayout role="support" page="support__profile">
            <div className="dashboard-container">
                <div className="page-header" style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #0f172a)', marginBottom: 4 }}>Support Executive Profile</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary, #64748b)' }}>Manage your account details, shift availability, and incident coordination settings</p>
                </div>
                <div className="split-layout">
                    <div className="profile-summary-card">
                        <HiddenFileInput inputRef={fileInput} onChange={onAvatarSelected} />
                        <div role="button" tabIndex={0} title="Click to change profile picture" style={{ cursor: 'pointer' }} onClick={pickAvatar}>
                            <SessionAvatar className="profile-avatar-large" fallback="M" />
                        </div>
                        <div className="profile-name">{session.name}</div>
                        <div className="profile-role">{ROLE_LABELS[session.role] || 'Support Executive'}</div>
                        <div className="profile-badges">
                            <AvailabilityBadge status={availability} pill />
                            <span className="badge-pill badge-cyan"><Icon name="shield" /> Incident Lead</span>
                        </div>
                        <div className="profile-stats">
                            <div className="stat-row"><span className="stat-label">Member Since</span><span className="stat-value">{memberSince}</span></div>
                            <div className="stat-row"><span className="stat-label">Resolved Tickets</span><span className="stat-value" style={{ color: '#06b6d4' }}>{resolvedTickets}</span></div>
                            <div className="stat-row"><span className="stat-label">Avg Response Time</span><span className="stat-value">&lt; 3 mins</span></div>
                            <div className="stat-row"><span className="stat-label">Rating</span><span className="stat-value" style={{ color: '#f59e0b' }}>4.9 ★</span></div>
                        </div>
                        <SalaryWidget />
                    </div>
                    <div className="profile-form-card">
                        <div className="form-section-title"><Icon name="user" /> Personal &amp; Operational Details</div>
                        <form id="supportProfileForm" onSubmit={onSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="profile-name-input">Full Name</label>
                                    <input type="text" className="form-input" id="profile-name-input" placeholder="Your name" value={form.name} onChange={set('name')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="profile-role-input">Role Title</label>
                                    <input type="text" className="form-input" id="profile-role-input" value={ROLE_LABELS[session.role] || 'Support Executive'} readOnly />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="profile-email-input">Email Address</label>
                                    <input type="email" className="form-input" id="profile-email-input" placeholder="Your email" value={form.email} onChange={set('email')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="profile-phone-input">Emergency Phone Hotline</label>
                                    <input type="text" className="form-input" id="profile-phone-input" placeholder="Your phone" value={form.phone} onChange={set('phone')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="profile-dept-select">Department</label>
                                    <select className="form-select" id="profile-dept-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
                                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="profile-shift-select">Shift Status</label>
                                    <select className="form-select" id="profile-shift-select" value={form.shift} onChange={onShift}>
                                        {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label" htmlFor="profile-scope">Specialization / Operational Scope</label>
                                    <input id="profile-scope" type="text" className="form-input" value={scope} onChange={(e) => setScope(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-section-title" style={{ marginTop: 28 }}><Icon name="lock" /> Account Security &amp; Password</div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="sp-current">Current Password</label>
                                    <input id="sp-current" type="password" className="form-input" placeholder="••••••••" autoComplete="current-password" value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="sp-new">New Password</label>
                                    <input id="sp-new" type="password" className="form-input" placeholder="Enter new password" autoComplete="new-password" value={passwords.next} onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-outline" onClick={reset}>Cancel</button>
                                <button type="submit" className="btn-save" id="btn-save-profile" disabled={saving}>
                                    <Icon name="checkcircle" /> {saving ? 'Saving...' : 'Save Profile Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
