import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { important } from '../../components/importantStyle';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import {
    allActiveTrips, downloadSuperuserReportPdf, formatMoney, lastSixMonthLabels, monthKey, tripRevenue, tripStatusCounts, userRoleCounts,
} from '../../services/workflow';

const COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#84cc16', '#14b8a6', '#ef4444'];
const pct = (value, max) => Math.round((value / max) * 100);
const th = { padding: '10px 12px' };
const td = { padding: 12 };

function PayoutMatrix({ trips, openBudgetShareModal }) {
    const completed = trips.filter((t) => t.status === 'completed');
    return (
        <div className="chart-card-full" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <div className="chart-title">Completed Trips Budget Share &amp; Stakeholder Payout Matrix</div>
                    <div className="chart-subtitle">Allocate and disburse revenue shares to Travel Partners, Tour Guides, Vendors, and Support Executives</div>
                </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color,#e2e8f0)', color: 'var(--text-secondary,#64748b)' }}>
                            <th style={th}>Trip ID &amp; Title</th><th style={th}>Total Budget</th><th style={th}>Partner Share</th><th style={th}>Guide Share</th>
                            <th style={th}>Vendor Share</th><th style={th}>Support Share</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {completed.length ? completed.map((trip) => {
                            const shares = trip.budgetShare || {};
                            const total = Number(trip.budget || 0);
                            const gPct = shares.guidePercent !== undefined ? shares.guidePercent : 50;
                            const vPct = shares.vendorPercent !== undefined ? shares.vendorPercent : 50;
                            const gAmt = shares.guideAmount ?? Math.round((total * gPct) / 100);
                            const vAmt = shares.vendorAmount ?? Math.round((total * vPct) / 100);
                            const paid = Boolean(shares.disbursed);
                            return (
                                <tr key={trip.id} style={{ borderBottom: '1px solid var(--border-color,#e2e8f0)' }}>
                                    <td style={td}><strong>{trip.id}</strong><br /><span style={{ color: 'var(--text-secondary,#64748b)', fontSize: 12 }}>{trip.title}</span></td>
                                    <td style={{ ...td, fontWeight: 700, color: '#10b981' }}>{formatMoney(total)}</td>
                                    <td style={{ ...td, color: '#64748b', fontWeight: 600, fontSize: 12 }}>₹0 <span style={{ fontSize: 11, opacity: 0.8 }}>(Salaried)</span></td>
                                    <td style={{ ...td, color: '#7e22ce', fontWeight: 600 }}>{formatMoney(gAmt)} <span style={{ fontSize: 11, opacity: 0.8 }}>({gPct}%)</span></td>
                                    <td style={{ ...td, color: '#c2410c', fontWeight: 600 }}>{formatMoney(vAmt)} <span style={{ fontSize: 11, opacity: 0.8 }}>({vPct}%)</span></td>
                                    <td style={{ ...td, color: '#64748b', fontWeight: 600, fontSize: 12 }}>₹0 <span style={{ fontSize: 11, opacity: 0.8 }}>(Salaried)</span></td>
                                    <td style={td}>
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 99, background: paid ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: paid ? '#10b981' : '#d97706' }}>{paid ? '✓ Paid Out' : '⏱ Pending'}</span>
                                    </td>
                                    <td style={{ ...td, textAlign: 'right' }}>
                                        {paid ? (
                                            <button type="button" onClick={() => openBudgetShareModal(trip.id)} style={{ padding: '6px 14px', border: 'none', borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="check" /> Paid Guide &amp; Vendor</button>
                                        ) : (
                                            <button type="button" onClick={() => openBudgetShareModal(trip.id)} style={{ padding: '6px 14px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>💳 Pay Guide &amp; Vendor</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        }) : <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary,#64748b)' }}>No completed trips found yet. Complete a trip to disburse budget shares.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/** superuser_reports.html (renderSuperuserReports + downloadSuperuserReportPdf). */
export default function SuperuserReports() {
    const state = useWorkflowState();
    const { toast, openBudgetShareModal } = useUI();
    const users = state.users || [];
    const trips = allActiveTrips(state);
    const issues = state.issues || [];
    const activeUsers = users.filter((u) => (u.status || 'Active') === 'Active');
    const resolvedIssues = issues.filter((i) => i.status === 'Resolved').length;
    const satisfaction = issues.length ? Math.round((resolvedIssues / issues.length) * 100) : 0;
    const monthly = lastSixMonthLabels().map((label) => {
        const monthTrips = trips.filter((t) => monthKey(t.createdAt || t.startDate) === label);
        return { label, revenue: tripRevenue(monthTrips), bookings: monthTrips.length };
    });
    const maxRevenue = Math.max(1, ...monthly.map((m) => m.revenue));
    const maxBookings = Math.max(1, ...monthly.map((m) => m.bookings));
    const roleEntries = Object.entries(userRoleCounts(users));
    const statusEntries = Object.entries(tripStatusCounts(trips));
    const roleTotal = Math.max(1, users.length);
    let cursor = 0;
    const conic = roleEntries.map(([, count], i) => {
        const start = cursor;
        cursor += Math.round((count / roleTotal) * 100);
        return `${COLORS[i % COLORS.length]} ${start}% ${cursor}%`;
    }).join(', ') || '#e2e8f0 0% 100%';

    const download = () => {
        try {
            downloadSuperuserReportPdf(state);
            toast('Analytics report downloaded.', 'success');
        } catch (error) {
            toast(`Could not generate the PDF: ${error.message}`, 'error');
        }
    };

    const mini = [
        ['#e0f2fe', '#0ea5e9', 'dollar', 'Total Revenue', formatMoney(tripRevenue(trips)), 'Real data'],
        ['#d1fae5', '#10b981', 'map', 'Total Trips', trips.length, 'Live'],
        ['#f3e8ff', '#a855f7', 'users', 'Active Users', activeUsers.length, `${users.length} total`],
        ['#ffedd5', '#f97316', 'zap', 'Issue Resolution', `${satisfaction}%`, `${resolvedIssues}/${issues.length || 0} resolved`],
    ];

    return (
        <DashboardLayout role="superuser" page="superuser__superuser_reports">
            <div className="sa-dashboard-container sa-dashboard">
                <div className="welcome-banner" ref={important({ background: 'linear-gradient(135deg,#0ea5e9,#3b82f6)', padding: 24, borderRadius: 14, marginBottom: 24 })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="activity" /></div>
                        <div><h1 ref={important({ color: '#fff', fontSize: 20 })}>Analytics &amp; Reports</h1><p ref={important({ color: 'rgba(255,255,255,.9)', fontSize: 13 })}>Real-time platform performance insights</p></div>
                    </div>
                    <button type="button" className="btn-primary" onClick={download} style={{ background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', boxShadow: 'none' }}><Icon name="download" /> Download PDF</button>
                </div>
                <div className="stats-top">
                    {mini.map(([bg, color, icon, label, value, trend]) => (
                        <div className="stat-card-mini" key={label}>
                            <div className="icon-badge" style={{ background: bg, color }}><Icon name={icon} /></div>
                            <div className="label">{label}</div>
                            <div className="value">{value}</div>
                            <div className="trend">{trend}</div>
                        </div>
                    ))}
                </div>
                <div className="chart-card-full">
                    <div className="chart-title">Revenue Trend</div>
                    <div className="chart-subtitle">Revenue from real trips over the last 6 months</div>
                    <div className="rev-trend-chart" style={{ paddingTop: 10, display: 'flex', alignItems: 'flex-end', gap: 14, height: 180 }}>
                        {monthly.map((m) => (
                            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }} title={`${m.label}: ${formatMoney(m.revenue)}`}>
                                <div style={{ width: '100%', maxWidth: 58, height: `${Math.max(4, pct(m.revenue, maxRevenue))}%`, background: '#38bdf8', borderRadius: '6px 6px 0 0' }} />
                                <div style={{ fontSize: 11, color: 'var(--text-secondary, #64748b)' }}>{m.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="charts-row">
                    <div className="chart-card">
                        <div className="chart-title">User Distribution</div>
                        <div className="chart-subtitle">Platform breakdown by role</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 36, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                            <div className="pie-chart-container" style={{ margin: 0, width: 130, height: 130, background: `conic-gradient(${conic})`, position: 'relative' }}>
                                <div style={{ position: 'absolute', inset: 25, background: 'var(--bg-surface, #fff)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #0f172a)', flexDirection: 'column' }}>
                                    <span>{users.length}</span><span>Users</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12, color: 'var(--text-secondary, #475569)', fontWeight: 500 }}>
                                {roleEntries.length ? roleEntries.map(([role, count], i) => (
                                    <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
                                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                                        {role}
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginLeft: 'auto' }}>{pct(count, roleTotal)}%</span>
                                    </div>
                                )) : <div>No users yet</div>}
                            </div>
                        </div>
                    </div>
                    <div className="chart-card">
                        <div className="chart-title">Trip Status Overview</div>
                        <div className="chart-subtitle">Current trip statuses platform-wide</div>
                        <div className="chart-layout-wrapper" style={{ height: 150, marginTop: 24 }}>
                            <div className="chart-grid-area" style={{ gap: 20, paddingLeft: 10 }}>
                                {statusEntries.length ? statusEntries.map(([label, count], i) => (
                                    <div className="bar-col" key={label}>
                                        <div className="bar-tooltip">{label}: {count}</div>
                                        <div className="bar" style={{ height: `${Math.max(4, pct(count, Math.max(1, trips.length)))}%`, background: COLORS[i % COLORS.length], width: 70 }} />
                                    </div>
                                )) : <div style={{ color: 'var(--text-secondary, #64748b)' }}>No trips yet</div>}
                            </div>
                        </div>
                        <div className="x-axis-labels" style={{ paddingLeft: 38, gap: 20, fontSize: 10.5 }}>
                            {statusEntries.map(([label]) => <div key={label}>{label}</div>)}
                        </div>
                    </div>
                </div>
                <div className="chart-card-full">
                    <div className="chart-title">Monthly Performance Comparison</div>
                    <div className="chart-subtitle">Revenue vs bookings from real trip records</div>
                    <div className="month-chart-wrapper">
                        {monthly.map((m) => (
                            <div className="month-bar-group" key={m.label} title={`${m.label}: ${formatMoney(m.revenue)} • ${m.bookings} bookings`}>
                                <div className="month-bar rev" style={{ height: `${Math.max(3, pct(m.revenue, maxRevenue))}%` }} />
                                <div className="month-bar book" style={{ height: `${Math.max(3, pct(m.bookings, maxBookings))}%` }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#64748b', fontWeight: 500, padding: '0 4%' }}>
                        {monthly.map((m) => <div key={m.label}>{m.label}</div>)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20, fontSize: 12, color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="legend-dot c-cyan" style={{ width: 10, height: 10, borderRadius: 2 }} /> Revenue</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="legend-dot c-teal" style={{ width: 10, height: 10, borderRadius: 2 }} /> Bookings</div>
                    </div>
                </div>
                <PayoutMatrix trips={trips} openBudgetShareModal={openBudgetShareModal} />
                <div className="custom-report-btn">
                    <div>
                        <div className="custom-report-icon"><Icon name="filetext" /></div>
                        <div><div className="cr-title">Generate Custom Report</div><div className="cr-desc">Download current real-time analytics as a PDF file</div></div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" className="btn-primary" onClick={download} style={{ fontSize: 13 }}><Icon name="download" /> Generate PDF</button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
