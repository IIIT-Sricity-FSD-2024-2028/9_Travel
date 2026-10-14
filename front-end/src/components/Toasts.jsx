/**
 * Toast notifications. Uses the visual style of the original Super Admin toast
 * (`su-toast`: fixed bottom-right, gradient pill) for every portal.
 */
const BACKGROUNDS = {
    success: 'linear-gradient(135deg,#22c55e,#16a34a)',
    info: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
    warning: 'linear-gradient(135deg,#f59e0b,#d97706)',
    error: 'linear-gradient(135deg,#ef4444,#dc2626)',
};

export default function Toasts({ toasts }) {
    if (!toasts.length) return null;
    return (
        <div
            id="toast-container"
            role="status"
            aria-live="polite"
            style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 100001, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', maxWidth: 'calc(100vw - 32px)' }}
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`su-toast toast-${toast.type}`}
                    style={{
                        padding: '12px 22px',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#fff',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        transition: 'opacity 0.4s ease',
                        opacity: toast.leaving ? 0 : 1,
                        background: BACKGROUNDS[toast.type] || BACKGROUNDS.success,
                        maxWidth: 420,
                        whiteSpace: 'pre-line',
                    }}
                >
                    {toast.message}
                </div>
            ))}
        </div>
    );
}
