import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout, { useHeaderSearch } from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useBackendTrips } from '../../hooks/useBackendTrips';
import { useOperation } from '../../hooks/usePortal';
import { PATHS } from '../../routes/paths';
import { tripsApi } from '../../services/api';
import {
    deleteTripLocal, exportTripsCsv, formatDate, formatMoney, getDestinationCoverPhoto, isTripPaid, tripDisplayStatus, tripRevenue,
} from '../../services/workflow';

const SU = PATHS.superuser;

function TripCard({ trip, onView, onDelete, openRefundModal, openBudgetShareModal }) {
    const status = tripDisplayStatus(trip);
    const isCancelled = status === 'Cancelled' || trip.status === 'cancelled';
    const ref = trip.refundRecord;
    const isRefunded = ref && ref.processed;
    const paid = isTripPaid(trip);
    const badgeClass = status === 'Completed' ? 'sa-tc-completed' : isCancelled ? 'sa-tc-cancelled' : status === 'Ongoing' || status === 'In Progress' ? 'sa-tc-ongoing' : 'sa-tc-upcoming';
    const disbursed = trip.budgetShare?.disbursed;

    return (
        <div className="sa-trip-card" data-status={status} style={{ overflow: 'hidden', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', background: 'var(--card,#fff)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', height: 140, overflow: 'hidden' }}>
                <img src={getDestinationCoverPhoto(trip, 800)} alt={trip.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.85)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 70%)' }} />
                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}><span className={`sa-tc-badge ${badgeClass}`}>{status}</span></div>
                <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, zIndex: 2, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="mappin" style={{ color: '#38bdf8' }} /> {trip.destination || 'Destination'}
                </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 className="sa-tc-title" style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 800, color: 'var(--foreground,#0f172a)' }}>{trip.title}</h3>
                <div className="sa-tc-details" style={{ marginBottom: 14 }}>
                    <div className="sa-tc-detail"><Icon name="calendar" /> {formatDate(trip.startDate)} - {formatDate(trip.endDate)}</div>
                    <div className="sa-tc-detail"><Icon name="users" /> {trip.travelersCount || 1} Travelers &bull; {trip.travelerName || 'Traveler'}</div>
                    <div className="sa-tc-detail"><Icon name="compass" /> Guide: {trip.guide?.name || 'Unassigned'}</div>
                </div>
                <div className="sa-tc-footer" style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border,#e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div className="sa-tc-price" style={{ fontSize: 18, fontWeight: 800, color: '#0ea5e9' }}>{formatMoney(Number(trip.budget || 0))}</div>
                    <div className="sa-tc-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button type="button" className="sa-tc-btn sa-tc-view" onClick={onView}><Icon name="eye" /> View</button>
                        {isCancelled && !paid && (
                            <button type="button" className="sa-tc-btn" disabled title="Trip was cancelled before payment was completed" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 600, opacity: 0.85, cursor: 'not-allowed' }}><Icon name="xcircle" /> No Refund Required (Unpaid)</button>
                        )}
                        {isCancelled && paid && isRefunded && (
                            <button type="button" className="sa-tc-btn" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }} onClick={() => openRefundModal(trip.id)}><Icon name="check" /> Refunded {formatMoney(ref.refundAmount)}</button>
                        )}
                        {isCancelled && paid && !isRefunded && (
                            <button type="button" className="sa-tc-btn" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontWeight: 700 }} onClick={() => openRefundModal(trip.id)}><Icon name="creditcard" /> Process Refund</button>
                        )}
                        {!isCancelled && status === 'Completed' && (
                            <>
                                <button type="button" className="sa-tc-btn" style={{ background: disbursed ? '#e0f2fe' : 'linear-gradient(135deg,#10b981,#059669)', color: disbursed ? '#0369a1' : '#fff', fontWeight: 700 }} onClick={() => openBudgetShareModal(trip.id)}>
                                    <Icon name="dollar" /> {disbursed ? 'Shares Paid' : 'Disburse Share'}
                                </button>
                                <button type="button" className="sa-tc-btn sa-tc-delete" disabled title="Completed trips cannot be deleted" style={{ opacity: 0.5, cursor: 'not-allowed' }}><Icon name="lock" /> Protected</button>
                            </>
                        )}
                        {!isCancelled && status !== 'Completed' && (
                            <button type="button" className="sa-tc-btn sa-tc-delete" onClick={onDelete}><Icon name="trash" /> Delete</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** superuser_trips.html (CRUD.renderTrips + applyTripFilters). */
export default function SuperuserTrips() {
    const navigate = useNavigate();
    const { confirm, toast, openRefundModal, openBudgetShareModal } = useUI();
    const operate = useOperation();
    const headerQuery = useHeaderSearch();
    const { trips, loading, error, reloadAll } = useBackendTrips();
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');

    const q = (query || headerQuery).toLowerCase();
    const visible = trips.filter((trip) => {
        const status = tripDisplayStatus(trip);
        const text = `${status} ${trip.destination} ${trip.title} ${trip.travelerName} ${trip.guide?.name || ''} ${trip.partner?.name || ''}`.toLowerCase();
        return (!q || text.includes(q)) && (statusFilter === 'All Status' || status === statusFilter);
    });

    const remove = async (trip) => {
        const ok = await confirm({ title: 'Confirm Deletion', message: `Are you sure you want to permanently delete ${trip.title}? This cannot be undone.`, confirmText: 'Delete', tone: 'red' });
        if (!ok) return;
        operate(async () => {
            if (trip.status === 'completed') {
                toast('Completed trips cannot be deleted as they form part of historical records.', 'warning');
                return;
            }
            try {
                await tripsApi.remove(trip.id);
            } catch (err) {
                // Trips that only exist in the workflow state are not known to /trips.
                if (err.status !== 404) { toast(`Delete failed: ${err.message}`, 'error'); return; }
            }
            deleteTripLocal(trip.id);
            toast(`${trip.title} deleted successfully.`, 'success');
            await reloadAll();
        });
    };

    const stats = [
        ['sa-stat-blue', 'plane', 'Total Trips', trips.length],
        ['sa-stat-green', 'activity', 'Ongoing', trips.filter((t) => t.status === 'ongoing').length],
        ['sa-stat-orange', 'clock', 'Upcoming', trips.filter((t) => ['requested', 'planning'].includes(t.status)).length],
        ['sa-stat-pink', 'checkcircle', 'Completed', trips.filter((t) => t.status === 'completed').length],
        ['sa-stat-purple', 'dollar', 'Total Revenue', formatMoney(tripRevenue(trips))],
    ];

    return (
        <DashboardLayout role="superuser" page="superuser__superuser_trips">
            <div className="sa-dashboard-container sa-dashboard">
                <div className="sa-page-header">
                    <div>
                        <h1>Trip Management</h1>
                        <p>Monitor and manage all platform trips</p>
                    </div>
                    <button type="button" className="sa-btn-primary" onClick={() => navigate(SU.addTrip)}><Icon name="plus" /> Create Trip</button>
                </div>
                <div className="sa-stats-grid-5">
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
                            <input type="text" placeholder="Search by name, location, or partner..." id="sa-trip-search" value={query} onChange={(e) => setQuery(e.target.value)} />
                        </div>
                    </div>
                    <div className="sa-filter-right">
                        <select className="sa-select" id="sa-trip-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status">
                            <option>All Status</option>
                            <option>Ongoing</option>
                            <option>Upcoming</option>
                            <option>Completed</option>
                        </select>
                    </div>
                </div>
                <div className="sa-table-toolbar">
                    <button type="button" className="sa-btn-outline-sm" id="sa-export-trips-btn" onClick={() => exportTripsCsv(trips)}><Icon name="clouddownload" /> Export Report</button>
                    <span className="sa-table-count">{loading && !trips.length ? 'Syncing with database...' : `Showing ${visible.length} of ${trips.length} trips${error ? ` (live /trips unavailable: ${error})` : ''}`}</span>
                </div>
                <div className="sa-trip-cards-grid" id="sa-trips-container">
                    {visible.length ? visible.map((trip) => (
                        <TripCard
                            key={trip.id}
                            trip={trip}
                            onView={() => navigate(`${SU.viewTrip}?id=${encodeURIComponent(trip.id)}`)}
                            onDelete={() => remove(trip)}
                            openRefundModal={openRefundModal}
                            openBudgetShareModal={openBudgetShareModal}
                        />
                    )) : <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#64748b' }}>No trips found.</div>}
                </div>
            </div>
        </DashboardLayout>
    );
}
