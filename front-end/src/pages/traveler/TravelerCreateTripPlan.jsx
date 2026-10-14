import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import {
    PACKAGE_MIN_BUDGETS, assetUrl, canOperateSession, getAllPackages, groupScheduleByDay, makeTripRequest,
    tripDateLimits, validateTripDates,
} from '../../services/workflow';

const INTERESTS = [['Culture', 'Culture & History'], ['Food', 'Food & Culinary'], ['Adventure', 'Adventure & Active'], ['Nature', 'Nature & Wildlife'], ['Shopping', 'Shopping'], ['Wellness', 'Spa & Wellness']];
// The original page labelled only its own three fallback packages as Bestseller.
const ORIGINAL_IDS = ['PKG-1', 'PKG-2', 'PKG-3'];
const EMPTY_FORM = { pkgName: '', pkgDest: '', startDate: '', endDate: '', numAdults: '2', numChildren: '0', budget: '', accommodationType: 'standard', tripPace: 'moderate', interests: ['Culture'], notes: '' };

function defaultDates() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() + 7);
    const end = new Date(today);
    end.setDate(end.getDate() + 12);
    return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
}

export default function TravelerCreateTripPlan() {
    const state = useWorkflowState();
    const { toast, success } = useUI();
    const navigate = useNavigate();
    const packages = getAllPackages(state);
    const [selectedId, setSelectedId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const sectionRef = useRef(null);
    const destRef = useRef(null);
    const limits = tripDateLimits();

    const isCustom = selectedId === 'CUSTOM';
    const selectedPkg = packages.find((p) => p.id === selectedId);

    useEffect(() => {
        if (!selectedId) return undefined;
        const t = setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
        if (isCustom) destRef.current?.focus();
        return () => clearTimeout(t);
    }, [selectedId, isCustom]);

    const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

    const selectPackage = (pkg) => {
        setSelectedId(pkg.id);
        setForm((prev) => {
            const dates = defaultDates();
            let budget = prev.budget;
            if (!budget) {
                const key = Object.keys(PACKAGE_MIN_BUDGETS).find((k) => String(pkg.title || '').toLowerCase().includes(k) || String(pkg.destination || '').toLowerCase().includes(k));
                budget = String(key ? PACKAGE_MIN_BUDGETS[key] : 1200);
            }
            return { ...prev, pkgName: pkg.title, pkgDest: pkg.destination, startDate: prev.startDate || dates.startDate, endDate: prev.endDate || dates.endDate, budget };
        });
    };

    const selectCustom = () => {
        setSelectedId('CUSTOM');
        setForm((prev) => {
            const dates = defaultDates();
            return { ...prev, pkgName: 'Custom Destination Trip', pkgDest: '', startDate: prev.startDate || dates.startDate, endDate: prev.endDate || dates.endDate, budget: prev.budget || '1000' };
        });
    };

    const cancelCustomization = () => {
        setSelectedId(null);
        setForm(EMPTY_FORM);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Extended schedule warning (updateDurationWarning)
    let durationWarning = null;
    if (form.startDate && form.endDate && selectedPkg && !isCustom) {
        const requestedDays = Math.round(Math.max(0, new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1;
        const pkgDays = selectedPkg.schedule && selectedPkg.schedule.length > 0 ? Math.max(...selectedPkg.schedule.map((i) => i.day)) : 5;
        if (requestedDays > pkgDays) durationWarning = { requestedDays, pkgDays };
    }

    const toggleInterest = (value) => setForm((prev) => ({
        ...prev,
        interests: prev.interests.includes(value) ? prev.interests.filter((i) => i !== value) : [...prev.interests, value],
    }));

    /** handleTripRequest() from trip_requests.js */
    const submit = (event) => {
        event.preventDefault();
        if (submitting || !canOperateSession()) return;
        let pkgName = form.pkgName.trim();
        let destination = form.pkgDest.trim();
        if (!destination) destination = pkgName || 'Custom Destination';
        if (!pkgName) pkgName = destination || 'Custom Trip Plan';
        let { startDate, endDate } = form;
        if (!startDate || !endDate) {
            const dates = defaultDates();
            startDate = startDate || dates.startDate;
            endDate = endDate || dates.endDate;
        }
        const dateCheck = validateTripDates(startDate, endDate);
        if (!dateCheck.valid) { toast(dateCheck.message, 'error'); return; }

        const inputBudget = Number(form.budget || 0);
        const pkgLower = pkgName.toLowerCase();
        const destLower = destination.toLowerCase();
        const custom = !pkgName || pkgLower.includes('custom');
        let minBudget = 0;
        if (!custom) {
            const key = Object.keys(PACKAGE_MIN_BUDGETS).find((k) => pkgLower.includes(k) || destLower.includes(k));
            minBudget = key ? PACKAGE_MIN_BUDGETS[key] : 500;
        }
        if (minBudget > 0 && inputBudget > 0 && inputBudget < minBudget) {
            toast(`Minimum budget for ${pkgName || destination} package is ₹${minBudget.toLocaleString('en-IN')}. Please enter a budget of at least ₹${minBudget.toLocaleString('en-IN')}.`, 'error');
            return;
        }
        setSubmitting(true);
        try {
            makeTripRequest({
                packageName: pkgName,
                destination,
                startDate,
                endDate,
                adults: form.numAdults || 1,
                children: form.numChildren || 0,
                budget: form.budget || 0,
                accommodationType: form.accommodationType,
                tripPace: form.tripPace,
                interests: form.interests,
                notes: form.notes,
            });
            success('Request Sent', 'Trip plan request has been sent to your travel partner.', () => navigate(PATHS.traveler.myTrips));
        } catch (error) {
            toast(error.message || 'Failed to submit trip request.', 'error');
            setSubmitting(false);
        }
    };

    const previewGroups = selectedPkg?.schedule?.length ? groupScheduleByDay(selectedPkg.schedule) : null;

    return (
        <DashboardLayout role="traveler" page="traveler__traveler_create_trip_plan" activeNav={PATHS.traveler.myTrips}>
            <div className="page-content">
                <div className="page-title-row" style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ margin: 0, marginBottom: 4 }}>Create Trip Plan</h1>
                    <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>Select a beautifully curated package below to customize and send an advanced request to your travel partner.</p>
                </div>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Available Masterpiece Packages</h2>
                <div className="packages-grid" id="packagesGrid">
                    {packages.map((pkg) => {
                        const isCustomCreated = !ORIGINAL_IDS.includes(pkg.id);
                        return (
                            <div key={pkg.id} className={`package-card${selectedId === pkg.id ? ' selected' : ''}`} onClick={() => selectPackage(pkg)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') selectPackage(pkg); }}>
                                <div className="package-img-container">
                                    <div className="package-badge" style={isCustomCreated ? { background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#fff' } : undefined}>
                                        <Icon name="star" style={{ width: 12, height: 12, marginRight: 4, display: 'inline-block' }} /> {isCustomCreated ? 'Partner Package' : 'Bestseller'}
                                    </div>
                                    <img src={assetUrl(pkg.imageUrl)} alt={pkg.title} className={`package-img ${pkg.imageFit === 'contain' ? 'fit-contain' : ''}`} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/maldives_package.png'; }} />
                                </div>
                                <div className="package-content">
                                    <div className="package-title">{pkg.title}</div>
                                    <div className="package-dest"><Icon name="mappin" style={{ width: 14 }} /> {pkg.destination}</div>
                                    <div className="package-highlights">
                                        {(pkg.highlights || []).map((h) => <div className="highlight-item" key={h}><Icon name="check" /> {h}</div>)}
                                    </div>
                                    <button type="button" className="t-btn t-btn-outline-blue w-full" style={{ width: '100%', marginTop: 'auto' }}>Select &amp; Customize</button>
                                </div>
                            </div>
                        );
                    })}
                    <div className={`package-card custom-request-card${isCustom ? ' selected' : ''}`} onClick={selectCustom} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') selectCustom(); }} style={{ border: '1px dashed var(--primary, #0ea5e9)', background: 'rgba(14, 165, 233, 0.03)' }}>
                        <div className="package-img-container" style={{ background: 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
                            <Icon name="compass" style={{ width: 48, height: 48, color: 'var(--primary, #0ea5e9)' }} />
                        </div>
                        <div className="package-content" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            <div className="package-title" style={{ color: 'var(--primary, #0ea5e9)', fontWeight: 800 }}>Request Custom Destination</div>
                            <div className="package-dest" style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', marginTop: 4 }}>
                                <Icon name="mappin" style={{ width: 14, marginRight: 2 }} /> Any place you like!
                            </div>
                            <div className="package-highlights" style={{ marginTop: 10, fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, flexGrow: 1 }}>
                                <div className="highlight-item"><Icon name="check" style={{ color: 'var(--primary, #0ea5e9)' }} /> Custom Destination &amp; Sights</div>
                                <div className="highlight-item"><Icon name="check" style={{ color: 'var(--primary, #0ea5e9)' }} /> Flexible Days &amp; Date Range</div>
                                <div className="highlight-item"><Icon name="check" style={{ color: 'var(--primary, #0ea5e9)' }} /> Partner-built custom schedule</div>
                            </div>
                            <button type="button" className="t-btn w-full" style={{ width: '100%', marginTop: 15, background: 'var(--primary, #0ea5e9)', color: 'white', border: 'none' }}>Create Custom Request</button>
                        </div>
                    </div>
                </div>

                <div className={`customization-section${selectedId ? ' active' : ''}`} id="customizationSection" ref={sectionRef}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--foreground, #0f172a)' }}>Advanced Trip Customization</h2>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--muted-foreground, #64748b)', marginBottom: '2rem' }}>Fine-tune every detail of your journey. Your travel partner will review these comprehensive preferences.</p>

                    <form id="tripRequestForm" onSubmit={submit}>
                        <div className="form-grid">
                            <div className="form-section-title">Essential Details</div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="pkgName">Selected Base Package</label>
                                <input type="text" className="form-control" id="pkgName" value={form.pkgName} onChange={set('pkgName')} readOnly={!isCustom} placeholder={isCustom ? 'e.g. My Dream Vacation' : undefined} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="pkgDest">Destination Focus</label>
                                <input ref={destRef} type="text" className="form-control" id="pkgDest" value={form.pkgDest} onChange={set('pkgDest')} readOnly={Boolean(selectedId) && !isCustom} placeholder={isCustom ? 'e.g. Hawaii, USA or Paris, France' : undefined} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="startDate">Preferred Start Date</label>
                                <input type="date" className="form-control" id="startDate" min={limits.min} max={limits.max} value={form.startDate} onChange={set('startDate')} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="endDate">Preferred End Date</label>
                                <input type="date" className="form-control" id="endDate" min={limits.min} max={limits.max} value={form.endDate} onChange={set('endDate')} required />
                            </div>

                            <div className="form-section-title" style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>Package Itinerary Preview</div>
                            <div className="form-group full-width" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                                <div id="itineraryPreviewContainer" style={{ background: 'var(--bg-card-alt, var(--secondary, #f8fafc))', border: '1px solid var(--border, #e2e8f0)', padding: '1.25rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {isCustom ? (
                                        <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>
                                            <Icon name="edit-3" style={{ width: 24, height: 24, marginBottom: 8, color: 'var(--primary, #0ea5e9)' }} />
                                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main, var(--foreground, #fff))' }}>Custom Itinerary Creation</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, var(--muted-foreground, #64748b))' }}>The travel partner will build a brand new daily schedule tailored to your requested destination and sights!</p>
                                        </div>
                                    ) : previewGroups ? Object.keys(previewGroups).map((day) => (
                                        <div key={day} style={{ marginBottom: '0.75rem', borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '0.5rem' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--primary, #0ea5e9)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Day {day}</div>
                                            {previewGroups[day].map((item) => (
                                                <div key={`${day}-${item.time}-${item.title}`} style={{ display: 'flex', gap: 8, fontSize: '0.875rem', color: 'var(--text-main, var(--foreground, #334155))', marginBottom: 4 }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--muted-foreground, #64748b)', minWidth: 70 }}>{item.time}</span>
                                                    <span>{item.title} ({item.owner === 'vendor' ? 'Transport/Hotel' : 'Sightseeing/Tour'}) - <em>{item.location}</em></span>
                                                </div>
                                            ))}
                                        </div>
                                    )) : selectedPkg ? (
                                        <p style={{ color: 'var(--muted-foreground, #64748b)', fontSize: '0.875rem', margin: 0 }}>No schedule itinerary available for this package.</p>
                                    ) : (
                                        <p style={{ color: 'var(--muted-foreground, #64748b)', fontSize: '0.875rem', margin: 0 }}>Select a base package above to preview its default itinerary schedule.</p>
                                    )}
                                </div>
                            </div>

                            {durationWarning && (
                                <div className="form-group full-width" id="durationWarning" style={{ display: 'block', gridColumn: '1 / -1', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#b45309', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <Icon name="alert-triangle" style={{ width: 20, height: 20, flexShrink: 0, color: '#d97706' }} />
                                        <div>
                                            <strong>Extended Schedule Requested!</strong> You have selected a date range of <strong>{durationWarning.requestedDays} days</strong>, which is longer than the package&apos;s standard <strong>{durationWarning.pkgDays} days</strong> itinerary.
                                            <br />
                                            The travel partner will customize and extend your schedule up to 10 days based on the specific places and landmarks you request below!
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="form-section-title">Participants &amp; Budget</div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="numAdults">Number of Travelers</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="number" className="form-control" id="numAdults" min="1" value={form.numAdults} onChange={set('numAdults')} placeholder="Adults" style={{ flex: 1 }} required />
                                    <input type="number" className="form-control" id="numChildren" min="0" value={form.numChildren} onChange={set('numChildren')} placeholder="Children" style={{ flex: 1 }} aria-label="Children" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="budget">Estimated Total Budget ($)</label>
                                <input type="number" className="form-control" id="budget" placeholder="e.g. 5000" value={form.budget} onChange={set('budget')} />
                            </div>

                            <div className="form-section-title">Advanced Preferences</div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="accommodationType">Accommodation Style</label>
                                <select className="form-control" id="accommodationType" value={form.accommodationType} onChange={set('accommodationType')}>
                                    <option value="luxury">5-Star Luxury / Resort</option>
                                    <option value="standard">4-Star Standard / Boutique</option>
                                    <option value="budget">Comfort &amp; Budget</option>
                                    <option value="authentic">Authentic / Local Stays (Villas, Cabins)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="tripPace">Trip Pace</label>
                                <select className="form-control" id="tripPace" value={form.tripPace} onChange={set('tripPace')}>
                                    <option value="relaxed">Relaxed - Lots of free time</option>
                                    <option value="moderate">Moderate - Balanced itinerary</option>
                                    <option value="fast">Fast-paced - See as much as possible</option>
                                </select>
                            </div>

                            <div className="form-group full-width">
                                <label className="form-label">Primary Interests (Select all that apply)</label>
                                <div className="checkbox-grid">
                                    {INTERESTS.map(([value, label]) => (
                                        <label className="custom-checkbox" key={value}>
                                            <input type="checkbox" name="interests" value={value} checked={form.interests.includes(value)} onChange={() => toggleInterest(value)} /> {label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label className="form-label" htmlFor="notes">Specific Places to Visit / Special Requirements</label>
                                <textarea className="form-control" id="notes" placeholder="Tell us if you have dietary restrictions, mobility requirements, or any specific landmarks you must visit..." value={form.notes} onChange={set('notes')} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                            <button type="button" className="t-btn t-btn-outline-blue" onClick={cancelCustomization}>Cancel</button>
                            <button
                                type="submit"
                                id="btnSubmitTripRequest"
                                disabled={submitting}
                                style={{ background: '#10b981', color: 'white', padding: '0.75rem 2rem', fontSize: '1.05rem', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s' }}
                                onMouseOver={(e) => { e.currentTarget.style.background = '#059669'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = '#10b981'; }}
                                onFocus={(e) => { e.currentTarget.style.background = '#059669'; }}
                                onBlur={(e) => { e.currentTarget.style.background = '#10b981'; }}
                            >
                                {submitting ? 'Submitting Request...' : <>Submit Trip Request <Icon name="arrow-right" style={{ width: 18, height: 18 }} /></>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
