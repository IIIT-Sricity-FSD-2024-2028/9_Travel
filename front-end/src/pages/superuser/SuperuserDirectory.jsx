import { useState } from 'react';
import DashboardLayout, { useHeaderSearch } from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { EmptyPanel } from '../../components/Loading';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useOperation } from '../../hooks/usePortal';
import {
    acceptedTrips, addGuideRecord, addVendorRecord, assignableGuides, assignableVendors, exportGuidesCsv, exportVendorsCsv, formatDateRange,
    formatMoney, initialsFor, removeDirectoryRecord,
} from '../../services/workflow';

const CONFIG = {
    vendor: {
        page: 'superuser__superuser_vendors', title: 'Vendor Management', subtitle: 'Manage all service vendors and providers', addLabel: 'Add Vendor',
        icon: 'truck', totalLabel: 'Total Vendors', thirdIcon: 'clock', thirdLabel: 'Pending Approval', searchPlaceholder: 'Search by name, email, or services...',
        statusOptions: ['All Status', 'Active', 'Pending', 'Suspended'], secondFilter: ['All Services', 'Transport', 'Equipment', 'Tours', 'Cruise'],
        exportLabel: 'Export Report', containerId: 'sa-vendors-container', noun: 'vendors',
        empty: 'No registered vendors yet. When users create accounts with role Vendor, they will appear here.',
    },
    guide: {
        page: 'superuser__superuser_guides', title: 'Tour Guide Management', subtitle: 'Manage all tour guides and their assignments', addLabel: 'Add Guide',
        icon: 'compass', totalLabel: 'Total Guides', thirdIcon: 'plane', thirdLabel: 'On Tour', searchPlaceholder: 'Search by name, email, or specialty...',
        statusOptions: ['All Status', 'Active', 'On Tour', 'Inactive'], secondFilter: ['All Specializations', 'Cultural Tours', 'Adventure', 'Nature', 'Urban'],
        exportLabel: 'Export Details', containerId: 'sa-guides-container', noun: 'guides',
        empty: 'No registered tour guides yet. When users create accounts with role Tour Guide, they will appear here.',
    },
};

/** Registered users of the role plus records added from this page (state.vendors / state.guides). */
function directoryList(state, kind) {
    const base = kind === 'vendor' ? assignableVendors(state) : assignableGuides(state);
    const extra = (kind === 'vendor' ? state.vendors : state.guides) || [];
    const names = new Set(base.map((r) => String(r.name).toLowerCase()));
    return [...base, ...extra.filter((r) => r && !names.has(String(r.name).toLowerCase()))];
}

const isActive = (status) => !['inactive', 'suspended'].includes(String(status || 'Available').toLowerCase());

/** "Add Vendor" / "Add Guide" form (the original used three window.prompt() calls). */
function AddRecordModal({ kind, onClose, onSave }) {
    const isVendor = kind === 'vendor';
    const [form, setForm] = useState(isVendor ? { name: '', type: 'Transport', location: 'Available on request' } : { name: '', languages: 'English', experience: '1 year' });
    const [error, setError] = useState('');
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const fields = isVendor ? [['name', 'Vendor name'], ['type', 'Service type'], ['location', 'Location']] : [['name', 'Guide name'], ['languages', 'Languages'], ['experience', 'Experience']];
    const submit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('Name is required.'); return; }
        onSave(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || (k === 'type' ? 'Service' : v.trim())])));
    };
    return (
        <div className="sa-modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <form className="sa-modal-container" role="dialog" aria-modal="true" onSubmit={submit} noValidate>
                <div className="sa-modal-header">
                    <h2>{isVendor ? 'Add Vendor' : 'Add Tour Guide'}</h2>
                    <button type="button" className="sa-modal-close" aria-label="Close" onClick={onClose}>&times;</button>
                </div>
                <div className="sa-modal-body">
                    {fields.map(([key, label]) => (
                        <div className="sa-form-group" key={key} style={{ marginBottom: 14 }}>
                            <label className="sa-form-label" htmlFor={`dir-${key}`}>{label}{key === 'name' && <span className="required"> *</span>}</label>
                            <input id={`dir-${key}`} className={`sa-form-control${key === 'name' && error ? ' input-error' : ''}`} value={form[key]} onChange={(e) => { set(key)(e); setError(''); }} />
                            {key === 'name' && error && <div className="error-feedback">{error}</div>}
                        </div>
                    ))}
                    <div className="sa-btn-row">
                        <button type="submit" className="sa-btn-primary">Save</button>
                        <button type="button" className="sa-btn-secondary" onClick={onClose}>Cancel</button>
                    </div>
                </div>
            </form>
        </div>
    );
}

