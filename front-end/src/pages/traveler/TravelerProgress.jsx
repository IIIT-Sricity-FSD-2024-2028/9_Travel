import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import StatusBadge from '../../components/StatusBadge';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { useTravelerFocusTrip } from './TravelerSchedule';
import {
    formatDateRange, formatShortDate, relativeTime, scheduleStats, statusLabel, tripDays, tripSchedule,
} from '../../services/workflow';

const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(148,163,184,0.15)', fontSize: 13 };

function QuickActions({ navigate, toast }) {
    return (
        <div className="card-block">
            <div className="cb-title">Quick Actions</div>
            <button type="button" className="quick-action-pill primary" onClick={() => navigate(PATHS.traveler.schedule)}>View Schedule</button>
            <button type="button" className="quick-action-pill" onClick={() => toast('Operation successful.', 'success')}>Share Status</button>
            <button type="button" className="quick-action-pill" onClick={() => navigate(PATHS.traveler.messages)}>Contact Guide</button>
        </div>
    );
}

/** Live trip progress (renderTravelerProgress). */
export default function TravelerProgress() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const { toast } = useUI();
    const [viewingCompleted, setViewingCompleted] = useState(false);
    const { trip, hasCompleted, requested } = useTravelerFocusTrip(state, viewingCompleted);
    const toggle = () => setViewingCompleted((v) => !v);

    const page = (subtitle, content, showBanners = false, extra = null) => (
        <DashboardLayout role="traveler" page="traveler__traveler_progress">
            <div className="page-content">
                <div>
                    <h1>Trip Progress Tracker</h1>
                    <p>{subtitle}</p>
                </div>
                {showBanners && <div className="info-banner"><Icon name="activity" /> Live updates from your Guides &amp; Vendors</div>}
                {extra}
                {content}
            </div>
        </DashboardLayout>
    );

    if (!trip && !viewingCompleted && hasCompleted) {
        return page('No active trip.', (
            <div className="layout-split" style={{ display: 'block' }}>
                <div className="day-card" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: 8 }}>
                        <Icon name="activity" style={{ width: 32, height: 32 }} />
                    </div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>No Active Progress</h3>
                    <p style={{ color: '#64748b', margin: 0, maxWidth: 400, lineHeight: 1.5 }}>Your current trip has been completed or cancelled. You can view your previous trips in the history.</p>
                    <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={toggle}>View Previous Trips History</button>
                </div>
            </div>
        ));
    }
    if (!trip && !viewingCompleted && requested) {
        return page('No active trip.', (
            <div className="layout-split" style={{ display: 'block' }}>
                <div className="day-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                    <Icon name="activity" style={{ width: 48, height: 48, opacity: 0.5, marginBottom: 16 }} />
                    <h3 style={{ color: '#1e293b', margin: '0 0 8px 0' }}>Request Pending</h3>
                    <p style={{ margin: 0 }}>Progress will update once your trip is accepted by the travel partner.</p>
                </div>
            </div>
        ));
    }
    if (!trip) {
        return page('No trip booked yet.', (
            <div className="layout-split" style={{ display: 'block' }}>
                <div className="card-block"><div className="cb-title">Live Progress</div><p style={{ color: '#64748b' }}>Create a trip request first. Progress and real-time stages will update as your trip is coordinated.</p></div>
            </div>
        ));
    }

    let progressPct = 0;
    let stageTitle = 'Trip Requested';
    let stageDesc = 'Your trip request is being reviewed by our Travel Partner.';
    const stats = scheduleStats(trip);
    if (trip.status === 'completed') {
        progressPct = 100;
        stageTitle = 'Trip Completed';
        stageDesc = 'This trip has concluded. Hope you had a wonderful journey!';
    } else if (trip.status === 'ongoing' || trip.scheduleStarted) {
        progressPct = 50 + Math.round(stats.percent * 0.5);
        stageTitle = stats.current?.title || trip.currentActivity || 'Activities In Progress';
        stageDesc = `Currently at ${trip.currentLocation || trip.destination}. Schedule is actively underway.`;
    } else if (trip.status === 'ready') {
        progressPct = 50;
        stageTitle = 'Trip Ready for Departure';
        stageDesc = `Guide (${trip.guide?.name || 'Assigned'}) and Vendor (${trip.vendor?.name || 'Assigned'}) confirmed. Ready for departure on ${formatShortDate(trip.startDate)}.`;
    } else if (trip.status === 'planning') {
        progressPct = 25;
        stageTitle = 'Coordination & Assignment';
        stageDesc = 'Travel partner accepted your booking and is assigning your dedicated guide and services.';
    } else if (trip.status === 'requested') {
        progressPct = 10;
        stageTitle = 'Booking Submitted';
        stageDesc = 'Your booking request has been submitted and is pending Travel Partner confirmation.';
    }

    let stages;
    if (trip.scheduleStarted) {
        stages = tripSchedule(trip).map((item) => ({
            key: item.id,
            cls: item.status === 'completed' ? 'completed' : item.status === 'in-progress' ? 'active' : '',
            title: item.title,
            time: `Day ${item.day} • ${item.time} • ${item.location || trip.destination}`,
            badge: item.status === 'completed' ? 'Completed' : item.status === 'in-progress' ? 'In Progress' : 'Upcoming',
        }));
    } else {
        const isPartnerDone = trip.status !== 'requested';
        const isAssignedDone = Boolean(trip.guide?.name && trip.vendor?.name && trip.guideStatus === 'Accepted' && trip.vendorStatus === 'Accepted');
        const isReadyDone = ['ready', 'ongoing', 'completed'].includes(trip.status);
        stages = [
            { key: 's1', title: 'Trip Request Submitted', time: formatShortDate(trip.createdAt || trip.startDate), cls: 'completed', badge: 'Completed' },
            { key: 's2', title: 'Travel Partner Review', time: trip.partner?.name ? `${trip.partner.name} (Partner)` : 'Dileep (Travel Partner)', cls: isPartnerDone ? 'completed' : 'active', badge: isPartnerDone ? 'Completed' : 'In Review' },
            { key: 's3', title: 'Guide & Vendor Confirmation', time: `Guide: ${trip.guide?.name || 'Pending'} • Vendor: ${trip.vendor?.name || 'Pending'}`, cls: isAssignedDone ? 'completed' : isPartnerDone ? 'active' : '', badge: isAssignedDone ? 'Completed' : isPartnerDone ? 'In Progress' : 'Pending' },
            { key: 's4', title: 'Trip Ready for Departure', time: `${formatShortDate(trip.startDate)} - ${trip.destination}`, cls: trip.status === 'ready' ? 'active' : isReadyDone ? 'completed' : '', badge: trip.status === 'ready' ? 'Ready' : isReadyDone ? 'Completed' : 'Upcoming' },
            { key: 's5', title: 'Tour Activities & Sightseeing', time: formatDateRange(trip), cls: trip.status === 'completed' ? 'completed' : trip.status === 'ongoing' ? 'active' : '', badge: trip.status === 'completed' ? 'Completed' : trip.status === 'ongoing' ? 'In Progress' : 'Upcoming' },
            { key: 's6', title: 'Trip Completed', time: formatShortDate(trip.endDate), cls: trip.status === 'completed' ? 'completed' : '', badge: trip.status === 'completed' ? 'Completed' : 'Upcoming' },
        ];
    }

    const updates = (trip.updates || []).slice(0, 8);
    const sched = tripSchedule(trip);
    const actDone = trip.scheduleStarted ? sched.filter((s) => s.status === 'completed').length : 0;
    const actTotal = sched.length || 1;
    const totalDays = Math.max(1, tripDays(trip));
    const daysElapsed = trip.status === 'completed' ? totalDays : (trip.status === 'ongoing' || trip.scheduleStarted) ? Math.min(totalDays, Math.max(1, Math.round((Date.now() - new Date(trip.startDate).getTime()) / 86400000) + 1)) : 0;
    const updateCount = (trip.updates || []).length;

    const banner = (
        <>
            {viewingCompleted && <button type="button" className="btn btn-outline" style={{ marginBottom: 16 }} onClick={toggle}><Icon name="arrowleft" /> Back to Active</button>}
            <div className="large-progress-banner">
                <div className="pb-title">{progressPct}% Complete</div>
                <div className="pb-desc">{stageDesc}</div>
                <div className="pb-bar-bg"><div className="pb-bar-fill" style={{ width: `${progressPct}%` }} /></div>
                <Icon name="trendingup" className="pb-icon" />
            </div>
        </>
    );

    return page(`Monitor your ${trip.title} in real-time`, (
        <div className="layout-split">
            <div>
                <div className="card-block">
                    <div className="cb-title">Trip Stages</div>
                    <div className="stage-timeline">
                        {stages.map((st) => (
                            <div key={st.key} className={`st-item ${st.cls}`}>
                                <div className="st-icon" />
                                <div>
                                    <div className="st-title">{st.title}</div>
                                    <div className="st-time">{st.time}</div>
                                </div>
                                <div className="st-badge">{st.badge}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="card-block">
                    <div className="cb-title">Live Updates Feed</div>
                    {updates.length ? updates.map((update) => (
                        <div className="feed-item" key={update.id}>
                            <div className="fi-icon" style={{ background: '#2563eb' }}><Icon name={update.source === 'Vendor' ? 'truck' : update.source === 'Guide' ? 'user' : 'activity'} /></div>
                            <div className="fi-content">
                                <div className="fi-top">
                                    <div className="fi-title">{update.title}</div>
                                    <div className="fi-time">{relativeTime(update.createdAt)}</div>
                                </div>
                                <div className="fi-desc">{update.message}<br /><span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>{update.source || 'Live'} Update</span></div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ color: 'var(--text-secondary, #64748b)', padding: '16px 0', fontSize: 13, textAlign: 'center' }}>No live updates posted yet. Updates from your guide and vendor will appear here in real-time.</div>
                    )}
                </div>
            </div>
            <div>
                <div className="card-block">
                    <div className="cb-title"><Icon name="activity" /> Current Stage</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary, #0f172a)' }}>{stageTitle}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', marginBottom: 16, lineHeight: 1.4 }}>{stageDesc}</div>
                    <div style={rowStyle}><span style={{ color: 'var(--text-secondary, #64748b)' }}>Location</span><span style={{ fontWeight: 600 }}>{trip.currentLocation || trip.destination}</span></div>
                    <div style={rowStyle}><span style={{ color: 'var(--text-secondary, #64748b)' }}>Expected Dates</span><span style={{ fontWeight: 600 }}>{formatDateRange(trip)}</span></div>
                    <div style={rowStyle}><span style={{ color: 'var(--text-secondary, #64748b)' }}>Status</span><span><StatusBadge label={statusLabel(trip)} /></span></div>
                </div>
                <div className="card-block">
                    <div className="cb-title">Trip Statistics</div>
                    <div className="stat-row">
                        <div className="stat-label"><span>Activities Completed</span> <span>{actDone} / {actTotal}</span></div>
                        <div className="stat-bar"><div className="stat-fill" style={{ width: `${Math.round((actDone / actTotal) * 100)}%`, background: '#3b82f6' }} /></div>
                    </div>
                    <div className="stat-row">
                        <div className="stat-label"><span>Days Elapsed</span> <span>{daysElapsed} / {totalDays}</span></div>
                        <div className="stat-bar"><div className="stat-fill" style={{ width: `${Math.round((daysElapsed / totalDays) * 100)}%`, background: '#10b981' }} /></div>
                    </div>
                    <div className="stat-row">
                        <div className="stat-label"><span>Live Updates</span> <span>{updateCount}</span></div>
                        <div className="stat-bar"><div className="stat-fill" style={{ width: `${Math.min(100, updateCount > 0 ? updateCount * 25 : 5)}%`, background: '#f59e0b' }} /></div>
                    </div>
                </div>
                <QuickActions navigate={navigate} toast={toast} />
            </div>
        </div>
    ), true, banner);
}
