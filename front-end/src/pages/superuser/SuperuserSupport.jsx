import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout, { useHeaderSearch } from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { EmptyPanel } from '../../components/Loading';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { ROLE_LABELS, formatShortDate, initialsFor } from '../../services/workflow';

const SU = PATHS.superuser;
const STAT_CARDS = [
    ['linear-gradient(135deg,#f97316,#ea580c)', 'headphones', 'Support Team'],
    ['linear-gradient(135deg,#22c55e,#16a34a)', 'checkcircle', 'Active Now'],
    ['linear-gradient(135deg,#3b82f6,#2563eb)', 'flag', 'Active Tickets'],
    ['linear-gradient(135deg,#a855f7,#9333ea)', 'clock', 'Resolved'],
];

/** superuser_support.html (renderSuperuserSupport). */
export default function SuperuserSupport() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const headerQuery = useHeaderSearch();
    const [query, setQuery] = useState('');
    const supportUsers = (state.users || []).filter((u) => u.role === ROLE_LABELS.support || u.role === 'Support Executive');
    const issues = state.issues || [];
    const openIssues = issues.filter((i) => i.status !== 'Resolved');
    const resolved = issues.filter((i) => i.status === 'Resolved');
    const values = [supportUsers.length, supportUsers.filter((u) => u.status === 'Active').length, openIssues.length, resolved.length];
    const q = (query || headerQuery).toLowerCase();
    const visible = supportUsers.filter((u) => !q || `${u.name} ${u.email} ${u.phone || ''}`.toLowerCase().includes(q));

    return (
        <DashboardLayout role="superuser" page="superuser__superuser_support">
            <div className="sa-dashboard-container sa-dashboard">
                <div className="page-header">
                    <div><h1>Support Team Management</h1><p>Manage support executives and real support workload</p></div>
                    <button type="button" className="sa-btn-primary" onClick={() => navigate(SU.addUser)}><Icon name="plus" /> Add Executive</button>
                </div>
                <div className="stats-top">
                    {STAT_CARDS.map(([bg, icon, title], i) => (
                        <div className="stat-card" key={title} style={{ background: bg, minHeight: 100 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div className="stat-bottom"><Icon name={icon} /><span className="stat-title">{title}</span></div>
                                <div className="stat-value">{values[i]}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="filter-bar">
                    <div className="search-inner"><Icon name="search" /><input type="text" placeholder="Search support executives..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
                    <div><button type="button" className="btn-primary" style={{ background: 'var(--bg-card-alt, #fff)', color: 'var(--text-primary, #475569)', border: '1px solid var(--border-color, #e2e8f0)' }} onClick={() => navigate(SU.users)}><Icon name="users" /> Manage Users</button></div>
                </div>
                <div className="support-grid">
                    {visible.length ? visible.map((user) => (
                        <div className="support-card" key={user.id || user.email}>
                            <div className="support-header">
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="support-avatar orange">{initialsFor(user.name)}</div>
                                    <div><div className="support-name">{user.name}</div><span className={`support-status${user.status === 'Active' ? ' active' : ''}`}>{user.status || 'Active'}</span></div>
                                </div>
                                <button type="button" className="sa-btn-icon-danger" title="Edit user" onClick={() => navigate(`${SU.editUser}?id=${encodeURIComponent(user.id)}`)}><Icon name="edit" /></button>
                            </div>
                            <div className="support-dept">Support Executive</div>
                            <div className="support-contact">
                                <div><Icon name="mail" /> {user.email}</div>
                                <div><Icon name="phone" /> {user.phone || '-'}</div>
                                <div><Icon name="clock" /> Joined: {formatShortDate(user.joined)}</div>
                            </div>
                            <div className="support-stats-row border-bottom">
                                <div>Open Tickets<span className="val" style={{ color: '#3b82f6' }}>{openIssues.length}</span></div>
                                <div style={{ textAlign: 'right' }}>Resolved<span className="val" style={{ color: '#22c55e' }}>{resolved.length}</span></div>
                            </div>
                            <div className="support-last-active">Live backend user</div>
                            <div className="action-buttons" style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                                <button type="button" className="btn-view" style={{ flex: 1 }} onClick={() => navigate(SU.users)}><Icon name="eye" /> Manage</button>
                            </div>
                        </div>
                    )) : <EmptyPanel message={supportUsers.length ? 'No support executives match your search.' : 'No support executives yet. Add one from User Management.'} />}
                </div>
            </div>
        </DashboardLayout>
    );
}
