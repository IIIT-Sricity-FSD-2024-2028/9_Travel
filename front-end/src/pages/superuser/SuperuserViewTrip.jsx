import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import {
    formatDateRange, formatMoney, getDestinationCoverPhoto, isTripPaid, scheduleStats, scheduleStatusText, statusLabel, tripSchedule,
} from '../../services/workflow';

const SU = PATHS.superuser;
const BADGES = {
    cancelled: ['rgba(239, 68, 68, 0.3)', '#fca5a5', 'rgba(244, 63, 94, 0.6)'],
    completed: ['rgba(16, 185, 129, 0.3)', '#6ee7b7', 'rgba(16, 185, 129, 0.6)'],
    ongoing: ['rgba(14, 165, 233, 0.3)', '#7dd3fc', 'rgba(14, 165, 233, 0.6)'],
    'in-progress': ['rgba(14, 165, 233, 0.3)', '#7dd3fc', 'rgba(14, 165, 233, 0.6)'],
    requested: ['rgba(245, 158, 11, 0.3)', '#fde68a', 'rgba(245, 158, 11, 0.6)'],
    planning: ['rgba(245, 158, 11, 0.3)', '#fde68a', 'rgba(245, 158, 11, 0.6)'],
};
const pill = (bg, color, border) => ({ background: bg, color, border: `1px solid ${border}`, backdropFilter: 'blur(8px)', padding: '6px 16px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' });

