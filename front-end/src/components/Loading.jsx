/** Simple loading placeholder shown while live data is fetched from the backend. */
export default function Loading({ message = 'Loading...', compact = false }) {
    return (
        <div
            className="dd-loading"
            role="status"
            aria-live="polite"
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                padding: compact ? 16 : 48, color: 'var(--text-secondary, #64748b)', fontWeight: 600, fontSize: 14,
            }}
        >
            <span className="dd-spinner" aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
}

/** Inline empty-state panel (emptyPanel() in workflow.js). */
export function EmptyPanel({ message }) {
    return <div style={{ padding: 24, color: 'var(--text-secondary, #94a3b8)', textAlign: 'center' }}>{message}</div>;
}
