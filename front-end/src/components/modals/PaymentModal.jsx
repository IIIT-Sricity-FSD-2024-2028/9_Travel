import { useState } from 'react';
import Icon from '../icons/Icon';
import { formatDateRange, formatMoney, submitTripPayment } from '../../services/workflow';

const METHODS = [
    { key: 'card', label: '💳 Credit/Debit Card' },
    { key: 'upi', label: '📱 UPI / QR Code' },
    { key: 'netbanking', label: '🏦 Net Banking' },
    { key: 'wallet', label: '👛 Wallet / GPay' },
];

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: '1px solid var(--border-color,#cbd5e1)', borderRadius: 10, background: 'var(--bg-card-alt,#fff)', color: 'var(--text-primary,#0f172a)', fontSize: 14, outline: 'none' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary,#64748b)', marginBottom: 4 };

/** Trip payment checkout (window.openPaymentModal in workflow.js). */
export default function PaymentModal({ trip, onClose, toast }) {
    const [method, setMethod] = useState('card');
    const [cardName, setCardName] = useState(trip.travelerName || '');
    const [cardNum, setCardNum] = useState('4532 8921 4452 8921');
    const [cardExp, setCardExp] = useState('08/28');
    const [cardCvv, setCardCvv] = useState('882');
    const [upiId, setUpiId] = useState(`${(trip.travelerEmail || 'traveler').split('@')[0]}@upi`);
    const [bank, setBank] = useState('HDFC Bank');
    const [wallet, setWallet] = useState('Google Pay');
    const [submitting, setSubmitting] = useState(false);
    const formattedPay = formatMoney(Number(trip.budget || 1200));

    const submit = () => {
        const methodLabel = method === 'card' ? 'Credit/Debit Card' : method === 'upi' ? 'UPI' : method === 'netbanking' ? 'Net Banking' : 'Wallet';
        if (method === 'card' && (!cardName.trim() || cardNum.replace(/\D/g, '').length < 12 || !cardExp.trim() || !cardCvv.trim())) {
            toast('Please enter valid card details before paying.', 'error');
            return;
        }
        if (method === 'upi' && !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
            toast('Please enter a valid UPI ID (e.g. name@upi).', 'error');
            return;
        }
        const accountDetail = method === 'upi' ? (upiId ? `UPI: ${upiId}` : 'UPI Account')
            : method === 'card' ? (cardNum ? `Card ending in ${cardNum.slice(-4)}` : 'Credit/Debit Card')
                : method === 'netbanking' ? (bank || 'Net Banking') : (wallet || 'Digital Wallet');
        setSubmitting(true);
        submitTripPayment(trip.id, { methodLabel, accountDetail });
        toast('Payment successful! Your trip is now ready to start.', 'success');
        onClose();
    };

    return (
        <div id="dd-payment-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box', overflowY: 'auto' }}>
            <div style={{ background: 'var(--bg-surface, #fff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 24, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', color: 'var(--text-primary,#0f172a)', position: 'relative', boxSizing: 'border-box', margin: 'auto' }}>
                <button type="button" onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'var(--text-secondary,#64748b)', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, boxShadow: '0 8px 16px rgba(16,185,129,0.25)' }}>
                        <Icon name="creditcard" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-primary,#0f172a)' }}>Trip Payment Checkout</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary,#64748b)', margin: '2px 0 0' }}>Trip ID: <strong>{trip.id}</strong> • {trip.title}</p>
                    </div>
                </div>

                <div style={{ background: 'var(--bg-card-alt, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary,#64748b)', fontWeight: 600 }}>Destination &amp; Dates</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary,#0f172a)' }}>{trip.destination} ({formatDateRange(trip)})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary,#64748b)', fontWeight: 600 }}>Package Status</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '4px 10px', borderRadius: 999 }}>Confirmed by Guide &amp; Vendor</span>
                    </div>
                    <div style={{ height: 1, background: 'var(--border-color,#e2e8f0)', margin: '12px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary,#0f172a)' }}>Total Amount Payable</span>
                        <span style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>{formattedPay}</span>
                    </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary,#0f172a)', marginBottom: 10 }}>Select Payment Method</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        {METHODS.map((m) => {
                            const active = m.key === method;
                            return (
                                <button
                                    key={m.key}
                                    type="button"
                                    className={`pay-method-btn ${active ? 'active' : ''}`}
                                    onClick={() => setMethod(m.key)}
                                    style={{ padding: 12, border: active ? '2px solid #10b981' : '1px solid var(--border-color,#cbd5e1)', borderRadius: 12, background: active ? 'rgba(16,185,129,0.05)' : 'var(--bg-surface,#fff)', color: active ? 'var(--text-primary,#0f172a)' : 'var(--text-secondary,#475569)', fontWeight: active ? 700 : 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                >
                                    {m.label}
                                </button>
                            );
                        })}
                    </div>

                    {method === 'card' && (
                        <div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={labelStyle}>Cardholder Name</label>
                                <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} style={inputStyle} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={labelStyle}>Card Number</label>
                                <input type="text" placeholder="4532 •••• •••• 8921" value={cardNum} onChange={(e) => setCardNum(e.target.value)} style={inputStyle} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Expiry Date</label>
                                    <input type="text" placeholder="MM/YY" value={cardExp} onChange={(e) => setCardExp(e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>CVV Security Code</label>
                                    <input type="password" placeholder="•••" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} style={inputStyle} />
                                </div>
                            </div>
                        </div>
                    )}
                    {method === 'upi' && (
                        <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-card-alt,#f8fafc)', borderRadius: 12, border: '1px solid var(--border-color,#e2e8f0)' }}>
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ display: 'inline-block', padding: 12, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                    <div style={{ width: 130, height: 130, background: '#0f172a', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, gap: 6 }}>
                                        <Icon name="activity" style={{ fontSize: 26 }} />
                                        <span style={{ fontWeight: 700 }}>SCAN TO PAY</span>
                                        <span style={{ fontSize: 10, opacity: 0.8 }}>Dream Destination</span>
                                    </div>
                                </div>
                            </div>
                            <label style={labelStyle}>Or enter UPI ID (VPA)</label>
                            <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} style={{ ...inputStyle, maxWidth: 280, background: 'var(--bg-surface,#fff)', textAlign: 'center' }} />
                        </div>
                    )}
                    {method === 'netbanking' && (
                        <div>
                            <label style={{ ...labelStyle, marginBottom: 6 }}>Select Your Bank</label>
                            <select value={bank} onChange={(e) => setBank(e.target.value)} style={{ ...inputStyle, padding: '12px 14px' }}>
                                <option value="HDFC Bank">HDFC Bank</option>
                                <option value="ICICI Bank">ICICI Bank</option>
                                <option value="State Bank of India">State Bank of India (SBI)</option>
                                <option value="Axis Bank">Axis Bank</option>
                                <option value="Chase / Bank of America">Chase / Bank of America</option>
                                <option value="Other Bank">Other Popular Bank</option>
                            </select>
                        </div>
                    )}
                    {method === 'wallet' && (
                        <div>
                            <label style={{ ...labelStyle, marginBottom: 6 }}>Choose Wallet Provider</label>
                            <select value={wallet} onChange={(e) => setWallet(e.target.value)} style={{ ...inputStyle, padding: '12px 14px' }}>
                                <option value="Google Pay">Google Pay / GPay</option>
                                <option value="Apple Pay">Apple Pay</option>
                                <option value="Paytm Wallet">Paytm Wallet</option>
                                <option value="PayPal">PayPal</option>
                            </select>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button type="button" onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-card-alt,#fff)', color: 'var(--text-secondary,#475569)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                    <button type="button" disabled={submitting} onClick={submit} style={{ flex: 2, padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Icon name="check" /> {submitting ? 'Processing...' : `Confirm & Pay ${formattedPay}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
