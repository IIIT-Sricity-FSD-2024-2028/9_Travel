import { useEffect } from 'react';
import Icon from './icons/Icon';

const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: 16,
};
const cardStyle = {
    background: 'var(--bg-surface, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 16,
    width: 440, maxWidth: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', fontFamily: "'Inter', sans-serif",
};

function useEscape(onClose) {
    useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
}

/** showConfirmModal() from app.js */
export function ConfirmModal({ title, message, confirmText, tone, onConfirm, onCancel }) {
    useEscape(onCancel);
    const color = tone === 'red' ? '#e11d48' : '#10b981';
    return (
        <div id="prototype-confirm-modal" style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div style={cardStyle} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 id="confirm-modal-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>{title}</h2>
                    <svg onClick={onCancel} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer', color: 'var(--text-secondary, #64748b)' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </div>
                <p style={{ color: 'var(--text-secondary, #475569)', fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button type="button" onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 999, background: 'var(--bg-card-alt, #f8fafc)', color: 'var(--text-primary, #334155)', fontWeight: 600, fontSize: 14, border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer' }}>Cancel</button>
                    <button type="button" autoFocus onClick={onConfirm} style={{ flex: 1, padding: 12, borderRadius: 999, background: color, color: 'white', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}

/** showSuccessModal() from app.js */
export function SuccessModal({ title, message, onClose }) {
    useEscape(onClose);
    return (
        <div id="prototype-success-modal" style={overlayStyle}>
            <div style={{ ...cardStyle, padding: '32px 24px', textAlign: 'center' }} role="dialog" aria-modal="true">
                <div style={{ margin: '0 auto 16px auto', width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <h2 style={{ margin: '0 0 12px 0', fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>{title}</h2>
                <p style={{ color: 'var(--text-secondary, #475569)', fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
                <button type="button" autoFocus onClick={onClose} style={{ width: '100%', padding: 12, borderRadius: 999, background: '#0ea5e9', color: 'white', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Close</button>
            </div>
        </div>
    );
}

/** showDetailsModal() from superuser.js (uses .sa-modal-* classes from superadmin.css). */
export function DetailsModal({ title, sections, onClose }) {
    useEscape(onClose);
    return (
        <div id="sa-modal-overlay" className="sa-modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="sa-modal-container" role="dialog" aria-modal="true">
                <div className="sa-modal-header">
                    <h2 id="sa-modal-title">{title}</h2>
                    <button type="button" className="sa-modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="sa-modal-body" id="sa-modal-body">
                    {sections.map((section) => (
                        <div className="sa-modal-section" key={section.name}>
                            <div className="sa-modal-section-title">
                                <Icon name={section.icon || 'circle'} />
                                {section.name}
                            </div>
                            <div className="sa-modal-data-grid">
                                {Object.entries(section.data || {}).map(([label, value]) => {
                                    const lower = label.toLowerCase();
                                    if (lower.includes('progress') || lower.includes('rate')) {
                                        const percent = parseInt(value, 10) || 0;
                                        return (
                                            <div className="sa-modal-data-item sa-modal-full" key={label}>
                                                <div className="sa-modal-progress-wrap">
                                                    <div className="sa-modal-progress-label"><span>{label}</span><span>{percent}%</span></div>
                                                    <div className="sa-modal-progress-bar"><div className="sa-modal-progress-fill" style={{ width: `${percent}%` }} /></div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (label === 'Specialties' || label === 'Languages' || label === 'Services') {
                                        return (
                                            <div className="sa-modal-data-item sa-modal-full" key={label}>
                                                <div className="sa-modal-label">{label}</div>
                                                <div className="sa-modal-pill-grid">
                                                    {String(value).split(',').map((p) => <span className="sa-modal-pill-item sa-modal-pill-purple" key={p}>{p.trim()}</span>)}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className={`sa-modal-data-item ${label === 'Address' || label === 'Bio' ? 'sa-modal-full' : ''}`} key={label}>
                                            <div className="sa-modal-label">{label}</div>
                                            <div className="sa-modal-value">{String(value)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="sa-modal-footer">
                    <button type="button" className="sa-btn-primary" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
}

/** viewIssueAttachment() lightbox from workflow.js */
export function AttachmentLightbox({ url, onClose }) {
    useEscape(onClose);
    return (
        <div id="attachment-lightbox-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>📷 Attached Photo / Screenshot</h3>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>
                <div style={{ padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', maxHeight: '75vh' }}>
                    <img src={url} alt="Issue Attachment" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                </div>
                <div style={{ padding: '12px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <a href={url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'inline-block', padding: '8px 16px', background: '#0ea5e9', color: '#fff', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>Open Full Resolution ↗</a>
                </div>
            </div>
        </div>
    );
}
