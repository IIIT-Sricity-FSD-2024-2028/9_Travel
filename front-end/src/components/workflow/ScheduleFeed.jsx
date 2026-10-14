import Icon from '../icons/Icon';
import { formatShortDate, groupScheduleByDay, tripSchedule } from '../../services/workflow';

function ScheduleStatusBadge({ status }) {
    if (status === 'completed') return <div className="s-badge badge-c">Completed</div>;
    if (status === 'in-progress') return <div className="s-badge badge-a">In Progress</div>;
    return <div className="s-badge">Upcoming</div>;
}

/**
 * Day-by-day schedule (renderScheduleFeed in workflow.js).
 * `onRemove` is only passed on Travel Partner pages (trash button per item).
 */
export default function ScheduleFeed({ trip, onRemove }) {
    const grouped = groupScheduleByDay(tripSchedule(trip));
    return Object.keys(grouped).map((day) => (
        <div className="day-card" key={day}>
            <div className="day-header">
                <div className="day-icon">{day}</div>
                <div>
                    <div className="day-title">Day {day}</div>
                    <div className="day-date">{formatShortDate(grouped[day][0].date)}</div>
                </div>
            </div>
            <div className="s-timeline">
                {grouped[day].map((item) => (
                    <div key={item.id} className={`s-item ${item.status === 'completed' ? 'completed' : item.status === 'in-progress' ? 'active s-item-active-box' : 'upcoming'}`}>
                        <div className="s-icon" />
                        <div className="s-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div>
                                <div className="s-title">{item.time} - {item.title}</div>
                                <div className="s-meta">
                                    <Icon name={item.owner === 'vendor' ? 'truck' : 'user'} /> {item.owner === 'vendor' ? 'Vendor' : 'Guide'}: {item.owner === 'vendor' ? (trip.vendor?.name || 'Pending') : (trip.guide?.name || 'Pending')} - {item.location}
                                </div>
                                {item.notes && <div className="s-meta">{item.notes}</div>}
                            </div>
                            {onRemove && (
                                <button
                                    type="button"
                                    className="btn-remove-item"
                                    title="Remove schedule item"
                                    onClick={() => onRemove(item.id)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6, marginLeft: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, transition: 'background 0.2s' }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = 'none'; }}
                                    onFocus={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                    onBlur={(e) => { e.currentTarget.style.background = 'none'; }}
                                >
                                    <Icon name="trash-2" style={{ width: 16, height: 16 }} />
                                </button>
                            )}
                        </div>
                        <ScheduleStatusBadge status={item.status} />
                    </div>
                ))}
            </div>
        </div>
    ));
}
