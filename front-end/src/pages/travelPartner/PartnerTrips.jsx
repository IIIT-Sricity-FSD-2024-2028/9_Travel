import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout, { useHeaderSearch } from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import StatusBadge from '../../components/StatusBadge';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { PATHS } from '../../routes/paths';
import { allActiveTrips, canStartTrip, formatDateRange, formatMoney, statusLabel } from '../../services/workflow';

const P = PATHS.partner;
const pillLink = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer' };

export function scheduleDetailPath(trip) {
    if (trip.status === 'completed') return P.scheduleCompleted;
    if (trip.status === 'ongoing') return P.scheduleOngoing;
    return P.scheduleUpcoming;
}

/** "Actions" dropdown of an active trip row (toggleTripActionsMenu). */
function ActionsMenu({ trip, open, onToggle, actions }) {
    const items = [];
    const vendorConfirmed = trip.vendor && (trip.vendorStatus === 'Accepted' || trip.status === 'completed');
    if (!vendorConfirmed) {
        const sent = trip.vendor && trip.vendorStatus === 'Requested';
        items.push(<Link key="vendor" to={`${P.vendorAssignment}?trip=${trip.id}`} className="dd-menu-item" style={sent ? { color: '#d97706' } : undefined}><Icon name="truck" /> {sent ? 'Vendor Request Sent' : 'Assign Vendor'}</Link>);
    }
    const guideConfirmed = trip.guide && (trip.guideStatus === 'Accepted' || trip.status === 'completed');
    if (!guideConfirmed) {
        const sent = trip.guide && trip.guideStatus === 'Assigned';
        items.push(<Link key="guide" to={`${P.guideAssignment}?trip=${trip.id}`} className="dd-menu-item" style={sent ? { color: '#d97706' } : undefined}><Icon name="user" /> {sent ? 'Guide Request Sent' : 'Assign Guide'}</Link>);
    }
    if (canStartTrip(trip) && !trip.scheduleStarted && trip.status !== 'ongoing' && trip.status !== 'completed') {
        items.push(<button key="start" type="button" className="dd-menu-item" style={{ color: '#10b981' }} onClick={() => { onToggle(); actions.startTrip(trip.id); }}><Icon name="play" /> Start Trip</button>);
    }
    if (!['completed', 'cancelled', 'requested'].includes(trip.status)) {
        items.push(<button key="complete" type="button" className="dd-menu-item" style={{ color: '#059669' }} onClick={() => { onToggle(); actions.completeTrip(trip.id); }}><Icon name="checkcircle" /> Complete Trip</button>);
    }
    if (trip.scheduleStarted || trip.status === 'ongoing') {
        items.push(<Link key="exec" to={P.execution} className="dd-menu-item"><Icon name="activity" /> Execution</Link>);
    }
    if (!['completed', 'cancelled', 'requested'].includes(trip.status) && trip.supportStatus !== 'Sent' && trip.supportStatus !== 'Accepted') {
        items.push(<button key="support" type="button" className="dd-menu-item" onClick={() => { onToggle(); actions.sendToSupport(trip.id); }}><Icon name="headphones" /> Send to Support</button>);
    }

    return (
        <div className="dd-row-actions-wrapper" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Link to={`${scheduleDetailPath(trip)}?trip=${trip.id}`} className="tbl-act-btn tbl-act-blue"><Icon name="calendar" /> Edit Schedule</Link>
            <button type="button" className="tbl-act-btn tbl-act-slate" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                Actions <Icon name="chevron-down" />
            </button>
            {open && (
                <div className="dd-trip-actions-menu" style={{ display: 'block', position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 9999, minWidth: 170, background: 'var(--bg-surface,#ffffff)', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 12, padding: 6, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)' }}>
                    {items.length ? items : <div className="dd-menu-item" style={{ color: '#64748b', fontSize: 12, cursor: 'default' }}><Icon name="check" /> All Actions Complete</div>}
                </div>
            )}
        </div>
    );
}

/** travelPartner_trips.html (renderPartnerTrips). */
export default function PartnerTrips() {
    const state = useWorkflowState();
    const actions = useWorkflowActions();
    const { openBudgetShareModal, openRefundModal } = useUI();
    const headerQuery = useHeaderSearch();
    const [openMenu, setOpenMenu] = useState('');
    const [query, setQuery] = useState('');
    const [destination, setDestination] = useState('All Destinations');
    const [stage, setStage] = useState('All Stages');

    // Clicking anywhere outside an open menu closes it.
    useEffect(() => {
        if (!openMenu) return undefined;
        const close = (e) => { if (!e.target.closest('.dd-row-actions-wrapper')) setOpenMenu(''); };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [openMenu]);

    const all = allActiveTrips(state);
    const destinations = [...new Set(all.map((t) => t.destination).filter(Boolean))];
    const stages = [...new Set(all.map((t) => statusLabel(t)))];
    const q = (query || headerQuery).trim().toLowerCase();
    const trips = all.filter((trip) => (!q || `${trip.id} ${trip.travelerName} ${trip.title}`.toLowerCase().includes(q))
        && (destination === 'All Destinations' || trip.destination === destination)
        && (stage === 'All Stages' || statusLabel(trip) === stage));

    const rowActions = (trip) => {
        const detail = `${scheduleDetailPath(trip)}?trip=${trip.id}`;
        if (trip.status === 'completed') {
            return (
                <>
                    <Link to={detail} className="tbl-act-btn tbl-act-slate"><Icon name="eye" /> View History</Link>
                    {trip.budgetShare?.disbursed ? (
                        <span className="badge badge-emerald" style={{ padding: '6px 12px', fontSize: 12, color: '#10b981', background: 'rgba(16,185,129,0.15)', borderRadius: 6, fontWeight: 700 }}><Icon name="check" /> Paid Guide &amp; Vendor</span>
                    ) : (
                        <button type="button" className="tbl-act-btn tbl-act-emerald" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer' }} onClick={() => openBudgetShareModal(trip.id)}>💳 Pay Guide &amp; Vendor</button>
                    )}
                </>
            );
        }
        if (trip.status === 'cancelled') {
            const ref = trip.refundRecord;
            if (ref && ref.processed) {
                return <button type="button" className="tbl-act-btn tbl-act-emerald" onClick={() => openRefundModal(trip.id)}><Icon name="check" /> Refunded {formatMoney(ref.refundAmount)}</button>;
            }
            return <span className="badge badge-amber" style={{ padding: '6px 12px', fontSize: 12 }}><Icon name="clock" /> Pending Admin Refund</span>;
        }
        if (trip.cancellationRequested && trip.cancellationStatus === 'Pending') {
            return (
                <>
                    <button type="button" className="tbl-act-btn tbl-act-rose" onClick={() => actions.acceptCancellation(trip.id)}><Icon name="check" /> Accept Cancellation</button>
                    <button type="button" className="tbl-act-btn tbl-act-slate" onClick={() => actions.declineCancellation(trip.id)}><Icon name="x" /> Decline</button>
                    <Link to={detail} className="tbl-act-btn tbl-act-blue"><Icon name="eye" /> Details</Link>
                </>
            );
        }
        if (trip.status === 'requested') {
            return (
                <>
                    <button type="button" className="tbl-act-btn tbl-act-emerald" onClick={() => actions.acceptTrip(trip.id)}><Icon name="check" /> Accept Request</button>
                    <button type="button" className="tbl-act-btn tbl-act-rose" onClick={() => actions.rejectTrip(trip.id)}><Icon name="x" /> Reject</button>
                </>
            );
        }
        return <ActionsMenu trip={trip} open={openMenu === trip.id} onToggle={() => setOpenMenu((id) => (id === trip.id ? '' : trip.id))} actions={actions} />;
    };

    return (
        <DashboardLayout role="partner" page="travelPartner__travelPartner_trips">
            <div className="page-content">
                <div className="page-header">
                    <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and coordinate travel trips</p>
                </div>
                <div className="filter-bar">
                    <div className="search-input">
                        <Icon name="search" />
                        <input type="text" placeholder="Search Trip ID or traveler name..." value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    <select className="form-select" value={destination} onChange={(e) => setDestination(e.target.value)} aria-label="Destination">
                        <option>All Destinations</option>
                        {destinations.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    <select className="form-select" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Trip stage">
                        <option>All Stages</option>
                        {stages.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <Link to={P.packages} style={{ ...pillLink, background: 'var(--bg-card-alt, #f8fafc)', color: 'var(--text-primary, #0f172a)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                        <Icon name="package" /> Package Catalog
                    </Link>
                    <Link to={P.createTrip} style={{ ...pillLink, padding: '10px 20px', background: 'linear-gradient(135deg,#0ea5e9,#14b8a6)', color: 'white', border: 'none' }}>
                        <Icon name="plus" /> Create New Package
                    </Link>
                </div>
                <div className="card">
                    <div className="table-container p-0">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                    <th className="p-4 font-semibold">Trip ID</th>
                                    <th className="p-4 font-semibold">Traveler Name</th>
                                    <th className="p-4 font-semibold text-center">Destination</th>
                                    <th className="p-4 font-semibold text-center">Trip Dates</th>
                                    <th className="p-4 font-semibold text-center">Vendor Status</th>
                                    <th className="p-4 font-semibold text-center">Guide Assigned</th>
                                    <th className="p-4 font-semibold text-center">Trip Stage</th>
                                    <th className="p-4 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {trips.length ? trips.map((trip) => {
                                    const done = trip.status === 'completed';
                                    const guideStatus = trip.guide ? `${trip.guide.name} (${done ? 'Completed' : trip.guideStatus})` : 'Pending';
                                    const vendorStatus = trip.vendor ? `${trip.vendor.name} (${done ? 'Completed' : trip.vendorStatus})` : 'Pending';
                                    return (
                                        <tr key={trip.id} className="hover:bg-gray-50 transition-colors" style={done ? { opacity: 0.75 } : trip.status === 'cancelled' ? { opacity: 0.6 } : undefined}>
                                            <td className="p-4"><span className="font-semibold text-blue-600">{trip.id}</span></td>
                                            <td className="p-4 font-medium text-gray-900">{trip.travelerName}</td>
                                            <td className="p-4 text-gray-600 text-center">{trip.destination}</td>
                                            <td className="p-4 text-gray-600 text-center">{formatDateRange(trip)}</td>
                                            <td className="p-4 text-center"><StatusBadge label={vendorStatus} /></td>
                                            <td className="p-4 text-center"><StatusBadge label={guideStatus} /></td>
                                            <td className="p-4 text-center"><StatusBadge label={statusLabel(trip)} /></td>
                                            <td className="p-4 text-center">{rowActions(trip)}</td>
                                        </tr>
                                    );
                                }) : <tr><td colSpan={8} className="p-4 text-center text-gray-500">No trips found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="pagination">
                        <span className="text-sm text-gray-500">Showing {trips.length ? `1-${trips.length}` : 0} of {trips.length} trips</span>
                        <div className="flex gap-2">
                            <button type="button" className="page-btn" disabled>Previous</button>
                            <button type="button" className="page-btn active">1</button>
                            <button type="button" className="page-btn" disabled>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
