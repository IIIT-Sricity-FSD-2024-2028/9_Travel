import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import StatusBadge from '../../components/StatusBadge';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { PATHS } from '../../routes/paths';
import { acceptedTrips, assignableGuides, assignableVendors, formatDateRange } from '../../services/workflow';

const P = PATHS.partner;
const amberBadge = { background: '#fef3c7', color: '#b45309', fontWeight: 700 };

/** selectedTripForAssignment() – ?trip=ID or the first trip that still needs a guide / vendor. */
function selectedTrip(state, kind, requestedId) {
    if (requestedId) {
        const exact = (state.trips || []).find((t) => t.id === requestedId);
        if (exact) return exact;
    }
    let trips = acceptedTrips(state).filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
    if (!trips.length) trips = (state.trips || []).filter((t) => t && t.status !== 'completed' && t.status !== 'cancelled');
    if (kind === 'guide') return trips.find((t) => !t.guide || t.guideStatus === 'Pending') || trips[0] || null;
    return trips.find((t) => !t.vendor || ['Pending', 'Rejected'].includes(t.vendorStatus)) || trips[0] || null;
}

const isAvailable = (status) => {
    const s = String(status || 'Available').toLowerCase();
    return s === 'available' || s === 'active' || s.includes('active') || s.includes('on duty') || s.includes('online');
};

