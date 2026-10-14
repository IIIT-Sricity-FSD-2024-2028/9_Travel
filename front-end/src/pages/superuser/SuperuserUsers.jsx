import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout, { useHeaderSearch } from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useBackendUsers } from '../../hooks/useBackendUsers';
import { useOperation } from '../../hooks/usePortal';
import { PATHS } from '../../routes/paths';
import { usersApi } from '../../services/api';
import { normRole } from '../../services/session';
import {
    autoAssignTraveler, disburseSalaries, exportUsersCsv, formatDate, getInitials, getRoleBadgeClass, getUserSalary, travelerAssignment,
} from '../../services/workflow';

const SU = PATHS.superuser;
const SALARIED_ROLES = ['Travel Partner', 'Support Executive', 'Support'];
const ROLE_FILTERS = [
    ['All Roles', 'All Roles'],
    ['Employees (Partner & Support)', 'Employees (Partner & Support)'],
    ['Travel Partner', 'Travel Partner'],
    ['Support Executive', 'Support Executive'],
    ['Traveler', 'Traveler'],
    ['Tour Guide', 'Tour Guide'],
    ['Vendor', 'Vendor'],
];
const defaultSalary = (role) => (role === 'Travel Partner' ? 65000 : role === 'Support Executive' ? 45000 : 80000);
const hasValue = (v) => v !== undefined && v !== null && v !== '';

