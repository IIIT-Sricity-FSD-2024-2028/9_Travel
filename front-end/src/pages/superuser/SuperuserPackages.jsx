import { useRef, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useOperation } from '../../hooks/usePortal';
import { uploadApi } from '../../services/api';
import { DEFAULT_PACKAGE_IMAGE, addPackage, assetUrl, deletePackage, formatMoney, getAllPackages, updatePackage } from '../../services/workflow';

const PRESETS = [
    ['../../images/maldives_package.png', '🏖️ Maldives Ocean Resort'],
    ['../../images/swiss_alps_package.png', '🏔️ Swiss Alps Mountain Lodge'],
    ['../../images/japan_package.png', '⛩️ Japan Cherry Blossom Temple'],
    ['../../images/paris_package.png', '🗼 Paris Romance & Culture'],
    ['../../images/goa_package.png', '🌊 Goa Sun & Beach'],
    ['../../images/rome_package.png', '🏛️ Rome Heritage & Imperial Walk'],
];
const EMPTY = { id: '', title: '', destination: '', budget: '', days: '', description: '', highlights: '', imageUrl: DEFAULT_PACKAGE_IMAGE, imageFit: 'cover' };
const required = <span style={{ color: '#ef4444' }}>*</span>;

/** Create / Edit modal of the Super Admin catalog (#pkgModalBackdrop). Photos go through POST /upload. */
function SuperuserPackageModal({ initial, onClose, onSave }) {
    const { toast } = useUI();
    const [form, setForm] = useState(initial);
    const [tab, setTab] = useState(() => (PRESETS.some(([v]) => v === initial.imageUrl) && initial.id ? 'preset' : /^https?:/i.test(initial.imageUrl) ? 'url' : 'file'));
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const setImage = (url) => setForm((f) => ({ ...f, imageUrl: url || DEFAULT_PACKAGE_IMAGE }));

    const onFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast('Please choose an image file.', 'error'); return; }
        if (file.size > 5 * 1024 * 1024) { toast('The image must be 5MB or smaller.', 'error'); return; }
        setUploading(true);
        try {
            setImage((await uploadApi.upload(file)).url);
        } catch (err) {
            toast(`Photo upload failed: ${err.message}`, 'error');
            if (fileRef.current) fileRef.current.value = '';
        } finally {
            setUploading(false);
        }
    };

    const save = () => {
        const budget = Number(form.budget);
        const days = Number(form.days);
        if (!form.title.trim() || !form.destination.trim() || !budget || !days || !form.description.trim()) {
            toast('Please fill in all required fields (Title, Destination, Budget, Duration, and Description).', 'warning');
            return;
        }
        if (uploading) { toast('Please wait for the photo upload to finish.', 'info'); return; }
        const highlights = form.highlights.trim() ? form.highlights.split(',').map((h) => h.trim()).filter(Boolean) : [`${days} Days stay`, 'Guided tour access'];
        onSave({ ...form, title: form.title.trim(), destination: form.destination.trim(), description: form.description.trim(), budget, days, highlights });
    };

    const tabBtn = (mode, label) => (
        <button type="button" className={`photo-tab-btn${tab === mode ? ' active' : ''}`} onClick={() => { setTab(mode); if (mode === 'preset' && !PRESETS.some(([v]) => v === form.imageUrl)) setImage(PRESETS[0][0]); }}>{label}</button>
    );

    return (
        <div className="modal-backdrop active" id="pkgModalBackdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '0.75rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }} id="modalTitle">{form.id ? `Edit Package (${form.id})` : 'Create New Package'}</h2>
                    <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-secondary, #64748b)', cursor: 'pointer' }}>&times;</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="sa-form-group"><label className="sa-form-label" htmlFor="pkgFormTitle">Package Title {required}</label><input type="text" id="pkgFormTitle" className="sa-form-control" placeholder="e.g. Maldives Escape" value={form.title} onChange={set('title')} /></div>
                    <div className="sa-form-group"><label className="sa-form-label" htmlFor="pkgFormDest">Destination {required}</label><input type="text" id="pkgFormDest" className="sa-form-control" placeholder="e.g. Male, Maldives" value={form.destination} onChange={set('destination')} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="sa-form-group"><label className="sa-form-label" htmlFor="pkgFormBudget">Budget (₹ INR) {required}</label><input type="number" id="pkgFormBudget" className="sa-form-control" placeholder="e.g. 50000" min="0" value={form.budget} onChange={set('budget')} /></div>
                    <div className="sa-form-group"><label className="sa-form-label" htmlFor="pkgFormDays">Duration (Days) {required}</label><input type="number" id="pkgFormDays" className="sa-form-control" placeholder="e.g. 7" min="1" value={form.days} onChange={set('days')} /></div>
                </div>
                <div className="sa-form-group"><label className="sa-form-label" htmlFor="pkgFormDesc">Description {required}</label><textarea id="pkgFormDesc" className="sa-form-control" rows="3" placeholder="Brief summary of the package experience..." value={form.description} onChange={set('description')} /></div>
                <div className="sa-form-group"><label className="sa-form-label" htmlFor="pkgFormHighlights">Key Highlights (Comma separated)</label><input type="text" id="pkgFormHighlights" className="sa-form-control" placeholder="e.g. 7 Days Luxury Resort, Snorkeling pass, Breakfast included" value={form.highlights} onChange={set('highlights')} /></div>
                <div className="sa-form-group" style={{ background: 'var(--bg-card-alt, #f8fafc)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <label className="sa-form-label" style={{ marginBottom: '0.5rem' }}>Package Photo &amp; Image Fit</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {tabBtn('file', '📁 Upload File')}
                        {tabBtn('url', '🔗 Image URL')}
                        {tabBtn('preset', '🖼️ Preset Photos')}
                    </div>
                    {tab === 'file' && <div><input ref={fileRef} type="file" className="sa-form-control" accept="image/*" disabled={uploading} onChange={onFile} aria-label="Upload package photo" />{uploading && <div className="dd-upload-progress">Uploading photo...</div>}</div>}
                    {tab === 'url' && <div><input type="url" className="sa-form-control" placeholder="https://example.com/photo.jpg" value={/^https?:/i.test(form.imageUrl) ? form.imageUrl : ''} onChange={(e) => setImage(e.target.value.trim())} aria-label="Image URL" /></div>}
                    {tab === 'preset' && (
                        <div>
                            <select className="sa-form-select" value={PRESETS.some(([v]) => v === form.imageUrl) ? form.imageUrl : PRESETS[0][0]} onChange={(e) => setImage(e.target.value)} aria-label="Preset photo">
                                {PRESETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #64748b)' }}>
                            Photo Fit Mode:
                            <select className="sa-form-select" value={form.imageFit} onChange={set('imageFit')} style={{ width: 'auto', display: 'inline-block', padding: '4px 8px', fontSize: 12, marginLeft: 6 }} aria-label="Photo fit mode">
                                <option value="cover">Crop &amp; Cover (Fill card)</option>
                                <option value="contain">Fit &amp; Contain (Full picture)</option>
                            </select>
                        </div>
                        <div style={{ width: 70, height: 50, borderRadius: 8, overflow: 'hidden', background: '#0f172a', border: '1px solid #334155' }}>
                            <img id="photoPreviewImg" src={assetUrl(form.imageUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: form.imageFit === 'contain' ? 'contain' : 'cover' }} onError={(e) => { e.currentTarget.src = assetUrl(DEFAULT_PACKAGE_IMAGE); }} />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button type="button" className="sa-btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="button" className="sa-btn-primary" onClick={save}><span id="saveBtnText">{form.id ? 'Save Changes' : 'Create Package'}</span></button>
                </div>
            </div>
        </div>
    );
}

/** superuser_packages.html – Super Admin package catalog management. */
export default function SuperuserPackages() {
    const state = useWorkflowState();
    const { confirm, toast } = useUI();
    const operate = useOperation();
    const [headerQuery, setHeaderQuery] = useState('');
    const [query, setQuery] = useState('');
    const [duration, setDuration] = useState('');
    const [modal, setModal] = useState(null);

    const packages = getAllPackages(state);
    const q = (query || headerQuery).toLowerCase().trim();
    const headerSearch = { value: headerQuery, onChange: setHeaderQuery, placeholder: 'Search packages, destinations...', id: 'header-search-input' };
    const filtered = packages.filter((p) => {
        const days = Number(p.durationDays) || 0;
        const textOk = !q || (p.title || '').toLowerCase().includes(q) || (p.destination || '').toLowerCase().includes(q);
        const durOk = !duration || (duration === '1-5' ? days >= 1 && days <= 5 : duration === '6-8' ? days >= 6 && days <= 8 : days >= 9);
        return textOk && durOk;
    });
    const avg = packages.length ? Math.round(packages.reduce((a, p) => a + (Number(p.budget) || 0), 0) / packages.length) : 0;

    const openEdit = (pkg) => setModal({
        ...EMPTY, id: pkg.id, title: pkg.title || '', destination: pkg.destination || '', budget: String(pkg.budget || ''), days: String(pkg.durationDays || ''),
        description: pkg.description || '', highlights: Array.isArray(pkg.highlights) ? pkg.highlights.join(', ') : '', imageUrl: pkg.imageUrl || DEFAULT_PACKAGE_IMAGE, imageFit: pkg.imageFit || 'cover',
    });

    const save = (form) => operate(() => {
        const data = { title: form.title, destination: form.destination, budget: form.budget, durationDays: form.days, description: form.description, highlights: form.highlights, imageUrl: form.imageUrl, imageFit: form.imageFit };
        if (form.id) {
            updatePackage({ ...(packages.find((p) => p.id === form.id) || {}), ...data, id: form.id });
            toast('Package updated successfully!', 'success');
        } else {
            addPackage({ id: `PKG-${Date.now().toString().slice(-4)}`, ...data });
            toast('New package created successfully!', 'success');
        }
        setModal(null);
    });

    const remove = async (pkg) => {
        const ok = await confirm({ title: 'Delete Package', message: `Are you sure you want to delete package "${pkg.title}" (${pkg.id})?`, confirmText: 'Delete', tone: 'red' });
        if (!ok) return;
        operate(() => {
            deletePackage(pkg.id);
            toast(`Package "${pkg.title}" deleted.`, 'success');
        });
    };

    return (
        <DashboardLayout role="superuser" page="superuser__superuser_packages" search={headerSearch}>
            <div className="sa-dashboard-container sa-dashboard">
                <div className="sa-page-header">
                    <div><h1>Package Management</h1><p>Manage and curate all travel packages across the platform</p></div>
                    <button type="button" className="sa-btn-primary" onClick={() => setModal({ ...EMPTY })}><Icon name="plus" /> Add New Package</button>
                </div>
                <div className="sa-stats-grid-4">
                    <div className="sa-stat-card-wide sa-stat-blue"><div className="sa-sw-icon"><Icon name="briefcase" /></div><div className="sa-sw-label">Total Packages</div><div className="sa-sw-count" id="stat-total-packages">{packages.length}</div></div>
                    <div className="sa-stat-card-wide sa-stat-green"><div className="sa-sw-icon"><Icon name="map" /></div><div className="sa-sw-label">Destinations</div><div className="sa-sw-count" id="stat-total-destinations">{new Set(packages.map((p) => p.destination)).size}</div></div>
                    <div className="sa-stat-card-wide sa-stat-purple" style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)', color: '#fff' }}>
                        <div className="sa-sw-icon" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}><Icon name="dollar" /></div>
                        <div className="sa-sw-label" style={{ color: 'rgba(255,255,255,0.85)' }}>Avg Package Budget</div>
                        <div className="sa-sw-count" id="stat-avg-budget" style={{ color: '#fff' }}>{formatMoney(avg)}</div>
                    </div>
                    <div className="sa-stat-card-wide sa-stat-gray"><div className="sa-sw-icon"><Icon name="star" /></div><div className="sa-sw-label">Active Catalogs</div><div className="sa-sw-count">Active</div></div>
                </div>
                <div className="sa-filter-bar" style={{ marginTop: '1.5rem' }}>
                    <div className="sa-filter-left">
                        <div className="sa-search-inner"><Icon name="search" /><input type="text" placeholder="Filter by title or destination..." id="pkg-search-input" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
                    </div>
                    <div className="sa-filter-right">
                        <select className="sa-select" id="pkg-duration-filter" value={duration} onChange={(e) => setDuration(e.target.value)} aria-label="Duration">
                            <option value="">All Durations</option>
                            <option value="1-5">1 - 5 Days</option>
                            <option value="6-8">6 - 8 Days</option>
                            <option value="9+">9+ Days</option>
                        </select>
                    </div>
                </div>
                <div id="pkg-grid-container" className="pkg-catalog-grid">
                    {filtered.length ? filtered.map((pkg) => (
                        <div className="pkg-card" key={pkg.id}>
                            <div className="pkg-card-media">
                                <img src={assetUrl(pkg.imageUrl || DEFAULT_PACKAGE_IMAGE)} className={pkg.imageFit === 'contain' ? 'fit-contain' : ''} alt={pkg.title} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = assetUrl(DEFAULT_PACKAGE_IMAGE); }} />
                                <div className="pkg-card-badge"><Icon name="clock" style={{ width: 12, height: 12 }} /> {pkg.durationDays || 5} Days</div>
                            </div>
                            <div className="pkg-card-body">
                                <div className="pkg-card-title">{pkg.title}</div>
                                <div className="pkg-card-dest"><Icon name="map" style={{ width: 14, height: 14 }} /> {pkg.destination}</div>
                                <div className="pkg-card-desc">{pkg.description || ''}</div>
                                {Array.isArray(pkg.highlights) && pkg.highlights.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                                        {pkg.highlights.slice(0, 2).map((h) => <span key={h} style={{ fontSize: 11, background: 'var(--bg-card-alt,#f1f5f9)', color: 'var(--text-secondary,#475569)', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>• {h}</span>)}
                                    </div>
                                )}
                                <div className="pkg-card-meta">
                                    <div className="pkg-card-price"><span className="pkg-card-price-label">Price per person</span><span className="pkg-card-price-val">{formatMoney(Number(pkg.budget) || 0)}</span></div>
                                    <div className="pkg-card-actions">
                                        <button type="button" className="btn-action-icon" title="Edit Package" onClick={() => openEdit(pkg)}><Icon name="edit" style={{ width: 15, height: 15 }} /></button>
                                        <button type="button" className="btn-action-icon btn-action-delete" title="Delete Package" onClick={() => remove(pkg)}><Icon name="trash" style={{ width: 15, height: 15 }} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', background: 'var(--bg-surface)', borderRadius: 16, border: '1px dashed var(--border-color)' }}>
                            <Icon name="briefcase" style={{ width: 48, height: 48, color: 'var(--text-secondary)', opacity: 0.5 }} />
                            <h3 style={{ marginTop: '1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>No Packages Found</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Try adjusting your filter or search criteria.</p>
                        </div>
                    )}
                </div>
            </div>
            {modal && <SuperuserPackageModal key={modal.id || 'new'} initial={modal} onClose={() => setModal(null)} onSave={save} />}
        </DashboardLayout>
    );
}
