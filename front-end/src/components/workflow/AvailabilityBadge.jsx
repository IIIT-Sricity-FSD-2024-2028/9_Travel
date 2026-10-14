import Icon from '../icons/Icon';

/**
 * First badge of a profile card, reflecting the availability status (updateProfileBadge).
 * `pill` keeps the support portal's "badge-pill" styling.
 */
export default function AvailabilityBadge({ status, pill = false }) {
    const s = String(status || '').toLowerCase();
    const available = s === 'available' || s.includes('on duty') || s.includes('active');
    if (available) {
        return <span className={pill ? 'badge-pill badge-green' : 'badge badge-active badge-green badge-available'}><Icon name="checkcircle" /> {status}</span>;
    }
    return (
        <span className={pill ? 'badge-pill badge-amber' : 'badge badge-warning badge-amber badge-available'} style={{ background: '#fef3c7', color: '#b45309' }}>
            <Icon name="alert" /> {status}
        </span>
    );
}
