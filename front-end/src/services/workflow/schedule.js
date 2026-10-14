/**
 * Trip schedule helpers – ported from js/workflow.js without behavioural changes.
 */
import { DESTINATION_DAY_ACTIVITIES } from './constants';
import { addDays, dateOnly, nowISO, tripDays } from './utils';

export function packageKeyFor(trip) {
    const text = `${trip.title || ''} ${trip.destination || ''}`.toLowerCase();
    if (text.includes('maldives') || text.includes('male')) return 'maldives';
    if (text.includes('swiss') || text.includes('zurich') || text.includes('alps')) return 'swiss';
    if (text.includes('japan') || text.includes('tokyo') || text.includes('kyoto')) return 'japan';
    if (text.includes('goa')) return 'goa';
    if (text.includes('paris') || text.includes('france')) return 'paris';
    if (text.includes('rome') || text.includes('italy')) return 'rome';
    return 'default';
}

export function buildPackageSchedule(trip) {
    const key = packageKeyFor(trip);
    const dayList = DESTINATION_DAY_ACTIVITIES[key] || DESTINATION_DAY_ACTIVITIES.default;
    const start = trip.startDate || dateOnly(nowISO());
    const totalDays = Math.max(1, tripDays(trip) || 7);
    const isLive = Boolean(trip.scheduleStarted || trip.status === 'ongoing');
    const isCompleted = trip.status === 'completed';
    const schedule = [];

    for (let d = 1; d <= totalDays; d++) {
        const dateStr = addDays(start, d - 1);
        let itemData;
        if (d === 1) {
            itemData = dayList[0] || { time: '09:00', title: 'Arrival, airport pickup and hotel check-in', owner: 'vendor', location: trip.destination || 'Destination Airport' };
        } else if (d === totalDays) {
            itemData = {
                time: '11:00',
                title: `Checkout, souvenir farewell & departure transfer (${trip.destination || 'Destination'})`,
                owner: 'vendor',
                location: `${trip.destination || 'Destination'} Airport`,
            };
        } else {
            const poolIndex = ((d - 1) % (dayList.length - 1)) + 1;
            itemData = dayList[poolIndex] || {
                time: '10:00',
                title: `Day ${d} guided destination excursion & sightseeing`,
                owner: d % 2 === 0 ? 'guide' : 'vendor',
                location: trip.destination || 'City Center',
            };
        }
        let status = 'upcoming';
        if (isCompleted) status = 'completed';
        else if (isLive && d === 1) status = 'in-progress';

        schedule.push({
            id: `SCH-${trip.id || 'TRIP'}-${d}`,
            day: d,
            date: dateStr,
            time: itemData.time || '09:00',
            title: itemData.title,
            owner: itemData.owner || 'vendor',
            location: itemData.location || trip.destination || 'Destination',
            status,
            updatedBy: 'Travel Partner',
            updatedAt: nowISO(),
            notes: '',
        });
    }
    return schedule;
}

export function normalizeScheduleItem(item, index, trip) {
    const dayNum = Math.max(1, Number(item.day || index + 1));
    const startDate = trip?.startDate || dateOnly(nowISO());
    const calculatedDate = addDays(startDate, dayNum - 1);
    const isLive = Boolean(trip?.scheduleStarted || trip?.status === 'ongoing');
    const isCompleted = trip?.status === 'completed';

    let status = item.status || 'upcoming';
    if (isCompleted) status = 'completed';
    else if (!isLive && status === 'in-progress') status = 'upcoming';
    else if (isLive && index === 0 && status !== 'completed') status = 'in-progress';

    return {
        id: item.id || `SCH-${trip?.id || 'TRIP'}-${index + 1}`,
        day: dayNum,
        date: calculatedDate,
        time: item.time || '09:00',
        title: item.title || 'Scheduled activity',
        owner: item.owner || (index % 2 ? 'guide' : 'vendor'),
        location: item.location || trip?.destination || 'Destination',
        status,
        updatedBy: item.updatedBy || 'Travel Partner',
        updatedAt: item.updatedAt || nowISO(),
        notes: item.notes || '',
        ...(item.lastStatus ? { lastStatus: item.lastStatus } : {}),
    };
}

