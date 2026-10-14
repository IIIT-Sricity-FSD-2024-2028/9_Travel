import { useEffect, useState } from 'react';
import DashboardLayout, { useHeaderSearch } from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useOperation } from '../../hooks/usePortal';
import { partnerApplicationsApi } from '../../services/api';
import { formatDate } from '../../services/workflow';

const STATUS_FILTERS = ['All Status', 'PENDING', 'APPROVED', 'REJECTED'];
const ROLE_FILTERS = ['All Roles', 'Tour Guide', 'Vendor'];

export default function SuperuserPartnerApplications() {
    const { toast, confirm, prompt } = useUI();
    const operate = useOperation();
    const headerQuery = useHeaderSearch();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [roleFilter, setRoleFilter] = useState('All Roles');
    const [selectedApp, setSelectedApp] = useState(null);

    const loadApplications = async () => {
        setLoading(true);
        setError('');
        try {
            const list = await partnerApplicationsApi.list();
            setApplications(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.message || 'Failed to load partner applications.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApplications();
    }, []);

    const q = (query || headerQuery).toLowerCase();
    const visible = applications.filter((app) => {
        const text = `${app.applicantName} ${app.businessName} ${app.email} ${app.phone} ${app.requestedRole} ${app.status}`.toLowerCase();
        return (
            (!q || text.includes(q)) &&
            (statusFilter === 'All Status' || app.status === statusFilter) &&
            (roleFilter === 'All Roles' || app.requestedRole === roleFilter)
        );
    });

    const countStatus = (s) => applications.filter((a) => a.status === s).length;

    const onApprove = async (app) => {
        const ok = await confirm({
            title: 'Approve Business Partner',
            message: `Approve application for ${app.applicantName} (${app.businessName}) as ${app.requestedRole}? This will activate their account and grant dashboard access.`,
            confirmText: 'Approve Account',
            tone: 'green',
        });
        if (!ok) return;

        operate(async () => {
            try {
                await partnerApplicationsApi.approve(app.id);
                toast(`Application for ${app.applicantName} approved and account activated!`, 'success');
                await loadApplications();
                if (selectedApp && selectedApp.id === app.id) {
                    setSelectedApp((prev) => ({ ...prev, status: 'APPROVED' }));
                }
            } catch (err) {
                toast(err.message || 'Failed to approve application', 'error');
            }
        });
    };

    const onReject = async (app) => {
        const reason = await prompt({
            title: 'Reject Partner Application',
            message: `Provide a reason for rejecting the application from ${app.applicantName} (${app.businessName}):`,
            placeholder: 'Reason for rejection (e.g. Incomplete verification documents)',
            defaultValue: 'Application does not meet platform requirements.',
            confirmText: 'Reject Application',
            tone: 'red',
        });
        if (reason === null) return; // user cancelled

        operate(async () => {
            try {
                await partnerApplicationsApi.reject(app.id, reason);
                toast(`Application for ${app.applicantName} marked as REJECTED.`, 'info');
                await loadApplications();
                if (selectedApp && selectedApp.id === app.id) {
                    setSelectedApp((prev) => ({ ...prev, status: 'REJECTED', rejectionReason: reason }));
                }
            } catch (err) {
                toast(err.message || 'Failed to reject application', 'error');
            }
        });
    };

    const stats = [
        ['sa-stat-blue', 'clipboard', 'Total Applications', applications.length],
        ['sa-stat-orange', 'clock', 'Pending Review', countStatus('PENDING')],
        ['sa-stat-green', 'checkcircle', 'Approved Partners', countStatus('APPROVED')],
        ['sa-stat-red', 'xcircle', 'Rejected', countStatus('REJECTED')],
    ];

    return (
        <DashboardLayout role="superuser" page="superuser__superuser_users">
            <div className="sa-dashboard-container sa-dashboard">
                <div className="sa-page-header">
                    <div>
                        <h1>Business Partner Applications</h1>
                        <p>Review, verify, and approve Tour Guide and Vendor partner registrations</p>
                    </div>
                    <div>
                        <button type="button" className="sa-btn-primary" onClick={loadApplications}>
                            <Icon name="refresh" /> Refresh Applications
                        </button>
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
                            <input
                                type="text"
                                placeholder="Search by name, business, or email..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="sa-filter-right">
                        <select className="sa-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Role Filter">
                            {ROLE_FILTERS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select className="sa-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status Filter">
                            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="sa-table-toolbar">
                    <span className="sa-table-count">
                        {loading ? 'Loading applications...' : error ? `Error: ${error}` : `Showing ${visible.length} of ${applications.length} applications`}
                    </span>
                </div>

                <div className="sa-table-wrapper">
                    <table className="sa-table">
                        <thead>
                            <tr>
                                <th>Applicant &amp; Business</th>
                                <th>Requested Role</th>
                                <th>Contact Info</th>
                                <th>Submitted Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.length ? (
                                visible.map((app) => {
                                    const status = app.status || 'PENDING';
                                    const badgeClass =
                                        status === 'APPROVED' ? 'sa-status-active' :
                                        status === 'REJECTED' ? 'sa-status-suspended' :
                                        'sa-status-inactive';

                                    return (
                                        <tr key={app.id}>
                                            <td>
                                                <div className="sa-user-cell">
                                                    <div className="sa-user-avatar" style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}>
                                                        {app.applicantName ? app.applicantName.slice(0, 2).toUpperCase() : 'BP'}
                                                    </div>
                                                    <div>
                                                        <div className="sa-user-name">{app.applicantName}</div>
                                                        <div className="sa-user-email" style={{ fontWeight: 600, color: '#0369a1' }}>
                                                            🏢 {app.businessName || 'Independent'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`sa-role-badge ${app.requestedRole === 'Tour Guide' ? 'badge-guide' : 'badge-vendor'}`}>
                                                    {app.requestedRole}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="sa-user-contact">
                                                    <div>{app.email}</div>
                                                    <div style={{ fontSize: 11, color: '#64748b' }}>{app.phone}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="sa-contact-loc">{formatDate(app.submittedAt)}</div>
                                            </td>
                                            <td>
                                                <span className={`sa-status-badge ${badgeClass}`}>
                                                    <span className="sa-status-dot" /> {status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="sa-actions-cell">
                                                    <button
                                                        type="button"
                                                        className="sa-btn-icon"
                                                        title="View Application Details"
                                                        onClick={() => setSelectedApp(app)}
                                                    >
                                                        <Icon name="eye" />
                                                    </button>
                                                    {status === 'PENDING' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="sa-btn-icon"
                                                                style={{ color: '#059669' }}
                                                                title="Approve and Activate Account"
                                                                onClick={() => onApprove(app)}
                                                            >
                                                                <Icon name="checkcircle" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="sa-btn-icon sa-btn-icon-danger"
                                                                title="Reject Application"
                                                                onClick={() => onReject(app)}
                                                            >
                                                                <Icon name="xcircle" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {status === 'REJECTED' && (
                                                        <button
                                                            type="button"
                                                            className="sa-btn-icon"
                                                            style={{ color: '#059669' }}
                                                            title="Re-approve Application"
                                                            onClick={() => onApprove(app)}
                                                        >
                                                            <Icon name="checkcircle" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>
                                        {loading ? 'Loading applications...' : 'No business partner applications found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* View Application Detail Modal */}
                {selectedApp && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(15, 23, 42, 0.65)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                            padding: 16,
                        }}
                        onClick={() => setSelectedApp(null)}
                    >
                        <div
                            style={{
                                background: 'var(--card, #ffffff)',
                                border: '1px solid var(--border, #e2e8f0)',
                                borderRadius: 14,
                                width: '100%',
                                maxWidth: 560,
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                                padding: 24,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: 12 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Partner Application Details</h3>
                                    <span style={{ fontSize: 12, color: '#64748b' }}>ID: {selectedApp.id}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedApp(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748b' }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13, marginBottom: 18 }}>
                                <div>
                                    <strong style={{ display: 'block', color: '#64748b', fontSize: 11 }}>APPLICANT NAME</strong>
                                    <span>{selectedApp.applicantName}</span>
                                </div>
                                <div>
                                    <strong style={{ display: 'block', color: '#64748b', fontSize: 11 }}>BUSINESS / AGENCY</strong>
                                    <span>{selectedApp.businessName || '-'}</span>
                                </div>
                                <div>
                                    <strong style={{ display: 'block', color: '#64748b', fontSize: 11 }}>REQUESTED ROLE</strong>
                                    <span style={{ fontWeight: 700, color: '#0284c7' }}>{selectedApp.requestedRole}</span>
                                </div>
                                <div>
                                    <strong style={{ display: 'block', color: '#64748b', fontSize: 11 }}>STATUS</strong>
                                    <span style={{ fontWeight: 700, color: selectedApp.status === 'APPROVED' ? '#059669' : selectedApp.status === 'REJECTED' ? '#dc2626' : '#d97706' }}>
                                        {selectedApp.status}
                                    </span>
                                </div>
                                <div>
                                    <strong style={{ display: 'block', color: '#64748b', fontSize: 11 }}>EMAIL</strong>
                                    <span>{selectedApp.email}</span>
                                </div>
                                <div>
                                    <strong style={{ display: 'block', color: '#64748b', fontSize: 11 }}>PHONE</strong>
                                    <span>{selectedApp.phone}</span>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <strong style={{ display: 'block', color: '#64748b', fontSize: 11 }}>OPERATING ADDRESS / LOCATION</strong>
                                    <span>{selectedApp.address || 'Not specified'}</span>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <strong style={{ display: 'block', color: '#64748b', fontSize: 11 }}>BUSINESS &amp; SERVICE DETAILS</strong>
                                    <p style={{ margin: '4px 0 0', background: 'var(--bg-card-alt, #f8fafc)', padding: 10, borderRadius: 8, fontSize: 12 }}>
                                        {selectedApp.businessDetails || 'None provided'}
                                    </p>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <strong style={{ display: 'block', color: '#64748b', fontSize: 11 }}>VERIFICATION / LICENSE INFO</strong>
                                    <p style={{ margin: '4px 0 0', background: 'var(--bg-card-alt, #f8fafc)', padding: 10, borderRadius: 8, fontSize: 12 }}>
                                        {selectedApp.verificationInfo || 'None provided'}
                                    </p>
                                </div>
                                {selectedApp.rejectionReason && (
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <strong style={{ display: 'block', color: '#dc2626', fontSize: 11 }}>REJECTION REASON</strong>
                                        <p style={{ margin: '4px 0 0', background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 8, fontSize: 12 }}>
                                            {selectedApp.rejectionReason}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: 14 }}>
                                <button
                                    type="button"
                                    className="sa-btn-outline-sm"
                                    onClick={() => setSelectedApp(null)}
                                >
                                    Close
                                </button>
                                {selectedApp.status === 'PENDING' && (
                                    <>
                                        <button
                                            type="button"
                                            className="sa-btn-icon-danger"
                                            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            onClick={() => onReject(selectedApp)}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            type="button"
                                            className="sa-btn-primary"
                                            onClick={() => onApprove(selectedApp)}
                                        >
                                            Approve &amp; Activate Account
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
