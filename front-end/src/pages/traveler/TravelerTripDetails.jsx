import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import StatusBadge from '../../components/StatusBadge';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import { PATHS } from '../../routes/paths';
import {
    formatDateRange, formatMoney, initialsFor, latestTravelerTrip, scheduleStatusText, statusLabel, tripSchedule,
} from '../../services/workflow';

/** Trip details of the traveler's latest active trip (renderTravelerTripDetails). */
export default function TravelerTripDetails() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const { openPaymentModal } = useUI();
    const actions = useWorkflowActions();
    const trip = latestTravelerTrip(state);

    if (!trip) {
        return (
            <DashboardLayout role="traveler" page="traveler__traveler_trip_details" activeNav={PATHS.traveler.myTrips}>
                <div className="page-content">
                    <div className="page-header"><h1>Trip Details</h1><p>No trip details yet.</p></div>
                    <div className="detail-card"><div className="detail-card-title">Trip Overview</div><p style={{ color: '#64748b' }}>Create a trip request first. Real trip details, assigned guide, vendor services, and progress will appear here.</p></div>
                </div>
            </DashboardLayout>
        );
    }

    const vendorItems = tripSchedule(trip).filter((item) => item.owner === 'vendor');
    const needsPayment = trip.paymentStatus !== 'Paid' && trip.status !== 'cancelled' && trip.status !== 'completed';
    const paidAwaitingStart = trip.paymentStatus === 'Paid' && !trip.scheduleStarted && trip.status !== 'ongoing' && trip.status !== 'completed';
    const isPendingCancel = trip.cancellationRequested && trip.cancellationStatus === 'Pending';
    const canCancel = !['completed', 'cancelled'].includes(trip.status);
    const payButton = (label) => (
        <button type="button" className="t-btn t-btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800 }} onClick={() => openPaymentModal(trip.id)}>{label}</button>
    );

    return (
        <DashboardLayout role="traveler" page="traveler__traveler_trip_details" activeNav={PATHS.traveler.myTrips}>
            <div className="page-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div className="page-header" style={{ marginBottom: 0 }}>
                        <h1>{trip.title}</h1>
                        <p>{statusLabel(trip)} - {trip.id}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {needsPayment && payButton(<><Icon name="creditcard" /> Complete Payment ({formatMoney(trip.budget || 1200)})</>)}
                        {canCancel && (isPendingCancel ? (
                            <button type="button" className="t-btn t-btn-outline-yellow" style={{ opacity: 0.75, cursor: 'not-allowed' }} disabled title="Cancellation request has been sent to Travel Partner"><Icon name="clock" /> Pending Approval</button>
                        ) : (
                            <button type="button" className="t-btn t-btn-outline-yellow" onClick={() => actions.cancelTrip(trip.id)}><Icon name="x" /> Cancel Trip</button>
                        ))}
                    </div>
                </div>

                {needsPayment && (
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid #10b981', color: '#065f46', padding: '14px 18px', borderRadius: 14, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Icon name="creditcard" style={{ color: '#10b981', width: 22, height: 22 }} />
                            <div>
                                <strong style={{ color: 'var(--text-primary,#0f172a)', fontSize: 15 }}>Payment Pending ({formatMoney(trip.budget || 1200)})</strong>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary,#475569)' }}>Complete your payment to confirm your booking and prepare for departure.</div>
                            </div>
                        </div>
                        {payButton('Pay Now')}
                    </div>
                )}
                {paidAwaitingStart && (
                    <div style={{ background: 'rgba(14,165,233,0.08)', border: '1.5px solid #0ea5e9', color: '#0369a1', padding: '14px 18px', borderRadius: 14, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Icon name="checkcircle" style={{ color: '#0ea5e9', width: 22, height: 22 }} />
                            <div>
                                <strong style={{ color: 'var(--text-primary,#0f172a)', fontSize: 15 }}>Payment Completed • Awaiting Travel Partner to Start Trip</strong>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary,#475569)' }}>Your payment is confirmed. Your Travel Partner will start your trip upon departure.</div>
                            </div>
                        </div>
                        <span className="meta-chip blue" style={{ padding: '6px 14px', fontSize: '0.85rem', fontWeight: 700 }}><Icon name="clock" style={{ width: 14, height: 14 }} /> Awaiting Partner</span>
                    </div>
                )}
                {isPendingCancel && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 500 }}>
                        <Icon name="alertcircle" style={{ color: '#ef4444', width: 18, height: 18 }} />
                        <div><strong>Cancellation Requested:</strong> Your cancellation request has been sent to your Travel Partner for review and approval.</div>
                    </div>
                )}

                <div className="detail-layout">
                    <div>
                        <div className="detail-card">
                            <div className="detail-card-title">Trip Overview</div>
                            <div className="overview-grid">
                                <div className="overview-item"><div className="o-icon"><Icon name="mappin" /></div><div><div className="o-label">Destination</div><div className="o-value">{trip.destination}</div></div></div>
                                <div className="overview-item"><div className="o-icon"><Icon name="calendar" /></div><div><div className="o-label">Travel Dates</div><div className="o-value">{formatDateRange(trip)}</div></div></div>
                                <div className="overview-item"><div className="o-icon"><Icon name="hash" /></div><div><div className="o-label">Trip ID</div><div className="o-value">{trip.id}</div></div></div>
                                <div className="overview-item"><div className="o-icon"><Icon name="users" /></div><div><div className="o-label">Travelers</div><div className="o-value">{trip.travelersCount}</div></div></div>
                            </div>
                        </div>
                        <div className="detail-card">
                            <div><div className="detail-card-title">Trip Progress</div><div>{trip.progress}% Complete</div></div>
                            <div className="t-progress"><div className="t-progress-bar" style={{ width: `${Math.min(100, trip.progress)}%` }} /></div>
                            <div className="action-bar-grid">
                                <button type="button" className="ab-btn bg-teal" onClick={() => navigate(PATHS.traveler.schedule)}><Icon name="calendar" /> View Schedule</button>
                                <button type="button" className="ab-btn bg-purple" onClick={() => navigate(PATHS.traveler.progress)}><Icon name="activity" /> Track Progress</button>
                                <button type="button" className="ab-btn bg-orange" onClick={() => navigate(PATHS.traveler.reportIssue)}><Icon name="alert" /> Report Issue</button>
                            </div>
                        </div>
                        <div className="detail-card">
                            <div className="detail-card-title">Vendor Services</div>
                            {trip.vendor ? vendorItems.slice(0, 4).map((item) => (
                                <div className="vendor-row" key={item.id}>
                                    <div className="v-left">
                                        <div className="v-icon"><Icon name="truck" /></div>
                                        <div><div className="v-name">{trip.vendor.name}</div><div className="v-desc">{item.title} - {item.location}</div></div>
                                    </div>
                                    <StatusBadge label={scheduleStatusText(item.status)} />
                                </div>
                            )) : <p style={{ color: '#64748b' }}>Vendor not assigned yet.</p>}
                        </div>
                    </div>
                    <div>
                        <div className="widget-grad w-gradient-pink">
                            <div className="detail-card-title">Travel Partner</div>
                            <p>Your travel partner will manage assignments after accepting the request.</p>
                            <button type="button" className="w-btn" onClick={() => navigate(PATHS.traveler.messages)}><Icon name="message" /> Contact Partner</button>
                        </div>
                        <div className="detail-card">
                            <div className="detail-card-title">Your Tour Guide</div>
                            {trip.guide ? (
                                <div className="w-contact">
                                    <div className="w-avatar">{trip.guide.initials || initialsFor(trip.guide.name)}</div>
                                    <div className="w-details"><h4>{trip.guide.name}</h4><p>{trip.guideStatus}</p></div>
                                </div>
                            ) : <p style={{ color: '#64748b' }}>Guide not assigned yet.</p>}
                        </div>
                        <div className="widget-grad w-gradient-blue">
                            <div className="detail-card-title">Need Help?</div>
                            <p>Support messages and issue reports are connected to this trip.</p>
                            <button type="button" className="w-btn" onClick={() => navigate(PATHS.traveler.messages)}>Contact Support <Icon name="arrowright" /></button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
