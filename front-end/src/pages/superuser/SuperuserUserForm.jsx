import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import Loading from '../../components/Loading';
import { useUI } from '../../context/UIContext';
import { useBackendUsers } from '../../hooks/useBackendUsers';
import { useOperation } from '../../hooks/usePortal';
import { PATHS } from '../../routes/paths';
import { usersApi } from '../../services/api';
import { autoAssignTraveler, getUserSalary, rememberUserSalary, saveTravelerAssignment, travelerAssignment } from '../../services/workflow';

const SU = PATHS.superuser;
const ROLES = ['Traveler', 'Travel Partner', 'Vendor', 'Tour Guide', 'Support Executive', 'Super User'];
const EMPTY = { name: '', email: '', phone: '', password: '', role: '', monthlySalary: '', status: 'Active', assignedPartnerId: '', assignedSupportId: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * superuser_add_user.html / superuser_edit_user.html (CRUD.handleFormSubmit + loadRecordForEdit).
 * POST /users and PATCH /users/:id; salary and traveler assignments are kept in the same
 * browser stores the original used (dd_user_salaries_v1, dd_traveler_assignments_v1).
 */
function UserForm({ mode }) {
    const isEdit = mode === 'edit';
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const id = params.get('id');
    const { toast, success } = useUI();
    const operate = useOperation();
    const { users, reloadAll } = useBackendUsers();
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [loadingRecord, setLoadingRecord] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const set = (key) => (event) => { setForm((f) => ({ ...f, [key]: event.target.value })); setErrors((e) => ({ ...e, [key]: '' })); };

    useEffect(() => {
        if (!isEdit) return undefined;
        if (!id) { setLoadingRecord(false); return undefined; }
        let cancelled = false;
        (async () => {
            try {
                const record = await usersApi.get(id);
                if (cancelled || !record) return;
                const sal = getUserSalary(record);
                const asg = travelerAssignment(record, users) || {};
                setForm({
                    ...EMPTY,
                    name: record.name || '',
                    email: record.email || '',
                    phone: record.phone || '',
                    role: record.role || '',
                    status: record.status || 'Active',
                    monthlySalary: sal !== undefined && sal !== null ? String(sal) : '',
                    assignedPartnerId: asg.partnerId || '',
                    assignedSupportId: asg.supportId || '',
                });
            } catch (err) {
                if (!cancelled) toast(`Could not load user ${id}: ${err.message}`, 'error');
            } finally {
                if (!cancelled) setLoadingRecord(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isEdit, id]); // eslint-disable-line react-hooks/exhaustive-deps

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = 'Full name is required.';
        if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';
        if (!isEdit && form.password.length < 3) next.password = 'Password must be at least 3 characters.';
        if (isEdit && form.password && form.password.length < 3) next.password = 'Password must be at least 3 characters.';
        if (!form.role) next.role = 'Select a role.';
        if (form.monthlySalary !== '' && (Number.isNaN(Number(form.monthlySalary)) || Number(form.monthlySalary) < 0)) next.monthlySalary = 'Salary must be a positive number.';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const submit = (event) => {
        event.preventDefault();
        if (!validate()) return;
        operate(async () => {
            const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role, status: form.status };
            if (form.phone.trim()) payload.phone = form.phone.trim();
            if (form.password) payload.password = form.password;
            if (form.monthlySalary !== '') payload.monthlySalary = Number(form.monthlySalary) || 0;
            setSaving(true);
            try {
                const saved = isEdit ? await usersApi.update(id, payload) : await usersApi.create(payload);
                const savedId = saved?.id || id;
                if (form.monthlySalary !== '') rememberUserSalary(savedId, payload.email, payload.monthlySalary);
                const key = savedId || payload.email.toLowerCase();
                if (form.role === 'Traveler') {
                    if (form.assignedPartnerId || form.assignedSupportId) saveTravelerAssignment(key, { partnerId: form.assignedPartnerId, supportId: form.assignedSupportId }, users);
                    else if (!isEdit) autoAssignTraveler(key, users);
                }
                await reloadAll();
                success(isEdit ? 'Updated Successfully' : 'Created Successfully', isEdit ? 'User has been updated! Changes are now live.' : 'New user account created successfully.', () => navigate(SU.users));
            } catch (err) {
                toast(err.message, 'error');
            } finally {
                setSaving(false);
            }
        });
    };

    const partners = users.filter((u) => u.role === 'Travel Partner');
    const supports = users.filter((u) => u.role === 'Support Executive' || u.role === 'Support');
    const fieldError = (key) => (errors[key] ? <div className="error-feedback">{errors[key]}</div> : null);
    const inputClass = (key, base) => `${base}${errors[key] ? ' input-error' : ''}`;

    return (
        <DashboardLayout role="superuser" page={isEdit ? 'superuser__superuser_edit_user' : 'superuser__superuser_add_user'} activeNav={SU.users}>
            <div className="sa-dashboard-container sa-dashboard">
                <div className="sa-form-layout">
                    <div className="sa-form-main">
                        <Link to={SU.users} className="sa-back-link"><Icon name="arrowleft" /> Back to Users</Link>
                        <div className="sa-form-header">
                            <h1>{isEdit ? 'Edit User' : 'Add New User'}</h1>
                            <p>{isEdit ? 'Update user information and permissions' : 'Create a new user account and assign roles'}</p>
                        </div>
                        {loadingRecord ? <Loading message="Loading user record..." /> : (
                            <form id={isEdit ? 'crud-user-edit-form' : 'crud-user-form'} className="sa-form-card" onSubmit={submit} noValidate>
                                <div className="sa-form-group">
                                    <label className="sa-form-label" htmlFor="uf-name">Full Name <span className="required">*</span></label>
                                    <input id="uf-name" type="text" name="name" className={inputClass('name', 'sa-form-control')} placeholder="Enter full name" required value={form.name} onChange={set('name')} />
                                    {fieldError('name')}
                                </div>
                                <div className="sa-form-group">
                                    <label className="sa-form-label" htmlFor="uf-email">Email Address <span className="required">*</span></label>
                                    <input id="uf-email" type="email" name="email" className={inputClass('email', 'sa-form-control')} placeholder="user@example.com" required value={form.email} onChange={set('email')} />
                                    {fieldError('email')}
                                </div>
                                <div className="sa-form-group">
                                    <label className="sa-form-label" htmlFor="uf-phone">Phone Number</label>
                                    <input id="uf-phone" type="text" name="phone" className="sa-form-control" placeholder={isEdit ? '+1 234-567-8901' : '+1 234-567-8900'} value={form.phone} onChange={set('phone')} />
                                </div>
                                <div className="sa-form-group">
                                    <label className="sa-form-label" htmlFor="uf-password">Password {!isEdit && <span className="required">*</span>}</label>
                                    <input id="uf-password" type="password" name="password" className={inputClass('password', 'sa-form-control')} placeholder={isEdit ? 'Leave blank to keep current password' : 'Set login password'} required={!isEdit} minLength={3} autoComplete="new-password" value={form.password} onChange={set('password')} />
                                    {fieldError('password')}
                                    {!isEdit && <div className="sa-form-hint">The user will log in with this email and password</div>}
                                </div>
                                <div className="sa-form-group">
                                    <label className="sa-form-label" htmlFor="uf-role">Role <span className="required">*</span></label>
                                    <select id="uf-role" name="role" className={inputClass('role', 'sa-form-select')} required value={form.role} onChange={set('role')}>
                                        {!isEdit && <option value="" disabled>Select a role</option>}
                                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    {fieldError('role')}
                                    <div className="sa-form-hint">{isEdit ? "Changing the role will update the user's access permissions" : "Select the user's role to determine their access level"}</div>
                                </div>
                                {isEdit && (
                                    <>
                                        <div className="sa-form-group" id="assignedPartnerGroup">
                                            <label className="sa-form-label" htmlFor="assignedPartnerSelect">Assigned Travel Partner (For Traveler)</label>
                                            <select name="assignedPartnerId" id="assignedPartnerSelect" className="sa-form-select" value={form.assignedPartnerId} onChange={set('assignedPartnerId')}>
                                                <option value="">-- Select Travel Partner --</option>
                                                {partners.map((p) => <option key={p.id || p.email} value={p.id || p.email}>{p.name} ({p.email})</option>)}
                                            </select>
                                            <div className="sa-form-hint">Admin can manually re-assign the Travel Partner responsible for this traveler. (Auto load-balanced on signup)</div>
                                        </div>
                                        <div className="sa-form-group" id="assignedSupportGroup">
                                            <label className="sa-form-label" htmlFor="assignedSupportSelect">Assigned Support Executive (For Traveler)</label>
                                            <select name="assignedSupportId" id="assignedSupportSelect" className="sa-form-select" value={form.assignedSupportId} onChange={set('assignedSupportId')}>
                                                <option value="">-- Select Support Executive --</option>
                                                {supports.map((s) => <option key={s.id || s.email} value={s.id || s.email}>{s.name} ({s.email})</option>)}
                                            </select>
                                            <div className="sa-form-hint">Admin can manually re-assign the Support Executive responsible for this traveler. (Auto load-balanced on signup)</div>
                                        </div>
                                    </>
                                )}
                                <div className="sa-form-group">
                                    <label className="sa-form-label" htmlFor="uf-salary">Monthly Salary (₹)</label>
                                    <input id="uf-salary" type="number" name="monthlySalary" className={inputClass('monthlySalary', 'sa-form-control')} placeholder="e.g. 55000 (For Travel Partner / Support Executive)" min="0" step="500" value={form.monthlySalary} onChange={set('monthlySalary')} />
                                    {fieldError('monthlySalary')}
                                    <div className="sa-form-hint">Set fixed monthly salary for salaried employees (Travel Partner, Support Executive). Leave blank for per-trip commission roles.</div>
                                </div>
                                <div className="sa-form-group">
                                    <label className="sa-form-label" htmlFor="uf-status">Account Status</label>
                                    <select id="uf-status" name="status" className="sa-form-select" value={form.status} onChange={set('status')}>
                                        <option value="Active">{isEdit ? 'Active' : 'Active - can login and operate'}</option>
                                        <option value="Inactive">{isEdit ? 'Inactive' : 'Inactive - can login but operations are blocked'}</option>
                                        <option value="Suspended">{isEdit ? 'Suspended' : 'Suspended - cannot login'}</option>
                                    </select>
                                </div>
                                <div className="sa-btn-row">
                                    <button type="submit" className="sa-btn-primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update User' : 'Save User'}</button>
                                    <button type="button" className="sa-btn-secondary" onClick={() => navigate(SU.users)}>Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>
                    <div className="sa-info-card">
                        {isEdit ? (
                            <>
                                <div className="info-title" style={{ color: '#92400e' }}>Important Note</div>
                                <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, margin: 0 }}>Changes to user roles and status will take effect immediately. Make sure to communicate any changes to the user, especially if you&apos;re modifying their access level or deactivating their account.</p>
                            </>
                        ) : (
                            <>
                                <div className="info-title">Role Permissions</div>
                                <ul className="info-list">
                                    <li><strong>Traveler:</strong> Can view and book trips</li>
                                    <li><strong>Travel Partner:</strong> Full trip coordination and vendor management</li>
                                    <li><strong>Vendor:</strong> Manage services and bookings</li>
                                    <li><strong>Tour Guide:</strong> Manage assigned tours and travelers</li>
                                    <li><strong>Support Executive:</strong> Handle customer support requests</li>
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

export const SuperuserAddUser = () => <UserForm mode="add" />;
export const SuperuserEditUser = () => <UserForm mode="edit" />;
