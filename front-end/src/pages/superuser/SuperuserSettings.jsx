import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import HiddenFileInput from '../../components/HiddenFileInput';
import { SessionAvatar } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useUI } from '../../context/UIContext';
import { usePasswordChange } from '../../hooks/usePasswordChange';
import { useLogout, useOperation } from '../../hooks/usePortal';
import { useProfile } from '../../hooks/useProfile';
import { usersApi } from '../../services/api';
import { getSelectedCurrency, setSelectedCurrency } from '../../services/workflow';

const ROLES = [
    ['SU', 'Super User', 'Full system access and control', [['check', 'Users'], ['check', 'Settings'], ['check', 'Finance']]],
    ['TP', 'Travel Partner', 'Manage settings, agents and guides', [['check', 'Staff'], ['check', 'Build'], ['x', 'Finance']]],
    ['V', 'Vendor', 'Manage services and bookings', [['check', 'Build'], ['x', 'Finance']]],
    ['TG', 'Tour Guide', 'Manage assigned trips', [['check', 'Build'], ['x', 'Finance']]],
    ['SE', 'Support Executive', 'Resolve support requests', [['check', 'Build'], ['x', 'Finance']]],
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** superuser_settings.html (profile, password, appearance, currency, danger zone). */
export default function SuperuserSettings() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const { toast, confirm } = useUI();
    const operate = useOperation();
    const doLogout = useLogout();
    const { session, save, pickAvatar, onAvatarSelected, fileInput } = useProfile();
    const { change: changePassword, saving } = usePasswordChange();
    const [profile, setProfile] = useState({ name: session.name || '', email: session.email || '' });
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
    const [currency, setCurrency] = useState(getSelectedCurrency());

    useEffect(() => { setProfile({ name: session.name || '', email: session.email || '' }); }, [session.name, session.email]);

    const saveProfile = () => {
        if (!profile.name.trim()) { toast('Full name is required.', 'warning'); return; }
        if (!EMAIL_RE.test(profile.email.trim())) { toast('Please enter a valid email address.', 'error'); return; }
        save({ name: profile.name.trim(), email: profile.email.trim() });
    };

    const updatePassword = async () => {
        if (!pw.current || !pw.next || !pw.confirm) { toast('Fill in all password fields.', 'warning'); return; }
        if (pw.next !== pw.confirm) { toast('The new passwords do not match.', 'error'); return; }
        if (await changePassword(pw.current, pw.next)) setPw({ current: '', next: '', confirm: '' });
    };

    const deleteAccount = async () => {
        if (session.id === 'USER-1' || String(session.email).toLowerCase() === 'superadmin@gmail.com') {
            toast('The root Super Admin account cannot be deleted.', 'warning');
            return;
        }
        const ok = await confirm({ title: 'Delete Account', message: 'Are you sure you want to permanently delete this account? This action cannot be undone.', confirmText: 'Delete', tone: 'red' });
        if (!ok) return;
        operate(async () => {
            try {
                await usersApi.remove(session.id || session.email);
                toast('Account deleted.', 'error');
                logout();
                navigate('/login', { replace: true });
            } catch (err) {
                toast(`Delete failed: ${err.message}`, 'error');
            }
        });
    };

    return (
        <DashboardLayout role="superuser" page="superuser__superuser_settings">
            <div className="sa-dashboard-container sa-dashboard">
                <div>
                    <h1>Settings</h1>
                    <p>Manage your account and platform preferences.</p>
                </div>
                <div className="settings-grid">
                    <div>
                        <div className="settings-section sa-profile-section">
                            <div className="settings-header">
                                <div className="sh-icon bg-blue"><Icon name="user" /></div>
                                <div><div className="sh-title">Profile Settings</div><div className="sh-desc">Update your personal information</div></div>
                            </div>
                            <div className="settings-body">
                                <HiddenFileInput inputRef={fileInput} onChange={onAvatarSelected} />
                                <div>
                                    <SessionAvatar className="profile-avatar" fallback="SA" style={{ width: 48, height: 48, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }} />
                                    <div>
                                        <div>Profile Picture</div>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>JPEG or PNG. Max size 5MB</div>
                                        <button className="btn btn-outline" data-action="upload-avatar" type="button" style={{ marginTop: 4 }} onClick={pickAvatar}>Upload Avatar</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="ss-name">Full Name</label>
                                    <input id="ss-name" type="text" className="form-input" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="ss-email">Email Address</label>
                                    <input id="ss-email" type="email" className="form-input" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                                </div>
                                <button className="btn btn-primary" type="button" onClick={saveProfile}>Save Changes</button>
                            </div>
                        </div>

                        <div className="settings-section">
                            <div className="settings-header">
                                <div className="sh-icon bg-green"><Icon name="lock" /></div>
                                <div><div className="sh-title">Account Settings</div><div className="sh-desc">Change your password</div></div>
                            </div>
                            <div className="settings-body">
                                {[['current', 'Current Password', 'Enter current password', 'current-password'], ['next', 'New Password', 'Enter new password', 'new-password'], ['confirm', 'Confirm New Password', 'Re-enter new password', 'new-password']].map(([key, label, ph, ac]) => (
                                    <div className="form-group" key={key}>
                                        <label className="form-label" htmlFor={`ss-pw-${key}`}>{label}</label>
                                        <input id={`ss-pw-${key}`} type="password" className="form-input" placeholder={ph} autoComplete={ac} value={pw[key]} onChange={(e) => setPw((p) => ({ ...p, [key]: e.target.value }))} />
                                    </div>
                                ))}
                                <button type="button" className="btn btn-green" disabled={saving} onClick={updatePassword}>{saving ? 'Updating...' : 'Update Password'}</button>
                            </div>
                        </div>

                        <div className="settings-section">
                            <div className="settings-header">
                                <div className="sh-icon bg-purple"><Icon name="sun" /></div>
                                <div><div className="sh-title">Appearance Settings</div><div className="sh-desc">Custom to your interface theme</div></div>
                            </div>
                            <div className="settings-body">
                                <div className="theme-grid">
                                    <div role="button" tabIndex={0} className={`theme-btn theme-light${theme !== 'dark' ? ' active' : ''}`} onClick={() => setTheme('light', true)}>
                                        <div className="theme-card-top"><div /></div>
                                        <div className="theme-card-bottom">Light Theme {theme !== 'dark' && <Icon name="check" className="theme-active-icon" />}</div>
                                    </div>
                                    <div role="button" tabIndex={0} className={`theme-btn theme-dark${theme === 'dark' ? ' active' : ''}`} onClick={() => setTheme('dark', true)}>
                                        <div className="theme-card-top"><div /></div>
                                        <div className="theme-card-bottom">Dark Theme {theme === 'dark' && <Icon name="check" className="theme-active-icon" />}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="settings-section">
                            <div className="settings-header">
                                <div className="sh-icon bg-green" style={{ background: '#dcfce7', color: '#15803d' }}><Icon name="dollar" /></div>
                                <div><div className="sh-title">Currency &amp; Regional Settings</div><div className="sh-desc">Select default display currency for pricing and budgets</div></div>
                            </div>
                            <div className="settings-body">
                                <div className="form-group" style={{ maxWidth: 320 }}>
                                    <label className="form-label" htmlFor="currency-select" style={{ fontWeight: 700 }}>Default Display Currency</label>
                                    <select id="currency-select" className="form-input" style={{ padding: '10px 14px', borderRadius: 10, width: '100%' }} value={currency} onChange={(e) => { setCurrency(e.target.value); setSelectedCurrency(e.target.value); }}>
                                        <option value="INR">Indian Rupee (₹ / INR)</option>
                                        <option value="USD">US Dollar ($ / USD)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="settings-section sa-danger-zone">
                            <div className="settings-header">
                                <div className="sh-icon bg-red"><Icon name="alertcircle" /></div>
                                <div><div className="sh-title">Danger Zone</div><div className="sh-desc">Irreversible and destructive actions</div></div>
                            </div>
                            <div className="settings-body">
                                <div>
                                    <div><div>Delete Account</div><div>Permanently delete your account and all associated data. This action cannot be undone.</div></div>
                                    <button type="button" className="btn btn-outline-red" onClick={deleteAccount}>Delete Account</button>
                                </div>
                                <div>
                                    <div><div>Logout</div><div>Sign out of your account on this device.</div></div>
                                    <button type="button" className="btn btn-outline logout" onClick={doLogout}><Icon name="logout" /> Logout</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="settings-section">
                            <div className="settings-header">
                                <div className="sh-icon bg-blue"><Icon name="shield" /></div>
                                <div><div className="sh-title">Role &amp; Access</div><div className="sh-desc">User roles and permissions</div></div>
                            </div>
                            <div className="settings-body">
                                {ROLES.map(([abbr, name, desc, badges]) => (
                                    <div className="role-item" key={name}>
                                        <div><div>{abbr}</div><div>{name}</div></div>
                                        <div>{desc}</div>
                                        <div className="role-badges">
                                            {badges.map(([icon, label]) => <div className="role-badge" key={label}><Icon name={icon} /> {label}</div>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