function findTrip(trips, requestedId) {
    if (!requestedId) return null;
    const req = String(requestedId).toLowerCase().trim().replace(/^#/, '');
    return trips.find((item) => {
        const id = String(item.id || '').toLowerCase().trim().replace(/^#/, '');
        const rid = String(item.requestId || '').toLowerCase().trim().replace(/^#/, '');
        return id === req || rid === req || id.endsWith(req) || rid.endsWith(req);
    }) || null;
}

function CancellationBanner({ trip, paid, isRefunded, openRefundModal }) {
    const ref = trip.refundRecord;
    if (!paid) {
        return (
            <div style={{ background: 'rgba(241,245,249,0.9)', border: '1.5px solid #cbd5e1', borderRadius: 14, padding: '18px 24px', marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="xcircle" /> Trip Cancelled — No Payout or Refund Required</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>This trip was cancelled before payment was completed by the traveler. Zero funds were collected, so no monetary refund is necessary.</div>
                </div>
                <div><span className="sa-tc-badge" style={{ background: '#e2e8f0', color: '#475569', fontWeight: 700, padding: '8px 16px', borderRadius: 8 }}>Unpaid Trip</span></div>
            </div>
        );
    }
    return (
        <div style={{ background: isRefunded ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.12)', border: `1.5px solid ${isRefunded ? '#10b981' : '#f59e0b'}`, borderRadius: 14, padding: '18px 24px', marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: isRefunded ? '#065f46' : '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name={isRefunded ? 'check' : 'creditcard'} /> {isRefunded ? 'Trip Cancelled & Refund Processed' : 'Trip Cancelled — Refund Authorization Pending'}
                </div>
                <div style={{ fontSize: 13, color: isRefunded ? '#047857' : '#b45309', marginTop: 4 }}>
                    {isRefunded ? `Refund of ${formatMoney(ref.refundAmount)} (${ref.refundPercent}%) was issued to ${ref.destinationAccount}.` : 'Traveler cancellation request approved. Super Admin authorization is required to process the refund.'}
                </div>
            </div>
            <div>
                {isRefunded ? (
                    <button type="button" className="sa-btn-primary" style={{ background: '#10b981', color: '#fff', borderRadius: 10, fontSize: 13, padding: '9px 18px', fontWeight: 700 }} onClick={() => openRefundModal(trip.id)}><Icon name="check" /> View Refund Details</button>
                ) : (
                    <button type="button" className="sa-btn-primary" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', borderRadius: 10, fontSize: 14, padding: '10px 22px', fontWeight: 800, boxShadow: '0 4px 14px rgba(245,158,11,0.35)' }} onClick={() => openRefundModal(trip.id)}><Icon name="creditcard" /> Process Refund Now</button>
                )}
            </div>
        </div>
    );
}

/** superuser_view_trip.html (renderSuperuserTripDetails). */
export default function SuperuserViewTrip() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const { openRefundModal } = useUI();
    const [params] = useSearchParams();
    const requestedId = params.get('id') || params.get('trip') || params.get('requestId');
    const trips = state.trips || [];
    const trip = findTrip(trips, requestedId) || (requestedId ? null : trips[0] || null);
    const backLink = <Link to={SU.trips} className="sa-back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#38bdf8', textDecoration: 'none', marginBottom: 16 }}><Icon name="arrowleft" /> Back to Trips</Link>;

    if (!trip) {
        return (
            <DashboardLayout role="superuser" page="superuser__superuser_view_trip" activeNav={SU.trips}>
                <div className="sa-dashboard-container sa-dashboard">
                    <div className="sa-form-layout" style={{ padding: 32 }}>
                        <div className="sa-form-main">
                            {backLink}
                            <div className="sa-form-header">
                                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary,#0f172a)' }}>Trip Not Found</h1>
                                <p style={{ color: 'var(--text-secondary,#64748b)' }}>No trip record matching ID &quot;{requestedId || 'None'}&quot;.</p>
                            </div>
                            <div className="sa-form-card" style={{ marginTop: 20, padding: 24, color: 'var(--text-secondary,#64748b)' }}>Please return to the Trips page and select a valid trip to view details.</div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const stats = scheduleStats(trip);
    const isCancelled = trip.status === 'cancelled';
    const ref = trip.refundRecord;
    const isRefunded = Boolean(ref && ref.processed);
    const paid = isTripPaid(trip);
    const [badgeBg, badgeColor, badgeBorder] = BADGES[(trip.status || 'planned').toLowerCase()] || ['rgba(59, 130, 246, 0.3)', '#93c5fd', 'rgba(59, 130, 246, 0.6)'];

    return (
        <DashboardLayout role="superuser" page="superuser__superuser_view_trip" activeNav={SU.trips}>
            <div className="sa-dashboard-container sa-dashboard">
                <div className="sa-form-layout">
                    <div className="sa-form-main">
                        {backLink}
                        <div className="trip-hero-section" style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)', minHeight: 300, display: 'flex', alignItems: 'flex-end', marginBottom: 24 }}>
                            <img src={getDestinationCoverPhoto(trip)} alt={trip.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, filter: 'brightness(0.85)' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.45) 50%, rgba(15,23,42,0.1) 100%)', zIndex: 2 }} />
                            <div className="trip-hero-content" style={{ position: 'relative', zIndex: 3, padding: 32, width: '100%', boxSizing: 'border-box' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                                    <span style={{ ...pill(badgeBg, badgeColor, badgeBorder), letterSpacing: '0.08em', textTransform: 'uppercase' }}>{statusLabel(trip)}</span>
                                    {isCancelled && (isRefunded
                                        ? <span style={pill('rgba(16,185,129,0.25)', '#a7f3d0', 'rgba(16,185,129,0.5)')}><Icon name="check" /> REFUNDED</span>
                                        : paid
                                            ? <span style={pill('rgba(245,158,11,0.25)', '#fde68a', 'rgba(245,158,11,0.5)')}><Icon name="alertcircle" /> REFUND ACTION PENDING</span>
                                            : <span style={pill('rgba(148,163,184,0.25)', '#cbd5e1', 'rgba(148,163,184,0.4)')}><Icon name="xcircle" /> UNPAID TRIP</span>)}
                                </div>
                                <h1 className="th-title" style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 10px', textShadow: '0 4px 14px rgba(0,0,0,0.6)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{trip.title}</h1>
                                <div className="th-location" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.95)', fontSize: 16, fontWeight: 600 }}>
                                    <Icon name="mappin" style={{ color: '#38bdf8' }} /> {trip.destination} &bull; <span style={{ color: 'rgba(255,255,255,0.75)' }}>Trip ID: #{trip.id}</span>
                                </div>
                            </div>
                        </div>

                        {isCancelled && <CancellationBanner trip={trip} paid={paid} isRefunded={isRefunded} openRefundModal={openRefundModal} />}

                        <div className="sa-stats-grid-4" style={{ marginTop: 24 }}>
                            <div className="sa-stat-card sa-stat-blue"><div className="sa-stat-icon-wrap"><Icon name="calendar" /></div><div className="sa-stat-number" style={{ fontSize: 14, lineHeight: 1.4 }}>{formatDateRange(trip)}</div><div className="sa-stat-label">Duration</div></div>
                            <div className="sa-stat-card sa-stat-green"><div className="sa-stat-icon-wrap"><Icon name="users" /></div><div className="sa-stat-number">{trip.travelersCount || 1}</div><div className="sa-stat-label">Travelers</div></div>
                            <div className="sa-stat-card sa-stat-purple"><div className="sa-stat-icon-wrap"><Icon name="dollar" /></div><div className="sa-stat-number">{formatMoney(Number(trip.budget || 0))}</div><div className="sa-stat-label">Budget</div></div>
                            <div className="sa-stat-card sa-stat-orange"><div className="sa-stat-icon-wrap"><Icon name="activity" /></div><div className="sa-stat-number">{trip.progress || 0}%</div><div className="sa-stat-label">Progress</div></div>
                        </div>

                        <div className="sa-form-card" style={{ marginTop: 24 }}>
                            <h2 className="sa-section-title">Trip Overview</h2>
                            <p className="sa-section-desc">{trip.notes || 'Live trip record from backend workflow state.'}</p>
                            <div className="sa-info-grid">
                                <div className="sa-info-item"><div className="sai-icon bg-blue"><Icon name="mappin" /></div><div className="sai-text"><div className="sai-label">Destination</div><div className="sai-value">{trip.destination}</div></div></div>
                                <div className="sa-info-item"><div className="sai-icon bg-green"><Icon name="user" /></div><div className="sai-text"><div className="sai-label">Traveler</div><div className="sai-value">{trip.travelerName}</div></div></div>
                                <div className="sa-info-item"><div className="sai-icon bg-purple"><Icon name="compass" /></div><div className="sai-text"><div className="sai-label">Guide</div><div className="sai-value">{trip.guide?.name || 'Pending'}</div></div></div>
                                <div className="sa-info-item"><div className="sai-icon bg-orange"><Icon name="briefcase" /></div><div className="sai-text"><div className="sai-label">Vendor</div><div className="sai-value">{trip.vendor?.name || 'Pending'}</div></div></div>
                            </div>
                        </div>

                        <div className="sa-btn-row" style={{ marginTop: 24 }}>
                            <button type="button" className="sa-btn-primary" onClick={() => navigate(SU.trips)}>Back to Trips</button>
                            {trip.status !== 'completed' && !isCancelled && (
                                <button type="button" className="sa-btn-secondary" onClick={() => navigate(`${SU.editTrip}?id=${encodeURIComponent(trip.id)}`)}><Icon name="edit" /> Edit Trip</button>
                            )}
                            {isCancelled && paid && (isRefunded
                                ? <button type="button" className="sa-btn-primary" style={{ background: '#10b981', fontWeight: 700 }} onClick={() => openRefundModal(trip.id)}><Icon name="check" /> View Refund ({formatMoney(ref.refundAmount)})</button>
                                : <button type="button" className="sa-btn-primary" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', fontWeight: 800, boxShadow: '0 4px 14px rgba(245,158,11,0.35)' }} onClick={() => openRefundModal(trip.id)}><Icon name="creditcard" /> Process Refund</button>)}
                            <button type="button" className="sa-btn-secondary" onClick={() => window.print()}><Icon name="printer" /> Print Details</button>
                        </div>
                    </div>
                    <div className="sa-info-card">
                        <h3 className="sa-section-title" style={{ fontSize: 15 }}>Schedule Progress</h3>
                        <div style={{ marginTop: 12 }}>
                            <div className="sa-stat-label" style={{ marginBottom: 8 }}>Completion</div>
                            <div className="sa-trip-progress-bar" style={{ height: 8 }}><div className="sa-trip-progress-fill" style={{ width: `${stats.percent}%` }} /></div>
                            <div className="sa-act-time" style={{ marginTop: 8, textAlign: 'right' }}>{stats.completed}/{stats.total} completed</div>
                        </div>
                        <div className="sa-activity-list" style={{ padding: '16px 0' }}>
                            {tripSchedule(trip).slice(0, 5).map((item) => (
                                <div className="sa-activity-item" key={item.id}>
                                    <div className="sa-activity-icon sa-ai-blue"><Icon name={item.owner === 'vendor' ? 'truck' : 'user'} /></div>
                                    <div className="sa-activity-content"><div className="sa-act-title">{item.title}</div><div className="sa-act-desc">{scheduleStatusText(item.status)} - {item.location}</div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