export function ensureTripSchedule(trip) {
    const totalDays = Math.max(1, tripDays(trip) || 0);
    const existing = Array.isArray(trip.schedule) ? trip.schedule : [];
    const maxDay = existing.reduce((max, s) => Math.max(max, Number(s.day || 1)), 0);
    const isLive = Boolean(trip.scheduleStarted || trip.status === 'ongoing');
    const isCompleted = trip.status === 'completed';

    if (!existing.length || (totalDays > 0 && maxDay < totalDays)) {
        trip.schedule = buildPackageSchedule(trip);
    } else {
        trip.schedule = existing.map((item, index) => {
            const norm = normalizeScheduleItem(item, index, trip);
            if (isCompleted) norm.status = 'completed';
            else if (!isLive && norm.status === 'in-progress') norm.status = 'upcoming';
            return norm;
        });
    }
    if (isCompleted && Array.isArray(trip.schedule)) {
        trip.schedule = trip.schedule.map((item) => ({ ...item, status: 'completed' }));
    }
    return trip.schedule;
}

export function scheduleStats(trip) {
    const schedule = Array.isArray(trip.schedule) && trip.schedule.length ? trip.schedule : ensureTripSchedule(trip);
    const completed = schedule.filter((item) => item.status === 'completed').length;
    const active = schedule.filter((item) => item.status === 'in-progress').length;
    const upcoming = schedule.filter((item) => item.status === 'upcoming').length;
    const total = schedule.length || 1;
    return {
        completed,
        active,
        upcoming,
        total,
        percent: Math.min(100, Math.round((completed / total) * 100)),
        current: schedule.find((item) => item.status === 'in-progress') || schedule.find((item) => item.status === 'upcoming') || schedule[total - 1],
    };
}

/** Read-only accessor for render code (the snapshot is already normalised). */
export function tripSchedule(trip) {
    return Array.isArray(trip?.schedule) ? trip.schedule : [];
}

export function ownerScheduleCompleted(trip, owner) {
    const items = ensureTripSchedule(trip).filter((item) => item.owner === owner);
    return Boolean(items.length) && items.every((item) => item.status === 'completed');
}

export function updateCompletionFromSchedule(trip) {
    if (!trip.scheduleStarted) return;
    const stats = scheduleStats(trip);
    if (stats.completed === stats.total) {
        trip.status = 'completed';
        trip.stage = 'Completed';
        trip.completedAt = trip.completedAt || nowISO();
        trip.currentActivity = 'Tour completed';
        trip.currentLocation = trip.destination;
        trip.progress = 100;
    } else {
        trip.progress = 50 + Math.round(stats.percent * 0.5);
        if (stats.current) {
            trip.currentActivity = stats.current.title;
            trip.currentLocation = stats.current.location || trip.destination;
        }
    }
}

export function updateScheduleProgress(trip, owner, data) {
    ensureTripSchedule(trip);
    let active = data.scheduleItemId ? trip.schedule.find((item) => item.id === data.scheduleItemId) : null;
    if (!active) active = trip.schedule.find((item) => item.status === 'in-progress' && item.owner === owner);
    if (!active) active = trip.schedule.find((item) => item.status === 'in-progress');
    if (!active) active = trip.schedule.find((item) => item.status === 'upcoming' && item.owner === owner);
    if (!active) active = trip.schedule.find((item) => item.status === 'upcoming');
    if (!active) return null;

    const shouldComplete = data.complete || data.status === 'completed';
    active.status = shouldComplete ? 'completed' : 'in-progress';
    active.notes = data.notes || active.notes;
    active.location = data.location || active.location;
    active.updatedBy = data.updatedBy || (owner === 'guide' ? 'Tour Guide' : 'Vendor');
    active.updatedAt = nowISO();
    active.lastStatus = data.statusText || active.lastStatus || '';

    if (!shouldComplete) {
        trip.schedule.forEach((item) => {
            if (item.id !== active.id && item.status === 'in-progress') item.status = 'upcoming';
        });
    } else if (!trip.schedule.some((item) => item.status === 'in-progress')) {
        const next = trip.schedule.find((item) => item.status === 'upcoming');
        if (next) next.status = 'in-progress';
    }
    updateCompletionFromSchedule(trip);
    return active;
}

/** Groups schedule items by day (used by the schedule feed renderers). */
export function groupScheduleByDay(schedule) {
    return (schedule || []).reduce((acc, item) => {
        acc[item.day] = acc[item.day] || [];
        acc[item.day].push(item);
        return acc;
    }, {});
}
