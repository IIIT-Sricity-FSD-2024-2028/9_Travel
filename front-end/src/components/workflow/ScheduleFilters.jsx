import Icon from '../icons/Icon';

const ALL_VALUES = ['all', 'all status', 'all services', 'all stages'];

/**
 * setupScheduleFilters() from workflow.js as a pure predicate: a card is visible when its
 * text contains the search query and its status matches the selected status filter.
 *  - text:   all searchable text of the card
 *  - badge:  status badge text of the card
 */
export function matchesScheduleFilter({ text, badge = '' }, query, statusFilter) {
    const cardText = String(text || '').toLowerCase();
    const q = String(query || '').trim().toLowerCase();
    if (q && !cardText.includes(q)) return false;
    const filter = String(statusFilter || 'all').toLowerCase();
    if (!filter || ALL_VALUES.includes(filter)) return true;
    const badgeText = String(badge || '').toLowerCase();
    if (filter.includes('ongoing') || filter.includes('active')) {
        return cardText.includes('ongoing') || badgeText.includes('ongoing') || cardText.includes('active') || badgeText.includes('in progress');
    }
    if (filter.includes('upcoming') || filter.includes('pending')) {
        return cardText.includes('upcoming') || badgeText.includes('upcoming') || cardText.includes('pending');
    }
    if (filter.includes('completed') || filter.includes('history')) {
        return cardText.includes('completed') || badgeText.includes('completed') || badgeText.includes('done');
    }
    return true;
}

/** "No matching traveler schedules found" notice (#dd-schedule-empty-notice). */
export function NoMatchingSchedules() {
    return (
        <div id="dd-schedule-empty-notice" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary, #64748b)', background: 'var(--bg-card-alt, #f8fafc)', borderRadius: 12, border: '1px solid var(--border-color, #e2e8f0)', margin: '16px 0', fontWeight: 600, width: '100%' }}>
            <Icon name="search" style={{ width: 32, height: 32, opacity: 0.5, marginBottom: 8 }} />
            <div>No matching traveler schedules found</div>
        </div>
    );
}