function SalaryCell({ user, onDisburse }) {
    const userSal = getUserSalary(user);
    if (['Super User', 'Super Admin'].includes(user.role)) {
        return <span style={{ fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', padding: '4px 10px', borderRadius: 12, fontSize: 12, border: '1px solid #ddd6fe', display: 'inline-flex', alignItems: 'center', gap: 4 }}>👑 Owner (Platform Profits)</span>;
    }
    if (SALARIED_ROLES.includes(user.role) || hasValue(userSal)) {
        const sal = hasValue(userSal) ? Number(userSal) : (user.role === 'Travel Partner' ? 65000 : 45000);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.875rem' }}>₹{sal.toLocaleString()}/mo</span>
                <button type="button" onClick={() => onDisburse(user, sal)} title="Disburse monthly salary" style={{ padding: '3px 10px', fontSize: 11, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(16,185,129,0.25)' }}>
                    💸 Disburse Salary
                </button>
            </div>
        );
    }
    if (['Vendor', 'Tour Guide'].includes(user.role)) {
        return <span style={{ fontWeight: 600, color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: 12, fontSize: 12 }}>Per-Trip Share</span>;
    }
    return '-';
}

/** superuser_users.html (CRUD.renderUsers + filters + payroll). Users come from GET /users. */
export default function SuperuserUsers() {
    const navigate = useNavigate();
    const { toast, confirm } = useUI();
    const operate = useOperation();
    const headerQuery = useHeaderSearch();
    const { users, loading, error, reloadAll } = useBackendUsers();
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All Roles');
    const [statusFilter, setStatusFilter] = useState('All Status');

    const q = (query || headerQuery).toLowerCase();
    const visible = users.filter((u) => {
        const text = `${u.name} ${u.email} ${u.role} ${u.status || 'Active'} ${u.phone || ''}`.toLowerCase();
        const nr = normRole(u.role);
        const matchesRole =
            roleFilter === 'All Roles'
                ? true
                : roleFilter === 'Employees (Partner & Support)'
                ? (nr === 'partner' || nr === 'support')
                : (u.role === roleFilter || nr === normRole(roleFilter));
        return (!q || text.includes(q))
            && matchesRole
            && (statusFilter === 'All Status' || (u.status || 'Active') === statusFilter);
    });
    const count = (s) => users.filter((u) => (u.status || 'Active') === s).length;

    const setStatus = (user, status) => operate(async () => {
        try {
            await usersApi.update(user.id, { status });
            toast(`User marked ${status}.`, 'success');
            await reloadAll();
        } catch (err) {
            toast(err.message, 'error');
        }
    });

    const remove = async (user) => {
        const ok = await confirm({ title: 'Confirm Deletion', message: `Are you sure you want to permanently delete ${user.name}? This cannot be undone.`, confirmText: 'Delete', tone: 'red' });
        if (!ok) return;
        operate(async () => {
            try {
                await usersApi.remove(user.id);
                toast(`${user.name} deleted successfully.`, 'success');
                await reloadAll();
            } catch (err) {
                toast(`Delete failed: ${err.message}`, 'error');
            }
        });
    };

    const disburseOne = async (user, amount) => {
        const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const ok = await confirm({ title: 'Confirm Salary Dispersal', message: `Disburse ₹${Number(amount).toLocaleString()} monthly salary to ${user.name} for ${month}?`, confirmText: 'Disburse', tone: 'green' });
        if (!ok) return;
        operate(() => {
            disburseSalaries([{ user, amount }]);
            toast(`₹${Number(amount).toLocaleString()} salary disbursed to ${user.name} successfully!`, 'success');
        });
    };

    const runPayroll = async () => {
        const eligible = users.filter((u) => {
            if (u.role === 'Super User' || u.role === 'Super Admin') return false;
            const sal = getUserSalary(u);
            return (u.status || 'Active') === 'Active' && (SALARIED_ROLES.includes(u.role) || Number(sal) > 0);
        });
        if (!eligible.length) { toast('No active salaried employees found for payroll execution.', 'info'); return; }
        const entries = eligible.map((user) => {
            const sal = getUserSalary(user);
            return { user, amount: Number(hasValue(sal) ? sal : defaultSalary(user.role)) || 0 };
        });
        const total = entries.reduce((sum, e) => sum + e.amount, 0);
        const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const ok = await confirm({
            title: '⚡ Run Automated Bulk Payroll',
            message: `Disburse monthly salaries for ${month}? Total salaried employees: ${eligible.length}. Total payroll outflow: ₹${total.toLocaleString()}.`,
            confirmText: 'Run Payroll',
            tone: 'green',
        });
        if (!ok) return;
        operate(() => {
            disburseSalaries(entries);
            toast(`⚡ Bulk Payroll Executed Successfully! Disbursed ₹${total.toLocaleString()} to ${eligible.length} employees for ${month}.`, 'success', 5000);
        });
    };

    const stats = [
        ['sa-stat-blue', 'users', 'Total Users', users.length],
        ['sa-stat-green', 'checkcircle', 'Active Users', count('Active')],
        ['sa-stat-gray', 'clock', 'Inactive Users', count('Inactive')],
        ['sa-stat-red', 'ban', 'Suspended', count('Suspended')],
    ];

    return (
        <DashboardLayout role="superuser" page="superuser__superuser_users">
            <div className="sa-dashboard-container sa-dashboard">
                <div className="sa-page-header">
                    <div>
                        <h1>User Management</h1>
                        <p>Manage all platform users with full control &amp; automated payroll</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" className="sa-btn-primary" onClick={runPayroll} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}><Icon name="dollar" /> ⚡ Run Bulk Payroll</button>
                        <button type="button" className="sa-btn-primary" onClick={() => navigate(SU.addUser)}><Icon name="plus" /> Add User</button>
                    </div>
                </div>
                <div className="sa-stats-grid-4">
                    {stats.map(([cls, icon, label, value]) => (
                        <div className={`sa-stat-card-wide ${cls}`} key={label}>
                            <div className="sa-sw-icon"><Icon name={icon} /></div>
                            <div className="sa-sw-label">{label}</div>
                            <div className="sa-sw-count">{value}</div>
                        </div>
                    ))}
                </div>
                <div className="sa-filter-bar">
                    <div className="sa-filter-left">
                        <div className="sa-search-inner">
                            <Icon name="search" />
                            <input type="text" placeholder="Search by name or email..." id="sa-user-search" value={query} onChange={(e) => setQuery(e.target.value)} />
                        </div>
                    </div>
                    <div className="sa-filter-right">
                        <select className="sa-select" id="sa-role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Role">
                            {ROLE_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <select className="sa-select" id="sa-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status">
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>Suspended</option>
                        </select>
                    </div>
                </div>
                <div className="sa-table-toolbar">
                    <button type="button" className="sa-btn-outline-sm" id="sa-export-users-btn" onClick={() => exportUsersCsv(users)}><Icon name="clouddownload" /> Export CSV</button>
                    <span className="sa-table-count" id="user-count-display">
                        {loading ? 'Syncing with database...' : error ? `Error connecting to database (${error}) — showing cached users` : `Showing ${visible.length} of ${users.length} users`}
                    </span>
                </div>
                <div className="sa-table-wrapper">
                    <table className="sa-table" id="sa-users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Monthly Salary</th>
                                <th>Contact</th>
                                <th>Joined Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="sa-users-body">
                            {visible.length ? visible.map((user) => {
                                const status = user.status || 'Active';
                                const statusClass = status === 'Active' ? 'sa-status-active' : status === 'Suspended' ? 'sa-status-suspended' : 'sa-status-inactive';
                                const asg = user.role === 'Traveler' ? (travelerAssignment(user, users) || autoAssignTraveler(user.id || String(user.email || '').toLowerCase(), users)) : null;
                                return (
                                    <tr key={user.id || user.email} data-role={user.role} data-status={status}>
                                        <td>
                                            <div className="sa-user-cell">
                                                <div className="sa-user-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>{getInitials(user.name)}</div>
                                                <div><div className="sa-user-name">{user.name}</div><div className="sa-user-email">{user.email}</div></div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`sa-role-badge ${getRoleBadgeClass(user.role)}`}>{user.role}</span>
                                            {user.role === 'Traveler' && (
                                                <div style={{ fontSize: 11, marginTop: 4, lineHeight: 1.35 }}>
                                                    <div style={{ color: '#0284c7', fontWeight: 600 }}>Partner: {asg ? asg.partnerName : 'Unassigned'}</div>
                                                    <div style={{ color: '#7c3aed', fontWeight: 600 }}>Support: {asg ? asg.supportName : 'Unassigned'}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td><span className={`sa-status-badge ${statusClass}`} style={status === 'Suspended' ? { background: '#fee2e2', color: '#991b1b' } : undefined}><span className="sa-status-dot" /> {status}</span></td>
                                        <td><div><SalaryCell user={user} onDisburse={disburseOne} /></div></td>
                                        <td><div className="sa-user-contact"><div>{user.phone || '-'}</div></div></td>
                                        <td><div className="sa-contact-loc">{formatDate(user.joined)}</div></td>
                                        <td>
                                            <div className="sa-actions-cell">
                                                <button type="button" className="sa-btn-icon" title="Edit" onClick={() => navigate(`${SU.editUser}?id=${encodeURIComponent(user.id)}`)}><Icon name="edit" /></button>
                                                <button type="button" className="sa-btn-icon" title="Activate" onClick={() => setStatus(user, 'Active')}><Icon name="checkcircle" /></button>
                                                <button type="button" className="sa-btn-icon" title="Inactivate" onClick={() => setStatus(user, 'Inactive')}><Icon name="clock" /></button>
                                                <button type="button" className="sa-btn-icon" title="Suspend" onClick={() => setStatus(user, 'Suspended')}><Icon name="ban" /></button>
                                                <button type="button" className="sa-btn-icon sa-btn-icon-danger" title="Delete" onClick={() => remove(user)}><Icon name="trash" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>{loading ? 'Loading users...' : 'No users found.'}</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
