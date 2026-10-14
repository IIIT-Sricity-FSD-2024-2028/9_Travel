import Icon from '../icons/Icon';
import { assignedTravelers } from '../../services/workflow';

const pill = (bg, color) => ({ fontSize: 12, fontWeight: 600, background: bg, color, padding: '4px 10px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4 });

/**
 * Traveler ↔ partner / support assignments (renderAssignedTravelersWidget).
 * variant: "partner-dashboard" | "partner-schedules" | "support"
 */
export function AssignedTravelerRows({ state, variant }) {
    const rows = assignedTravelers(state);
    const cellStyle = variant === 'partner-dashboard' ? undefined : { padding: 12 };
    const cellClass = variant === 'partner-dashboard' ? 'p-4' : undefined;
    if (!rows.length) {
        return variant === 'partner-dashboard'
            ? <tr><td colSpan="4" className="p-4 text-center text-gray-500">No assigned travelers found.</td></tr>
            : <tr><td colSpan="4" style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>No assigned travelers found.</td></tr>;
    }
    return rows.map(({ traveler, assignment }) => {
        const supportName = assignment ? (assignment.supportName || 'Assigned Support') : 'Support Exec';
        const partnerName = assignment ? (assignment.partnerName || 'Assigned Partner') : 'Travel Partner';
        return (
            <tr key={traveler.id || traveler.email} style={{ borderBottom: `1px solid ${variant === 'support' ? '#e2e8f0' : '#f1f5f9'}` }}>
                <td className={cellClass} style={cellStyle}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{traveler.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>ID: {traveler.id}</div>
                </td>
                <td className={cellClass} style={cellStyle}>
                    <div style={{ fontSize: 13, color: '#334155', fontWeight: variant === 'partner-dashboard' ? 500 : undefined }}>{traveler.email}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{traveler.phone || (variant === 'partner-dashboard' ? 'No phone' : '-')}</div>
                </td>
                <td className={cellClass} style={cellStyle}>
                    {variant === 'support' ? (
                        <span style={pill('#e0f2fe', '#0369a1')}><Icon name="user" style={{ width: 12, height: 12 }} /> {partnerName}</span>
                    ) : (
                        <span style={pill('#f3e8ff', '#7e22ce')}><Icon name="user" style={{ width: 12, height: 12 }} /> {supportName}</span>
                    )}
                </td>
                <td className={cellClass} style={cellStyle}>
                    {variant === 'support' ? (
                        <span style={pill('#f0fdf4', '#166534')}><Icon name="checkcircle" style={{ width: 12, height: 12 }} /> Active</span>
                    ) : (
                        <span style={pill('#dcfce7', '#15803d')}><Icon name="check" style={{ width: 12, height: 12 }} /> {variant === 'partner-dashboard' ? 'Assigned' : 'Active'}</span>
                    )}
                </td>
            </tr>
        );
    });
}

export function assignedTravelerCount(state) {
    return assignedTravelers(state).length;
}
