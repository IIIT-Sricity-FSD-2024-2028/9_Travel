import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { PATHS } from '../../routes/paths';
import { allActiveTrips, formatDateRange, formatMoney, tripsForCurrentUser } from '../../services/workflow';

const FILTERS = [['all', 'All Trips'], ['requested', 'Requested'], ['ongoing', 'Ongoing'], ['upcoming', 'Upcoming'], ['completed', 'Completed']];
const ORDER = { requested: 0, planning: 1, ready: 2, ongoing: 3, completed: 4 };
const pctStyle = { fontWeight: 700, fontSize: 13, color: 'var(--text-secondary,#64748b)' };
const noteStyle = { fontSize: 12, color: 'var(--text-secondary,#94a3b8)', display: 'flex', alignItems: 'center', gap: 6 };

function TripCard({ trip, actions, openPaymentModal, go }) {
    let progressPct = Number(trip.progress) || 0;
    if (trip.status === 'completed') progressPct = 100;
    else if (trip.status === 'ongoing') progressPct = progressPct || 65;
    else if (trip.status === 'ready') progressPct = Math.max(50, progressPct);
    else if (trip.status === 'planning') progressPct = Math.max(25, progressPct);
    else if (trip.status === 'requested') progressPct = 10;

    const iconClass = trip.status === 'ongoing' ? 'green' : trip.status === 'completed' ? 'gray' : 'blue';
    const iconName = trip.status === 'completed' ? 'checkcircle' : 'plane';
    const isPendingCancel = trip.cancellationRequested && trip.cancellationStatus === 'Pending';

    let statusBadge;
    if (isPendingCancel) statusBadge = <span className="badge-pill" style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 600, fontSize: 12, padding: '4px 12px', borderRadius: 20 }}>Cancellation Pending</span>;
    else if (trip.status === 'requested') statusBadge = <span className="badge-pill" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: 12, padding: '4px 12px', borderRadius: 20 }}>Requested</span>;
    else if (trip.status === 'ongoing') statusBadge = <><span className="badge-pill badge-ongoing">Ongoing</span><span style={pctStyle}>{progressPct}%</span></>;
    else if (trip.status === 'completed') statusBadge = <><span className="badge-pill badge-completed">Completed</span><span style={pctStyle}>100%</span></>;
    else if (trip.status === 'ready') statusBadge = <><span className="badge-pill badge-upcoming">Ready</span><span style={pctStyle}>{progressPct}%</span></>;
    else statusBadge = <><span className="badge-pill badge-upcoming">Planning</span><span style={pctStyle}>{progressPct}%</span></>;

    let helper = null;
    if (isPendingCancel) helper = <div style={{ fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="alert" /> Cancellation request submitted • Awaiting Travel Partner approval</div>;
    else if (trip.status === 'requested') helper = <div style={noteStyle}><Icon name="clock" /> Waiting for travel partner approval</div>;
    else if (trip.status === 'planning') helper = <div style={noteStyle}><Icon name="clock" /> Schedule is being prepared, please be patient</div>;
    else if (trip.status === 'ready' || (trip.guideStatus === 'Accepted' && trip.vendorStatus === 'Accepted')) {
        helper = trip.paymentStatus === 'Paid'
            ? <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="checkcircle" /> Payment Completed • Ready for departure</div>
            : <div style={{ fontSize: 12, color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="creditcard" /> Guide &amp; Vendor confirmed • Payment Required before trip starts</div>;
    } else if (trip.status === 'ongoing') helper = <div style={noteStyle}><Icon name="activity" /> Active tour underway ({trip.currentLocation || trip.destination})</div>;
    else if (trip.status === 'completed') helper = <div style={noteStyle}><Icon name="checkcircle" /> Completed Progress - 100%</div>;

    const cancelBtn = isPendingCancel
        ? <button type="button" className="t-btn t-btn-outline-yellow" style={{ flex: 1, opacity: 0.75, cursor: 'not-allowed' }} disabled title="Cancellation request has been sent to Travel Partner"><Icon name="clock" /> Pending Approval</button>
        : <button type="button" className="t-btn t-btn-outline-yellow" style={{ flex: 1 }} onClick={() => actions.cancelTrip(trip.id)}><Icon name="x" /> Cancel</button>;
    const messageBtn = (label) => <button type="button" className="t-btn t-btn-outline-purple" onClick={() => go(PATHS.traveler.messages)}><Icon name="message" /> {label}</button>;

    let actionBlock;
    if (trip.status === 'requested') {
        actionBlock = (
            <div className="t-actions">
                {helper}
                {isPendingCancel
                    ? <button type="button" className="t-btn t-btn-outline-yellow" style={{ opacity: 0.75, cursor: 'not-allowed' }} disabled><Icon name="clock" /> Cancellation Pending</button>
                    : <button type="button" className="t-btn t-btn-outline-yellow" onClick={() => actions.cancelTrip(trip.id)}><Icon name="x" /> Cancel Request</button>}
                {messageBtn('Message Partner')}
            </div>
        );
    } else if (['planning', 'ready'].includes(trip.status)) {
        const needsPayment = trip.paymentStatus !== 'Paid' && trip.status !== 'cancelled' && trip.status !== 'completed';
        const canCardStart = trip.paymentStatus === 'Paid' && !trip.scheduleStarted && trip.status !== 'ongoing' && trip.status !== 'completed';
        actionBlock = (
            <div className="t-actions">
                {helper}
                {needsPayment && (
                    <button type="button" className="t-btn t-btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, boxShadow: '0 6px 16px rgba(16,185,129,0.3)' }} onClick={() => openPaymentModal(trip.id)}>
                        <Icon name="creditcard" /> Complete Payment ({formatMoney(trip.budget || 1200)})
                    </button>
                )}
                {canCardStart && (
                    <div className="meta-chip blue" style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}>
                        <Icon name="clock" style={{ width: 14, height: 14 }} /> Paid • Awaiting Partner to Start
                    </div>
                )}
                <button type="button" className="t-btn t-btn-primary" onClick={() => go(PATHS.traveler.tripDetails)}>View Details <Icon name="arrowright" /></button>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="t-btn t-btn-outline-blue" style={{ flex: 1 }} onClick={() => go(`${PATHS.traveler.editUpcoming}?trip=${trip.id}`)}><Icon name="edit" /> Edit</button>
                    {cancelBtn}
                </div>
                {messageBtn('Contact Partner')}
            </div>
        );
    } else if (trip.status === 'ongoing') {
        actionBlock = (
            <div className="t-actions">
                {helper}
                <button type="button" className="t-btn t-btn-primary" onClick={() => go(PATHS.traveler.tripDetails)}>View Details <Icon name="arrowright" /></button>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="t-btn t-btn-outline-blue" style={{ flex: 1 }} onClick={() => go(PATHS.traveler.schedule)}><Icon name="calendar" /> Schedule</button>
                    <button type="button" className="t-btn t-btn-outline-purple" style={{ flex: 1 }} onClick={() => go(PATHS.traveler.progress)}><Icon name="activity" /> Progress</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="t-btn t-btn-outline-blue" style={{ flex: 1 }} onClick={() => go(`${PATHS.traveler.editOngoing}?trip=${trip.id}`)}><Icon name="edit" /> Edit</button>
                    {cancelBtn}
                </div>
                {messageBtn('Contact Partner')}
            </div>
        );
    } else if (trip.status === 'completed') {
        actionBlock = (
            <div className="t-actions">
                {helper}
                <button type="button" className="t-btn t-btn-primary" onClick={() => go(PATHS.traveler.tripDetails)}><Icon name="checkcircle" /> Trip Summary</button>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="t-btn t-btn-outline-blue" style={{ flex: 1 }} onClick={() => go(PATHS.traveler.schedule)}><Icon name="calendar" /> View Schedule</button>
                    <button type="button" className="t-btn t-btn-outline-purple" style={{ flex: 1 }} onClick={() => go(PATHS.traveler.messages)}><Icon name="message" /> Message</button>
                </div>
            </div>
        );
    } else {
        actionBlock = (
            <div className="t-actions">
                {helper}
                <button type="button" className="t-btn t-btn-primary" onClick={() => go(PATHS.traveler.tripDetails)}>View Details <Icon name="arrowright" /></button>
                {messageBtn('Contact Partner')}
            </div>
        );
    }

    const cardStyle = trip.status === 'completed' ? { borderLeft: '4px solid #22c55e', opacity: 0.88 } : trip.status === 'cancelled' ? { borderLeft: '4px solid #ef4444', opacity: 0.7 } : undefined;
    return (
        <div className={`trip-card ${trip.status === 'requested' ? 'requested' : trip.status === 'completed' ? 'completed' : ''}`} style={cardStyle}>
            <div className="trip-card-header">
                <div className={`t-icon ${iconClass}`}><Icon name={iconName} /></div>
                <div>
                    <div className="t-title">{trip.title}</div>
                    <div className="t-id">{trip.id}</div>
                </div>
            </div>
            <div className="t-info">
                <div className="t-info-row"><Icon name="mappin" /> {trip.destination}</div>
                <div className="t-info-row"><Icon name="calendar" /> {formatDateRange(trip)}</div>
                <div className="t-info-row"><Icon name="users" /> {trip.travelersCount} traveler{trip.travelersCount === 1 ? '' : 's'}</div>
                <div className="t-info-row"><Icon name="user" /> Guide: {trip.guide?.name || 'Pending'} {trip.guideStatus ? `(${trip.status === 'completed' ? 'Completed' : trip.guideStatus})` : ''}</div>
                <div className="t-info-row"><Icon name="truck" /> Vendor: {trip.vendor?.name || 'Pending'} {trip.vendorStatus ? `(${trip.status === 'completed' ? 'Completed' : trip.vendorStatus})` : ''}</div>
            </div>
            <div className="t-status-row">{statusBadge}</div>
            {trip.status !== 'requested' && <div className="t-progress" style={{ marginBottom: 16 }}><div className="t-progress-bar" style={{ width: `${Math.min(100, progressPct)}%` }} /></div>}
            {actionBlock}
        </div>
    );
}

export default function TravelerMyTrips() {
    const state = useWorkflowState();
    const actions = useWorkflowActions();
    const { openPaymentModal } = useUI();
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');

    const allTrips = tripsForCurrentUser(allActiveTrips(state)).slice().sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || new Date(b.updatedAt) - new Date(a.updatedAt));
    const trips = allTrips.filter((trip) => {
        if (filter === 'all') return true;
        if (filter === 'requested') return trip.status === 'requested';
        if (filter === 'ongoing') return trip.status === 'ongoing';
        if (filter === 'upcoming') return ['planning', 'ready', 'upcoming'].includes(trip.status);
        if (filter === 'completed') return trip.status === 'completed';
        return true;
    });

    return (
        <DashboardLayout role="traveler" page="traveler__traveler_mytrips">
            <div className="page-content">
                <div className="page-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, marginBottom: 4 }}>My Trips</h1>
                        <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>View and manage all your travel adventures</p>
                    </div>
                    <button type="button" className="btn-gradient" onClick={() => navigate(PATHS.traveler.createTripPlan)}>
                        <Icon name="plus" /> Create New Trip Plan
                    </button>
                </div>

                <div className="info-banner">
                    <Icon name="edit" />
                    You can edit, cancel, or delete trips * Contact your travel partner for assistance
                </div>

                <div className="filter-tabs">
                    {FILTERS.map(([key, label]) => (
                        <button key={key} type="button" className={`filter-pill${filter === key ? ' active' : ''}`} data-filter={key} onClick={() => setFilter(key)}>{label}</button>
                    ))}
                </div>

                <div className="trips-grid">
                    {trips.length ? trips.map((trip) => (
                        <TripCard key={trip.id} trip={trip} actions={actions} openPaymentModal={openPaymentModal} go={navigate} />
                    )) : (
                        <div className="card" style={{ gridColumn: '1 / -1', padding: '36px 20px', textAlign: 'center', borderRadius: 16 }}>
                            <div style={{ fontSize: 32, marginBottom: 12 }}><Icon name="plane" /></div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>No {filter === 'all' ? '' : `${filter} `}trips found</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', marginBottom: 16 }}>{filter === 'all' ? 'Create a new trip request to start your travel adventure.' : 'No trips currently in this stage.'}</div>
                            {filter === 'all' && (
                                <button type="button" className="t-btn t-btn-primary" style={{ margin: '0 auto', maxWidth: 220 }} onClick={() => navigate(PATHS.traveler.createTripPlan)}><Icon name="plus" /> Create Trip Plan</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
