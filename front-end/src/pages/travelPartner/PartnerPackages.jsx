import { useRef, useState } from 'react';
import DashboardLayout, { useHeaderSearch } from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useOperation } from '../../hooks/usePortal';
import { uploadApi } from '../../services/api';
import { DEFAULT_PACKAGE_IMAGE, addPackage, assetUrl, deletePackage, getAllPackages, updatePackage } from '../../services/workflow';

const PRESETS = [
    ['../../images/maldives_package.png', 'Maldives Tropical Overwater Resort'],
    ['../../images/swiss_alps_package.png', 'Swiss Alps Mountain Lodge'],
    ['../../images/japan_package.png', 'Japan Kyoto Pagoda & City'],
    ['../../images/paris_package.png', 'Paris Eiffel Tower & Romance'],
    ['../../images/goa_package.png', 'Goa Beach Resort & Sun'],
    ['../../images/rome_package.png', 'Rome Historic Colosseum & Heritage'],
];
const EMPTY_FORM = { id: '', title: '', destination: '', budget: '', days: '', description: '', highlights: '', imageUrl: DEFAULT_PACKAGE_IMAGE, imageFit: 'cover' };
const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

function photoTabFor(url) {
    if (!url || PRESETS.some(([v]) => v === url)) return 'preset';
    if (/^https?:/i.test(url)) return 'url';
    return 'file';
}

