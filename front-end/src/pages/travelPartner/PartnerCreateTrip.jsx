import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useOperation } from '../../hooks/usePortal';
import { PATHS } from '../../routes/paths';
import { uploadApi } from '../../services/api';
import { DEFAULT_PACKAGE_IMAGE, PACKAGE_IMAGE_PRESETS, addPackage, assetUrl } from '../../services/workflow';

const P = PATHS.partner;
let rowSeq = 0;
const newRow = () => ({ key: `row-${++rowSeq}`, day: 1, time: '09:00', title: '', owner: 'vendor', location: '' });

/** Package cover photo: upload through POST /upload or pick a preset image. */
export function PackagePhotoPicker({ value, onChange, toast }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const isPreset = PACKAGE_IMAGE_PRESETS.some((p) => p.value === value);

    const onFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast('Please choose an image file.', 'error'); return; }
        if (file.size > 5 * 1024 * 1024) { toast('The image must be 5MB or smaller.', 'error'); return; }
        setUploading(true);
        try {
            const result = await uploadApi.upload(file);
            onChange(result.url);
            toast('Package photo uploaded.', 'success');
        } catch (error) {
            toast(`Photo upload failed: ${error.message}`, 'error');
            if (inputRef.current) inputRef.current.value = '';
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
                <input ref={inputRef} type="file" accept="image/*" className="form-input" style={{ padding: 6 }} onChange={onFile} disabled={uploading} aria-label="Upload cover photo" />
                <select className="form-input" value={isPreset ? value : ''} onChange={(e) => { if (e.target.value) onChange(e.target.value); }} aria-label="Preset cover photo">
                    {!isPreset && <option value="">Uploaded photo</option>}
                    {PACKAGE_IMAGE_PRESETS.map((p) => <option key={p.value} value={p.value}>Preset: {p.label}</option>)}
                </select>
            </div>
            <div style={{ width: '100%', height: 160, borderRadius: 10, overflow: 'hidden', background: '#0f172a', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {uploading
                    ? <span style={{ color: '#cbd5e1', fontSize: 13 }}>Uploading photo...</span>
                    : <img src={assetUrl(value)} alt="Package cover preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = assetUrl(DEFAULT_PACKAGE_IMAGE); }} />}
            </div>
        </div>
    );
}

/** travelPartner_createTrip.html – create a package for the traveler catalog. */
export default function PartnerCreateTrip() {
    const navigate = useNavigate();
    const { toast } = useUI();
    const operate = useOperation();
    const [form, setForm] = useState({ title: '', destination: '', duration: '7', budget: '5000', highlights: '', description: '' });
    const [photo, setPhoto] = useState(DEFAULT_PACKAGE_IMAGE);
    const [rows, setRows] = useState(() => [newRow()]);
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
    const setRow = (key, field, value) => setRows((list) => list.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

    const submit = () => {
        if (!form.title.trim() || !form.destination.trim()) {
            toast('Please enter package title and destination.', 'warning');
            return;
        }
        operate(() => {
            addPackage({
                id: `PKG-${Date.now().toString().slice(-4)}`,
                title: form.title.trim(),
                destination: form.destination.trim(),
                durationDays: parseInt(form.duration, 10) || 7,
                budget: parseInt(form.budget, 10) || 5000,
                description: form.description || '',
                highlights: form.highlights.split(',').map((s) => s.trim()).filter(Boolean),
                imageUrl: photo,
                schedule: rows.map((r) => ({ day: parseInt(r.day, 10) || 1, time: r.time, title: r.title, owner: r.owner, location: r.location, notes: '' })),
            });
            toast('Package created successfully!', 'success');
            setTimeout(() => navigate(P.packages), 1200);
        });
    };

    return (
        <DashboardLayout role="partner" page="travelPartner__travelPartner_createTrip">
            <div className="page-content">
                <Link to={P.trips} className="page-header-nav"><Icon name="arrowleft" /> Back to Trips</Link>
                <div className="page-header">
                    <h1 className="text-3xl font-bold text-gray-900">Create Trip Package</h1>
                    <p className="text-sm text-gray-500 mt-1">Design a new travel package template for travelers to request</p>
                </div>
                <div className="info-alert">
                    <Icon name="package" />
                    This creates a package that will appear in the traveler&apos;s &quot;Create Trip Plan&quot; catalog.
                </div>
                <div className="form-card">
                    <form id="createTripForm" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                        <div className="form-section">
                            <h3 className="form-section-title">Package Details</h3>
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label className="form-label" htmlFor="pkgTitle">Package Title <span>*</span></label>
                                    <input type="text" className="form-input" id="pkgTitle" placeholder="e.g. Maldives Escape" required value={form.title} onChange={set('title')} />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label" htmlFor="pkgDest">Destination <span>*</span></label>
                                    <input type="text" className="form-input" id="pkgDest" placeholder="e.g., Male, Maldives" required value={form.destination} onChange={set('destination')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="pkgDuration">Duration (Days) <span>*</span></label>
                                    <input type="number" className="form-input" id="pkgDuration" min="1" required value={form.duration} onChange={set('duration')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="pkgBudget">Estimated Budget (USD) <span>*</span></label>
                                    <input type="number" className="form-input" id="pkgBudget" min="0" required value={form.budget} onChange={set('budget')} />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label" htmlFor="pkgHighlights">Highlights (comma separated)</label>
                                    <input type="text" className="form-input" id="pkgHighlights" placeholder="e.g. 7 Days Premium Resort stay, Snorkeling, Spa" value={form.highlights} onChange={set('highlights')} />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Package Cover Photo</label>
                                    <PackagePhotoPicker value={photo} onChange={setPhoto} toast={toast} />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label" htmlFor="pkgDesc">Package Description</label>
                                    <textarea className="form-textarea" id="pkgDesc" placeholder="Brief description of the package..." value={form.description} onChange={set('description')} />
                                </div>
                            </div>
                        </div>
                        <div className="form-section">
                            <h3 className="form-section-title">Default Itinerary / Schedule</h3>
                            <div id="scheduleContainer" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {rows.map((row) => (
                                    <div className="form-grid schedule-item-row" key={row.key} style={{ background: 'var(--bg-card-alt, var(--secondary, #f8fafc))', border: '1px solid var(--border, #e2e8f0)', padding: '1rem', borderRadius: 8, position: 'relative' }}>
                                        <button type="button" aria-label="Remove item" onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))} style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'var(--destructive, #ef4444)', cursor: 'pointer' }}><Icon name="trash" /></button>
                                        <div className="form-group">
                                            <label className="form-label">Day</label>
                                            <input type="number" className="form-input sch-day" min="1" value={row.day} onChange={(e) => setRow(row.key, 'day', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Time</label>
                                            <input type="time" className="form-input sch-time" value={row.time} onChange={(e) => setRow(row.key, 'time', e.target.value)} />
                                        </div>
                                        <div className="form-group full-width">
                                            <label className="form-label">Title/Activity</label>
                                            <input type="text" className="form-input sch-title" placeholder="e.g. Airport Pickup" value={row.title} onChange={(e) => setRow(row.key, 'title', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Responsible</label>
                                            <select className="form-input sch-owner" value={row.owner} onChange={(e) => setRow(row.key, 'owner', e.target.value)}>
                                                <option value="vendor">Vendor</option>
                                                <option value="guide">Guide</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Location</label>
                                            <input type="text" className="form-input sch-location" placeholder="e.g. Male Airport" value={row.location} onChange={(e) => setRow(row.key, 'location', e.target.value)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" className="btn-submit" style={{ marginTop: '1rem', background: 'var(--muted)', color: 'var(--foreground)' }} onClick={() => setRows((list) => [...list, newRow()])}>
                                <Icon name="plus" /> Add Itinerary Item
                            </button>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-submit"><Icon name="plus" /> Create Package</button>
                            <button type="button" className="btn-cancel" onClick={() => navigate(P.trips)}>Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
