import { scheduleOwnerLabel, scheduleStatusText, tripSchedule } from '../../services/workflow';

/** Schedule items a guide / vendor may update (populateScheduleSelect). */
export function scheduleItemsFor(trip, role) {
    const schedule = trip ? tripSchedule(trip) : [];
    if (role === 'vendor') return schedule.filter((item) => item.owner === 'vendor' || item.owner === 'both' || !item.owner);
    if (role === 'guide') return schedule.filter((item) => item.owner === 'guide' || item.owner === 'both' || !item.owner);
    return schedule;
}

/** Default selection: the item currently in progress (the original pre-selected it). */
export function defaultScheduleItemId(trip, role) {
    return scheduleItemsFor(trip, role).find((item) => item.status === 'in-progress')?.id || '';
}

/** "Schedule Item" form group inserted after the trip select (ensureScheduleSelect). */
export default function ScheduleItemSelect({ trip, role, value, onChange, className = 'form-select', labelClass = 'form-label', groupClass = 'form-group' }) {
    const items = scheduleItemsFor(trip, role);
    return (
        <div className={groupClass} data-dd-schedule-group="true">
            <label className={labelClass}>Schedule Item</label>
            <select className={className} data-dd-field="scheduleItemId" data-dd-schedule-select value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="">Select Schedule Item</option>
                {items.map((item) => (
                    <option key={item.id} value={item.id}>
                        Day {item.day} {item.time} - {item.title} ({scheduleOwnerLabel(item.owner)}, {scheduleStatusText(item.status)})
                    </option>
                ))}
            </select>
        </div>
    );
}