function TripDetails({ state, trip, kind, onSelectTrip, openBudgetShareModal }) {
    const isGuide = kind === 'guide';
    const assignedName = isGuide ? trip.guide?.name : trip.vendor?.name;
    const status = isGuide ? (trip.guideStatus || 'Assigned') : (trip.vendorStatus || 'Requested');
    const isAssigned = Boolean(assignedName);
    const isAccepted = isAssigned && (status === 'Accepted' || trip.status === 'completed');
    const options = acceptedTrips(state).filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
    if (!options.some((t) => t.id === trip.id)) options.unshift(trip);

    return (
        <>
            <div className="meta-row mb-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="meta-label" style={{ fontWeight: 700 }}>Active Trip</span>
                <select value={trip.id} onChange={(e) => onSelectTrip(e.target.value)} aria-label="Active trip" style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color,#cbd5e1)', fontWeight: 700, fontSize: 13, background: 'var(--bg-surface,#fff)', color: 'var(--text-primary,#0f172a)', outline: 'none', cursor: 'pointer', maxWidth: 240 }}>
                    {options.map((t) => <option key={t.id} value={t.id}>{t.id} - {t.destination} ({t.travelerName})</option>)}
                </select>
            </div>
            <div className="trip-meta">
                <div className="meta-row"><span className="meta-label">Destination</span><span className="meta-val font-semibold">{trip.destination}</span></div>
                <div className="meta-row"><span className="meta-label">Trip Dates</span><span className="meta-val font-semibold">{formatDateRange(trip)}</span></div>
                <div className="meta-row"><span className="meta-label">Traveler Name</span><span className="meta-val font-semibold">{trip.travelerName}</span></div>
                <div className="meta-row"><span className="meta-label">Required Service</span><span className="meta-val font-semibold">{isGuide ? 'Tour Guide & Local Sightseeing' : (trip.vendor?.type || 'Hotel / Transport / Activity')}</span></div>
                <div className="meta-row" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border-color,#e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span className="meta-label" style={{ fontWeight: 700 }}>Payout Split</span>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary,#64748b)' }}>Guide: {trip.budgetShare?.guidePercent ?? 50}% • Vendor: {trip.budgetShare?.vendorPercent ?? 50}%</div>
                    </div>
                    <button type="button" onClick={() => openBudgetShareModal(trip.id)} style={{ padding: '6px 12px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                        💳 Pay Guide &amp; Vendor
                    </button>
                </div>
            </div>
            {isAssigned ? (
                isAccepted ? (
                    <button type="button" className="btn-card" disabled style={{ background: '#059669', color: '#ffffff', opacity: 1, cursor: 'default', border: 'none', fontWeight: 600 }}>
                        <Icon name="checkcircle" /> {isGuide ? 'Assigned Guide: ' : 'Assigned Vendor: '}{assignedName} (Confirmed)
                    </button>
                ) : (
                    <button type="button" className="btn-card" disabled style={{ background: '#d97706', color: '#ffffff', opacity: 1, cursor: 'default', border: 'none', fontWeight: 600 }}>
                        <Icon name="clock" /> Request Sent to {assignedName} (Pending Acceptance)
                    </button>
                )
            ) : (
                <div style={{ padding: 12, background: 'rgba(59, 130, 246, 0.08)', border: '1px dashed #3b82f6', borderRadius: 12, color: '#1d4ed8', fontWeight: 700, fontSize: 13, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Icon name="users" /> Select a {isGuide ? 'Guide' : 'Vendor'} from Available Options Below 👇
                </div>
            )}
        </>
    );
}

function CandidateItem({ kind, candidate, trip, actions }) {
    const isGuide = kind === 'guide';
    const status = String(candidate.status || 'Available');
    const avail = isAvailable(status);
    const assignedName = isGuide ? trip.guide?.name : trip.vendor?.name;
    const tripStatus = isGuide ? trip.guideStatus : trip.vendorStatus;
    const isAssigned = Boolean(assignedName);
    const isThis = isAssigned && assignedName === candidate.name;
    const thisAccepted = isThis && (tripStatus === 'Accepted' || trip.status === 'completed');
    const thisPending = isThis && !thisAccepted;
    const cls = isGuide ? 'guide' : 'vendor';
    const label = isGuide ? 'Guide' : 'Vendor';
    const assign = () => (isGuide ? actions.assignGuide(trip.id, candidate.name) : actions.assignVendor(trip.id, candidate.name, candidate.type));

    return (
        <div className={`${cls}-item`} style={thisAccepted ? { border: '2px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' } : thisPending ? { border: '2px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' } : undefined}>
            <div>
                <h4>
                    {candidate.name}{' '}
                    {thisAccepted && <span className="text-xs font-bold text-green-600 ml-2">(Assigned &amp; Confirmed)</span>}
                    {thisPending && <span className="text-xs font-bold text-amber-600 ml-2">(Request Sent - Pending Acceptance)</span>}
                </h4>
                {isGuide ? (
                    <>
                        <div className="guide-meta"><span className="text-blue-600">{candidate.experience || 'Certified Guide'}</span> • {candidate.languages || 'English, Local Languages'}</div>
                        <div className="guide-stats"><span>★ {candidate.rating || '4.9'}</span><span>{candidate.tours || '0'} tours completed</span></div>
                    </>
                ) : (
                    <>
                        <div className="vendor-meta"><span className="text-blue-600">{candidate.type}</span> - {candidate.location}</div>
                        <div className="vendor-stats"><span>★ {candidate.rating}</span><span>{candidate.trips} trips completed</span></div>
                    </>
                )}
            </div>
            <div className="flex flex-col items-end gap-2">
                {thisAccepted ? <span className="badge badge-green">Confirmed</span>
                    : thisPending ? <span className="badge badge-amber" style={amberBadge}>Request Sent</span>
                        : avail ? <span className="badge badge-green">Available</span>
                            : <span className="badge badge-amber" style={amberBadge}>{status}</span>}
                {thisAccepted ? (
                    <button type="button" className="btn-assign" disabled style={{ background: '#059669', color: '#fff', cursor: 'default', borderColor: '#059669' }}><Icon name="check" /> Assigned &amp; Confirmed</button>
                ) : thisPending ? (
                    <button type="button" className="btn-assign" disabled style={{ background: '#d97706', color: '#fff', cursor: 'default', borderColor: '#d97706' }}><Icon name="clock" /> Request Sent (Pending)</button>
                ) : (
                    <button
                        type="button"
                        className="btn-assign"
                        disabled={!avail}
                        title={!avail ? `${label} is currently busy/unavailable` : undefined}
                        style={!avail ? { opacity: 0.55, cursor: 'not-allowed', background: '#94a3b8', borderColor: '#94a3b8' } : undefined}
                        onClick={assign}
                    >
                        {isAssigned ? `🔄 Reassign ${label}` : (avail ? '📩 Send Request' : 'Unavailable')}
                    </button>
                )}
            </div>
        </div>
    );
}

/** travelPartner_{guide,vendor}Assignment.html (renderAssignmentPage). */
function PartnerAssignment({ kind }) {
    const state = useWorkflowState();
    const actions = useWorkflowActions();
    const { openBudgetShareModal } = useUI();
    const [params, setParams] = useSearchParams();
    const isGuide = kind === 'guide';
    const trip = selectedTrip(state, kind, params.get('trip'));
    const candidates = isGuide ? assignableGuides(state) : assignableVendors(state);
    const assigned = acceptedTrips(state).filter((t) => (isGuide ? t.guide : t.vendor));
    const assignPath = isGuide ? P.guideAssignment : P.vendorAssignment;
    const colSpan = isGuide ? 4 : 5;

    return (
        <DashboardLayout role="partner" page={isGuide ? 'travelPartner__travelPartner_guideAssignment' : 'travelPartner__travelPartner_vendorAssignment'}>
            <div className="page-content">
                <div className="page-header">
                    <h1 className="text-2xl font-bold text-gray-900">{isGuide ? 'Guide Assignment' : 'Vendor Assignment'}</h1>
                    <p className="text-sm text-gray-500 mt-1">{isGuide ? 'Assign tour guides for trips' : 'Assign vendors for transport, hotels, and travel services'}</p>
                </div>
                <div className="split-layout">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 ml-1">Trip Details</h3>
                        <div className="trip-details-card">
                            {trip
                                ? <TripDetails state={state} trip={trip} kind={kind} onSelectTrip={(id) => setParams({ trip: id })} openBudgetShareModal={openBudgetShareModal} />
                                : <p className="text-sm text-gray-500">Accept a traveler request first, then assign {kind}s.</p>}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 ml-1">{isGuide ? 'Available Guides' : 'Available Vendors'}</h3>
                        <div className={isGuide ? 'guide-list' : 'vendor-list'}>
                            {trip && candidates.map((c) => <CandidateItem key={c.id || c.name} kind={kind} candidate={c} trip={trip} actions={actions} />)}
                        </div>
                    </div>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 ml-1">{isGuide ? 'Assigned Guides' : 'Assigned Vendors'}</h3>
                <div className="card">
                    <div className="table-container p-0 border-none">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                    <th className="p-4 font-semibold">Trip ID</th>
                                    <th className="p-4 font-semibold">{isGuide ? 'Guide Name' : 'Vendor Name'}</th>
                                    {!isGuide && <th className="p-4 font-semibold text-center">Service Type</th>}
                                    <th className="p-4 font-semibold text-center">Status</th>
                                    <th className="p-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {!trip ? <tr><td colSpan={colSpan} className="p-4 text-center text-gray-500">No assignments yet.</td></tr>
                                    : assigned.length ? assigned.map((item) => {
                                        const person = isGuide ? item.guide : item.vendor;
                                        const status = item.status === 'completed' ? 'Completed' : (isGuide ? item.guideStatus : item.vendorStatus);
                                        return (
                                            <tr className="hover:bg-gray-50 transition-colors" key={item.id}>
                                                <td className="p-4"><span className="font-semibold text-blue-600">{item.id}</span></td>
                                                <td className="p-4 font-medium text-gray-900">{person.name}</td>
                                                {!isGuide && <td className="p-4 text-center"><StatusBadge label={person.type} /></td>}
                                                <td className="p-4 text-center"><StatusBadge label={status} /></td>
                                                <td className="p-4 text-center">
                                                    <Link to={`${assignPath}?trip=${item.id}`} className="action-link red inline-flex items-center gap-1"><Icon name="edit" /> {isGuide ? 'Reassign' : 'Change Vendor'}</Link>
                                                </td>
                                            </tr>
                                        );
                                    }) : <tr><td colSpan={colSpan} className="p-4 text-center text-gray-500">No {isGuide ? 'guides' : 'vendors'} assigned yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

export const PartnerGuideAssignment = () => <PartnerAssignment kind="guide" />;
export const PartnerVendorAssignment = () => <PartnerAssignment kind="vendor" />;