/** Create / Edit Package modal (#pkgModalBackdrop). Uploaded photos go through POST /upload. */
function PackageModal({ initial, onClose, onSave }) {
    const { toast } = useUI();
    const [form, setForm] = useState(initial);
    const [tab, setTab] = useState(initial.id ? photoTabFor(initial.imageUrl) : 'file');
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
    const setImage = (url) => setForm((f) => ({ ...f, imageUrl: url || DEFAULT_PACKAGE_IMAGE }));

    const switchTab = (mode) => {
        setTab(mode);
        if (mode === 'preset' && !PRESETS.some(([v]) => v === form.imageUrl)) setImage(PRESETS[0][0]);
    };

    const onFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast('Please choose an image file (JPG, PNG, WebP).', 'error'); return; }
        if (file.size > 5 * 1024 * 1024) { toast('The image must be 5MB or smaller.', 'error'); return; }
        setUploading(true);
        try {
            const result = await uploadApi.upload(file);
            setImage(result.url);
        } catch (error) {
            toast(`Photo upload failed: ${error.message}`, 'error');
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

    return (
        <div className="pkg-modal-backdrop active" id="pkgModalBackdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="pkg-modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
                <div className="pkg-modal-header">
                    <h3 id="modalTitle" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{form.id ? `Edit Package (${form.id})` : 'Create New Travel Package'}</h3>
                    <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                </div>
                <div className="pkg-modal-body">
                    <div className="pkg-form-group">
                        <label htmlFor="pkgFormTitle">Package Title *</label>
                        <input type="text" id="pkgFormTitle" placeholder="e.g. Swiss Alps Explorer" required value={form.title} onChange={set('title')} />
                    </div>
                    <div className="pkg-form-group">
                        <label htmlFor="pkgFormDest">Destination City &amp; Country *</label>
                        <input type="text" id="pkgFormDest" placeholder="e.g. Zurich, Switzerland" required value={form.destination} onChange={set('destination')} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="pkg-form-group">
                            <label htmlFor="pkgFormBudget">Price Budget (₹ INR) *</label>
                            <input type="number" id="pkgFormBudget" placeholder="3500" min="100" required value={form.budget} onChange={set('budget')} />
                        </div>
                        <div className="pkg-form-group">
                            <label htmlFor="pkgFormDays">Duration (Days) *</label>
                            <input type="number" id="pkgFormDays" placeholder="7" min="1" max="30" required value={form.days} onChange={set('days')} />
                        </div>
                    </div>
                    <div className="pkg-form-group">
                        <label>Package Photo *</label>
                        <div className="photo-tab-bar">
                            <button type="button" className={`photo-tab-btn${tab === 'file' ? ' active' : ''}`} onClick={() => switchTab('file')}>📁 Upload File</button>
                            <button type="button" className={`photo-tab-btn${tab === 'url' ? ' active' : ''}`} onClick={() => switchTab('url')}>🔗 Image URL</button>
                            <button type="button" className={`photo-tab-btn${tab === 'preset' ? ' active' : ''}`} onClick={() => switchTab('preset')}>🖼️ Pick Preset</button>
                        </div>
                        {tab === 'file' && (
                            <div>
                                <input ref={fileRef} type="file" accept="image/*" onChange={onFile} disabled={uploading} style={{ marginBottom: 4 }} aria-label="Upload package photo" />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{uploading ? 'Uploading photo...' : 'Select a photo from your computer (JPG, PNG, WebP)'}</span>
                            </div>
                        )}
                        {tab === 'url' && (
                            <div>
                                <input type="url" placeholder="https://images.unsplash.com/photo-..." value={/^https?:/i.test(form.imageUrl) ? form.imageUrl : ''} onChange={(e) => setImage(e.target.value.trim())} aria-label="Image URL" />
                            </div>
                        )}
                        {tab === 'preset' && (
                            <div>
                                <select value={PRESETS.some(([v]) => v === form.imageUrl) ? form.imageUrl : PRESETS[0][0]} onChange={(e) => setImage(e.target.value)} aria-label="Preset photo">
                                    {PRESETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="photo-preview-box" id="photoPreviewContainer">
                            <img id="photoPreviewImg" src={assetUrl(form.imageUrl)} alt="Preview" className={form.imageFit === 'contain' ? 'fit-contain' : ''} onError={(e) => { e.currentTarget.src = assetUrl(DEFAULT_PACKAGE_IMAGE); }} />
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--bg-card-alt, #f8fafc)', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-color, #e2e8f0)' }}>
                            <label htmlFor="pkgFormFitMode" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Photo Aspect Ratio &amp; Fit:</label>
                            <select id="pkgFormFitMode" value={form.imageFit} onChange={set('imageFit')} style={{ padding: '5px 10px', fontSize: '0.8rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                                <option value="cover">Crop &amp; Fill Card (Full Bleed)</option>
                                <option value="contain">Fit Entire Image (No Cutoff / Letterbox)</option>
                            </select>
                        </div>
                    </div>
                    <div className="pkg-form-group">
                        <label htmlFor="pkgFormDesc">Short Description *</label>
                        <textarea id="pkgFormDesc" rows="3" placeholder="Describe the trip highlights and experience offered..." required value={form.description} onChange={set('description')} />
                    </div>
                    <div className="pkg-form-group">
                        <label htmlFor="pkgFormHighlights">Key Highlights (comma-separated)</label>
                        <input type="text" id="pkgFormHighlights" placeholder="Luxury Hotel Stay, Guided City Tour, Free Airport Transfer" value={form.highlights} onChange={set('highlights')} />
                    </div>
                </div>
                <div className="pkg-modal-footer">
                    <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button type="button" onClick={save} className="btn-add-pkg-action" style={{ padding: '9px 20px' }}>
                        <Icon name="check" /> <span id="saveBtnText">{form.id ? 'Save Changes' : 'Create Package'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function PackageCard({ pkg, open, onToggle, onEdit, onDelete }) {
    const highlights = Array.isArray(pkg.highlights) ? pkg.highlights : [];
    const schedule = Array.isArray(pkg.schedule) ? pkg.schedule : [];
    return (
        <div className="pkg-card" id={`pkg-card-${pkg.id}`}>
            <div className="pkg-card-media">
                <img src={assetUrl(pkg.imageUrl || DEFAULT_PACKAGE_IMAGE)} className={pkg.imageFit === 'contain' ? 'fit-contain' : ''} alt={pkg.title} onError={(e) => { e.currentTarget.src = assetUrl(DEFAULT_PACKAGE_IMAGE); }} />
                <div className="pkg-card-media-overlay" />
                <div className="badge-duration"><Icon name="clock" style={{ width: 12, height: 12 }} /> {pkg.durationDays || 7} Days</div>
                <div className="badge-pkg-id">{pkg.id}</div>
                <button type="button" className="badge-edit-photo" onClick={onEdit} title="Change Photo">
                    <Icon name="camera" style={{ width: 13, height: 13 }} /> Change Photo
                </button>
            </div>
            <div className="pkg-card-body">
                <h3 className="pkg-card-title">{pkg.title}</h3>
                <div className="pkg-card-dest"><Icon name="mappin" style={{ width: 14, height: 14 }} /> {pkg.destination}</div>
                <div className="pkg-meta-row">
                    <div className="pkg-price-pill">{inr(pkg.budget)}</div>
                    <div className="pkg-sch-count"><Icon name="list" style={{ width: 14, height: 14 }} /> {schedule.length} Events</div>
                </div>
                <p className="pkg-card-desc">{pkg.description || 'No description provided.'}</p>
                <div className="pkg-highlights-chips">
                    {highlights.map((h) => <span className="chip-item" key={h}><Icon name="check" style={{ width: 12, height: 12 }} /> {h}</span>)}
                </div>
                <button type="button" className="sch-toggle-btn" onClick={onToggle}>
                    <Icon name="calendar" style={{ width: 14, height: 14 }} /> View Itinerary Breakdown
                </button>
                <div className={`sch-accordion-box${open ? ' open' : ''}`} id={`sch-content-${pkg.id}`}>
                    {schedule.length ? schedule.map((item, i) => (
                        <div className="sch-row" key={`${item.day}-${item.time}-${i}`}>
                            <strong>Day {item.day} {item.time ? `(${item.time})` : ''}:</strong> {item.title}{' '}
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>- {item.owner === 'vendor' ? 'Transport/Stay' : 'Guide Sightseeing'} @ {item.location || 'Site'}</span>
                        </div>
                    )) : <div style={{ color: '#94a3b8' }}>No detailed schedule items defined for this template.</div>}
                </div>
                <div className="pkg-card-footer">
                    <button type="button" className="btn-edit-card" onClick={onEdit}><Icon name="edit" style={{ width: 14, height: 14 }} /> Edit Package</button>
                    <button type="button" className="btn-delete-card" onClick={onDelete}><Icon name="trash-2" style={{ width: 14, height: 14 }} /> Delete</button>
                </div>
            </div>
        </div>
    );
}

/** Package catalog management (travelPartner_packages.html), also used by the Super Admin portal. */
export function PackageCatalog({ role, page }) {
    const state = useWorkflowState();
    const { confirm, toast } = useUI();
    const operate = useOperation();
    const query = useHeaderSearch();
    const [modal, setModal] = useState(null);
    const [openSchedules, setOpenSchedules] = useState({});

    const packages = getAllPackages(state);
    const filtered = !query ? packages : packages.filter((p) => (p.title || '').toLowerCase().includes(query)
        || (p.destination || '').toLowerCase().includes(query)
        || (p.description || '').toLowerCase().includes(query)
        || (p.highlights || []).some((h) => String(h).toLowerCase().includes(query)));
    const avg = packages.length ? Math.round(packages.reduce((acc, p) => acc + (Number(p.budget) || 0), 0) / packages.length) : 0;
    const destCount = new Set(packages.map((p) => p.destination)).size;

    const openEdit = (pkg) => setModal({
        ...EMPTY_FORM,
        id: pkg.id,
        title: pkg.title || '',
        destination: pkg.destination || '',
        budget: String(pkg.budget || ''),
        days: String(pkg.durationDays || ''),
        description: pkg.description || '',
        highlights: Array.isArray(pkg.highlights) ? pkg.highlights.join(', ') : '',
        imageUrl: pkg.imageUrl || DEFAULT_PACKAGE_IMAGE,
        imageFit: pkg.imageFit || 'cover',
    });

    const save = (form) => operate(() => {
        if (form.id) {
            const existing = packages.find((p) => p.id === form.id) || {};
            updatePackage({ ...existing, id: form.id, title: form.title, destination: form.destination, description: form.description, durationDays: form.days, budget: form.budget, highlights: form.highlights, imageUrl: form.imageUrl, imageFit: form.imageFit });
            toast('Package updated successfully!', 'success');
        } else {
            addPackage({
                id: `PKG-${Date.now().toString().slice(-4)}`,
                title: form.title,
                destination: form.destination,
                description: form.description,
                durationDays: form.days,
                budget: form.budget,
                highlights: form.highlights,
                imageUrl: form.imageUrl,
                imageFit: form.imageFit,
                schedule: [
                    { day: 1, time: '09:00', title: 'Airport pickup & check-in', owner: 'vendor', location: form.destination, notes: '' },
                    { day: 2, time: '10:00', title: 'Guided sight-seeing tour', owner: 'guide', location: form.destination, notes: '' },
                ],
            });
            toast('Package created successfully!', 'success');
        }
        setModal(null);
    });

    const remove = async (pkg) => {
        const ok = await confirm({ title: 'Delete Package', message: `Are you sure you want to delete "${pkg.title}" (${pkg.id})? This package will be permanently removed from the catalog and will no longer be visible to travelers.`, confirmText: 'Delete', tone: 'red' });
        if (!ok) return;
        operate(() => {
            deletePackage(pkg.id);
            toast('Package deleted successfully!', 'success');
        });
    };

    return (
        <DashboardLayout role={role} page={page} search={undefined}>
            <div className="page-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: 0 }}>Package Catalog Management</h1>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #64748b)', marginTop: 4, marginBottom: 0 }}>Add, edit photos, inspect, and delete travel package templates offered to travelers in real-time</p>
                    </div>
                    <button type="button" className="btn-add-pkg-action" onClick={() => setModal({ ...EMPTY_FORM })}><Icon name="plus" /> Add New Package</button>
                </div>
                <div className="pkg-stats-row">
                    <div className="pkg-stat-card">
                        <div className="pkg-stat-icon-wrapper icon-blue"><Icon name="package" style={{ width: 24, height: 24 }} /></div>
                        <div><div className="pkg-stat-label">Total Packages</div><div className="pkg-stat-value" id="statTotalPackages">{packages.length}</div></div>
                    </div>
                    <div className="pkg-stat-card">
                        <div className="pkg-stat-icon-wrapper icon-teal"><Icon name="dollar-sign" style={{ width: 24, height: 24 }} /></div>
                        <div><div className="pkg-stat-label">Avg Package Budget</div><div className="pkg-stat-value" id="statAvgBudget">{inr(avg)}</div></div>
                    </div>
                    <div className="pkg-stat-card">
                        <div className="pkg-stat-icon-wrapper icon-purple"><Icon name="map" style={{ width: 24, height: 24 }} /></div>
                        <div><div className="pkg-stat-label">Active Destinations</div><div className="pkg-stat-value" id="statDestCount">{packages.length ? destCount : 0}</div></div>
                    </div>
                </div>
                <div className="pkg-catalog-grid" id="packageGridContainer">
                    {filtered.length ? filtered.map((pkg) => (
                        <PackageCard
                            key={pkg.id}
                            pkg={pkg}
                            open={Boolean(openSchedules[pkg.id])}
                            onToggle={() => setOpenSchedules((o) => ({ ...o, [pkg.id]: !o[pkg.id] }))}
                            onEdit={() => openEdit(pkg)}
                            onDelete={() => remove(pkg)}
                        />
                    )) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-surface, #fff)', border: '1px dashed var(--border-color, #cbd5e1)', borderRadius: 20 }}>
                            <Icon name="package" style={{ width: 48, height: 48, color: 'var(--text-secondary, #94a3b8)', marginBottom: '1rem' }} />
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', marginBottom: '0.5rem' }}>No Packages Found</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #64748b)', marginBottom: '1.5rem' }}>There are currently no active travel packages matching your search criteria.</p>
                            <button type="button" onClick={() => setModal({ ...EMPTY_FORM })} className="btn-add-pkg-action"><Icon name="plus" /> Create First Package</button>
                        </div>
                    )}
                </div>
            </div>
            {modal && <PackageModal key={modal.id || 'new'} initial={modal} onClose={() => setModal(null)} onSave={save} />}
        </DashboardLayout>
    );
}

/** travelPartner_packages.html */
export default function PartnerPackages() {
    return <PackageCatalog role="partner" page="travelPartner__travelPartner_packages" />;
}