/** superuser_vendors.html / superuser_guides.html (renderSuperuserDirectoryPages). */
function SuperuserDirectory({ kind }) {
    const cfg = CONFIG[kind];
    const isVendor = kind === 'vendor';
    const state = useWorkflowState();
    const { confirm, showDetails } = useUI();
    const operate = useOperation();
    const headerQuery = useHeaderSearch();
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [secondFilter, setSecondFilter] = useState(cfg.secondFilter[0]);
    const [adding, setAdding] = useState(false);

    const records = directoryList(state, kind);
    const trips = acceptedTrips(state);
    const assigned = trips.filter((t) => (isVendor ? t.vendor : t.guide));
    const tripsOf = (r) => assigned.filter((t) => {
        const p = isVendor ? t.vendor : t.guide;
        return p?.id === r.id || p?.name === r.name || String(p?.name || '').toLowerCase() === String(r.name).toLowerCase();
    });
    const avg = records.length ? (records.reduce((s, r) => s + Number(r.rating || 0), 0) / records.length).toFixed(1) : '0';
    const third = isVendor
        ? trips.filter((t) => t.vendor && ['Requested', 'Pending'].includes(t.vendorStatus)).length
        : assigned.filter((t) => t.scheduleStarted && t.status === 'ongoing').length;

    const q = (query || headerQuery).toLowerCase();
    const visible = records.filter((r) => {
        const status = r.status || 'Available';
        const text = `${r.name} ${r.email || ''} ${r.type || ''} ${r.location || ''} ${r.languages || ''} ${r.experience || ''} ${status}`.toLowerCase();
        if (q && !text.includes(q)) return false;
        if (statusFilter === 'Active' && !isActive(status)) return false;
        if (statusFilter === 'On Tour' && !tripsOf(r).some((t) => t.status === 'ongoing')) return false;
        if (!['All Status', 'Active', 'On Tour'].includes(statusFilter) && String(status).toLowerCase() !== statusFilter.toLowerCase()) return false;
        if (secondFilter !== cfg.secondFilter[0] && !text.includes(secondFilter.toLowerCase().split(' ')[0])) return false;
        return true;
    });

    const stats = [
        ['sa-stat-blue', cfg.icon, cfg.totalLabel, records.length],
        ['sa-stat-green', 'checkcircle', 'Active', records.filter((r) => r.status !== 'Inactive').length],
        ['sa-stat-orange', cfg.thirdIcon, cfg.thirdLabel, third],
        ['sa-stat-purple', 'star', 'Avg Rating', avg],
    ];

    const remove = async (record) => {
        const ok = await confirm({ title: isVendor ? 'Remove Vendor' : 'Remove Guide', message: `Remove this ${kind} from the live directory?`, confirmText: 'Remove', tone: 'red' });
        if (ok) operate(() => removeDirectoryRecord(kind, record.id));
    };

    const view = (record) => {
        const list = tripsOf(record);
        const notProvided = 'Not provided';
        const sections = isVendor ? [
            { name: 'Company & Service Details', icon: 'briefcase', data: { 'Vendor Name': record.name, 'Service Type': record.type || 'Travel Services', 'Email Address': record.email || notProvided, 'Phone Number': record.phone || notProvided, 'Base Location': record.location || notProvided, Status: record.status || 'Available' } },
            { name: 'Performance & Rating', icon: 'trending-up', data: { 'Customer Rating': `${Number(record.rating || 0).toFixed(1)} / 5.0 ★`, 'Active Assignments': `${list.length} active trips`, 'Trips Completed': String(record.trips ?? 0) } },
        ] : [
            { name: 'Guide Profile Information', icon: 'user', data: { 'Full Name': record.name, 'Email Address': record.email || notProvided, 'Phone Number': record.phone || notProvided, 'Languages Spoken': record.languages || notProvided, 'Experience Level': record.experience || notProvided, Availability: record.status || 'Available' } },
            { name: 'Performance & Stats', icon: 'star', data: { 'Overall Rating': `${Number(record.rating || 0).toFixed(1)} / 5.0 ★`, 'Active Tours': `${list.length} active tours`, 'Completed Tours': `${Number(record.tours || 0)} completed tours` } },
        ];
        if (list.length) {
            sections.push({
                name: isVendor ? `Assigned Trips (${list.length})` : `Assigned Tours (${list.length})`,
                icon: isVendor ? 'plane' : 'map',
                data: Object.fromEntries(list.slice(0, 5).map((t) => [isVendor ? `Trip #${t.id}` : `Tour #${t.id}`, `${t.title || t.destination} (${t.travelerName || 'Traveler'}) — ${isVendor ? formatMoney(Number(t.budget || 0)) : formatDateRange(t)}`])),
            });
        }
        showDetails(isVendor ? `Vendor Profile — ${record.name}` : `Tour Guide Profile — ${record.name}`, sections);
    };

    const save = (data) => operate(() => {
        if (isVendor) addVendorRecord(data);
        else addGuideRecord(data);
        setAdding(false);
    });

    return (
        <DashboardLayout role="superuser" page={cfg.page}>
            <div className="sa-dashboard-container sa-dashboard">
                <div className="sa-page-header">
                    <div><h1>{cfg.title}</h1><p>{cfg.subtitle}</p></div>
                    <button type="button" className="sa-btn-primary" id={isVendor ? 'sa-add-vendor-btn' : 'sa-add-guide-btn'} onClick={() => setAdding(true)}><Icon name="plus" /> {cfg.addLabel}</button>
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
                            <input type="text" placeholder={cfg.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
                        </div>
                    </div>
                    <div className="sa-filter-right">
                        <select className="sa-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status">
                            {cfg.statusOptions.map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <select className="sa-select" value={secondFilter} onChange={(e) => setSecondFilter(e.target.value)} aria-label={isVendor ? 'Service' : 'Specialization'}>
                            {cfg.secondFilter.map((o) => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
                <div className="sa-table-toolbar">
                    <button type="button" className="sa-btn-outline-sm" onClick={() => (isVendor ? exportVendorsCsv(state) : exportGuidesCsv(state))}><Icon name="clouddownload" /> {cfg.exportLabel}</button>
                    <span className="sa-table-count">Showing {visible.length} of {records.length} {cfg.noun}</span>
                </div>
                <div className="sa-vendor-cards-grid" id={cfg.containerId}>
                    {visible.length ? visible.map((r) => {
                        const count = tripsOf(r).length;
                        const status = r.status || 'Available';
                        return (
                            <div className={`sa-vcard${isVendor ? '' : ' sa-guide-card'}`} key={r.id || r.name}>
                                <div className="sa-vcard-header">
                                    <div className="sa-vcard-avatar" style={{ background: isVendor ? '#2563eb' : '#7c3aed' }}>{r.initials || initialsFor(r.name)}</div>
                                    <div className="sa-vcard-info">
                                        <h3>{r.name}</h3>
                                        <div className="sa-vcard-badges">
                                            <span className="sa-vb-active">{status}</span>
                                            {isVendor ? <span className="sa-vb-service">{r.type || 'Service'}</span> : <span className="sa-vb-specialty">{r.experience || 'Experience pending'}</span>}
                                        </div>
                                    </div>
                                    <input type="checkbox" className="sa-vcard-check" aria-label={`Select ${r.name}`} />
                                </div>
                                <div className="sa-vcard-body">
                                    {isVendor ? (
                                        <>
                                            <div className="sa-vcard-detail"><Icon name="briefcase" /> {r.type || 'Service'}</div>
                                            <div className="sa-vcard-detail"><Icon name="mappin" /> {r.location || 'Location pending'}</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="sa-vcard-detail"><Icon name="message" /> {r.languages || 'Languages pending'}</div>
                                            <div className="sa-vcard-detail"><Icon name="calendar" /> {r.experience || 'Experience pending'}</div>
                                        </>
                                    )}
                                    <div className="sa-vcard-detail"><Icon name="star" /> {Number(r.rating || 0).toFixed(1)}/5</div>
                                </div>
                                <div className="sa-vcard-stats">
                                    <div className="sa-vcard-stat"><div className="sa-vs-label">{isVendor ? 'Trips' : 'Active Trips'}</div><div className="sa-vs-value">{count}</div></div>
                                    <div className="sa-vcard-stat"><div className="sa-vs-label">{isVendor ? 'Status' : 'Completed'}</div><div className="sa-vs-value">{isVendor ? status : Number(r.tours || 0)}</div></div>
                                </div>
                                <div className="sa-vcard-footer">
                                    <button type="button" className="sa-vf-btn sa-vf-view" onClick={() => view(r)}><Icon name="eye" /> View</button>
                                    <button type="button" className="sa-vf-btn sa-vf-delete" title={`Remove ${kind}`} onClick={() => remove(r)}><Icon name="trash" /></button>
                                </div>
                            </div>
                        );
                    }) : <EmptyPanel message={records.length ? `No ${cfg.noun} match the current filters.` : cfg.empty} />}
                </div>
            </div>
            {adding && <AddRecordModal kind={kind} onClose={() => setAdding(false)} onSave={save} />}
        </DashboardLayout>
    );
}

export const SuperuserVendors = () => <SuperuserDirectory kind="vendor" />;
export const SuperuserGuides = () => <SuperuserDirectory kind="guide" />;
