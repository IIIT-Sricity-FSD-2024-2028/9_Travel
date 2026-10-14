import { badgeClassFor } from '../services/workflow';

/** renderBadge() – status pill whose colour is derived from its label. */
export default function StatusBadge({ label, className = '' }) {
    return <span className={`badge ${badgeClassFor(label)}${className ? ` ${className}` : ''}`}>{label}</span>;
}
