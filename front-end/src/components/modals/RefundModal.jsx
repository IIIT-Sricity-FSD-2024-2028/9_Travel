import { useState } from 'react';
import Icon from '../icons/Icon';
import { formatMoney, processCancellationRefund, refundBaseAmount } from '../../services/workflow';

const overlay = { position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, paddingTop: 20, boxSizing: 'border-box', overflowY: 'auto' };
const card = (maxWidth) => ({ background: 'var(--bg-surface,#fff)', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 24, width: '100%', maxWidth, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', color: 'var(--text-primary,#0f172a)', position: 'relative', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' });
const closeX = { position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', color: 'var(--text-secondary,#64748b)', fontSize: 22, cursor: 'pointer', lineHeight: 1 };
const row = { display: 'flex', justifyContent: 'space-between' };

/**
 * Cancelled-trip refund wizard (window.openCancellationRefundModal).
 * Shows the receipt when the refund was already processed.
 */
export default function RefundModal({ trip, onClose, toast, canProcess }) {
    const ref = trip.refundRecord;
    const isRefunded = Boolean(ref && ref.processed);
    const totalBudget = refundBaseAmount(trip);
    const [feePct, setFeePct] = useState(ref?.cancellationFeePercent ?? 20);
    const [destAccount, setDestAccount] = useState(trip.paymentAccount || (trip.paymentMethod ? `${trip.paymentMethod} (Original Sent Account)` : `${trip.travelerName || 'Traveler'} Original Account`));
    const [method, setMethod] = useState('Original Payment Instrument');
    const [pin, setPin] = useState('');

    if (isRefunded) {
        return (
            <div id="dd-refund-modal" style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <div style={card(560)}>
                    <button type="button" onClick={onClose} style={closeX}>&times;</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, boxShadow: '0 8px 16px rgba(16,185,129,0.3)' }}>✓</div>
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary,#0f172a)' }}>Cancellation Refund Issued</h3>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary,#64748b)', margin: '2px 0 0' }}>Trip {trip.id} • {trip.title}</p>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Refund Status</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>{formatMoney(ref.refundAmount)} <span style={{ fontSize: 14, fontWeight: 700 }}>({ref.refundPercent}% refunded)</span></div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary,#64748b)', marginTop: 4 }}>Admin Fee Retained: <strong style={{ color: '#c2410c' }}>{formatMoney(ref.cancellationFeeAmount)} ({ref.cancellationFeePercent}%)</strong></div>
                    </div>
                    <div style={{ background: 'var(--bg-card-alt,#f8fafc)', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 14, padding: 16, marginBottom: 20, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={row}><span style={{ color: 'var(--text-secondary,#64748b)' }}>Total Collected Budget:</span><strong style={{ color: 'var(--text-primary,#0f172a)' }}>{formatMoney(ref.totalBudget || totalBudget)}</strong></div>
                        <div style={row}><span style={{ color: 'var(--text-secondary,#64748b)' }}>Sent to Account:</span><strong style={{ color: '#0ea5e9' }}>{ref.destinationAccount || 'Traveler Account'}</strong></div>
                        <div style={row}><span style={{ color: 'var(--text-secondary,#64748b)' }}>Refund Method:</span><strong style={{ color: 'var(--text-primary,#0f172a)' }}>{ref.refundMethod || 'Original Payment Instrument'}</strong></div>
                        <div style={row}><span style={{ color: 'var(--text-secondary,#64748b)' }}>Transaction Ref ID:</span><strong style={{ color: '#6366f1' }}>{ref.txnId || 'N/A'}</strong></div>
                        <div style={row}><span style={{ color: 'var(--text-secondary,#64748b)' }}>Processed Date:</span><strong style={{ color: 'var(--text-primary,#0f172a)' }}>{new Date(ref.processedAt).toLocaleString()}</strong></div>
                    </div>
                    <button type="button" onClick={onClose} style={{ width: '100%', padding: 12, border: 'none', borderRadius: 12, background: 'var(--bg-card-alt,#e2e8f0)', color: 'var(--text-primary,#0f172a)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Close Receipt</button>
                </div>
            </div>
        );
    }

    const clampedFee = Math.min(100, Math.max(0, Number(feePct) || 0));
    const refundPct = 100 - clampedFee;

    const submit = () => {
        if (!canProcess) {
            toast('Only Super Admin is authorized to process trip refunds.', 'error');
            return;
        }
        const fee = Number(feePct);
        if (Number.isNaN(fee) || fee < 0 || fee > 100) {
            toast('Cancellation fee percentage must be between 0% and 100%.', 'error');
            return;
        }
        if (!pin) {
            toast('Please enter your Transaction PIN to authorize refund.', 'error');
            return;
        }
        const result = processCancellationRefund(trip.id, { feePct: fee, destAccount: destAccount || `${trip.travelerName || 'Traveler'} Original Account`, methodLabel: method });
        if (result) toast(`Refund of ${formatMoney(result.refundAmt)} (${result.refundPct}%) processed successfully to traveler account!`, 'success');
        onClose();
    };

    const presetBtn = { padding: '6px 10px', border: '1px solid var(--border-color,#cbd5e1)', borderRadius: 8, background: 'var(--bg-surface,#fff)', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary,#0f172a)' };

    return (
        <div id="dd-refund-modal" style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={card(580)}>
                <button type="button" onClick={onClose} style={closeX}>&times;</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#f97316,#c2410c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, boxShadow: '0 6px 16px rgba(249,115,22,0.3)' }}>🔄</div>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary,#0f172a)' }}>Process Cancelled Trip Refund</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary,#64748b)', margin: '2px 0 0' }}>Trip {trip.id} • {trip.title} • Traveler: <strong>{trip.travelerName || 'Traveler'}</strong></p>
                    </div>
                </div>
                <div style={{ background: 'var(--bg-card-alt,#f8fafc)', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 16, padding: 16, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary,#64748b)', fontWeight: 600 }}>Total Paid Budget</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary,#0f172a)' }}>{formatMoney(totalBudget)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary,#64748b)', fontWeight: 600 }}>Status</div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Cancelled</span>
                    </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary,#0f172a)' }}>Admin Cancellation Fee (% retained by Admin)</label>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary,#64748b)' }}>Admin sets percentage</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                        <input type="number" min="0" max="100" value={feePct} onChange={(e) => setFeePct(e.target.value)} style={{ width: 75, padding: '8px 10px', border: '2px solid #f97316', borderRadius: 10, fontWeight: 800, fontSize: 16, textAlign: 'center', background: 'var(--bg-surface,#fff)', color: '#c2410c' }} />
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#c2410c' }}>% Fee</span>
                        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                            <button type="button" onClick={() => setFeePct(0)} style={presetBtn}>0% (Full)</button>
                            <button type="button" onClick={() => setFeePct(10)} style={presetBtn}>10%</button>
                            <button type="button" onClick={() => setFeePct(20)} style={presetBtn}>20%</button>
                            <button type="button" onClick={() => setFeePct(30)} style={presetBtn}>30%</button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 14, borderRadius: 14, background: 'var(--bg-card-alt,#f8fafc)', border: '1px solid var(--border-color,#e2e8f0)' }}>
                        <div style={{ borderRight: '1px solid var(--border-color,#cbd5e1)', paddingRight: 10 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary,#64748b)', fontWeight: 700 }}>Refund to Traveler ({refundPct}%)</div>
                            <div style={{ fontSize: 19, fontWeight: 900, color: '#10b981', marginTop: 4 }}>{formatMoney(parseFloat(((totalBudget * refundPct) / 100).toFixed(2)))}</div>
                        </div>
                        <div style={{ paddingLeft: 4 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary,#64748b)', fontWeight: 700 }}>Admin Retained Fee ({clampedFee}%)</div>
                            <div style={{ fontSize: 19, fontWeight: 900, color: '#c2410c', marginTop: 4 }}>{formatMoney(parseFloat(((totalBudget * clampedFee) / 100).toFixed(2)))}</div>
                        </div>
                    </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary,#0f172a)', marginBottom: 6 }}>Traveler Original Sent Account (Refund Destination)</label>
                    <input type="text" value={destAccount} onChange={(e) => setDestAccount(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid var(--border-color,#cbd5e1)', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'var(--bg-surface,#fff)', color: 'var(--text-primary,#0f172a)', marginBottom: 12 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary,#64748b)', marginBottom: 4 }}>Refund Instrument / Method</label>
                            <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid var(--border-color,#cbd5e1)', borderRadius: 10, fontSize: 13, background: 'var(--bg-surface,#fff)', color: 'var(--text-primary,#0f172a)', fontWeight: 600 }}>
                                <option value="Original Payment Instrument">Original Payment Account (Auto)</option>
                                <option value="UPI Direct Transfer">UPI Direct Refund</option>
                                <option value="NEFT / Bank Transfer">NEFT Bank Transfer</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary,#64748b)', marginBottom: 4 }}>Transaction PIN</label>
                            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••••" style={{ width: '100%', boxSizing: 'border-box', padding: 10, border: '1px solid var(--border-color,#cbd5e1)', borderRadius: 10, fontSize: 13, background: 'var(--bg-surface,#fff)', color: 'var(--text-primary,#0f172a)', fontWeight: 700 }} />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onClose} style={{ padding: '10px 18px', border: '1px solid var(--border-color,#cbd5e1)', borderRadius: 10, background: 'var(--bg-surface,#fff)', color: 'var(--text-secondary,#475569)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button type="button" onClick={submit} style={{ padding: '10px 22px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.35)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="check" /> Authorize &amp; Refund Remaining Amount
                    </button>
                </div>
            </div>
        </div>
    );
}
