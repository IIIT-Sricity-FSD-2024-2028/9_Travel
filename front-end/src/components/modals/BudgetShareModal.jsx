import { useMemo, useState } from 'react';
import { disburseBudgetShare, formatMoney } from '../../services/workflow';

const STEP_LABELS = ['Allocate', 'Accounts', 'Payment', 'Confirm'];
const box = { background: 'var(--bg-card-alt,#f8fafc)', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid var(--border-color,#cbd5e1)', borderRadius: 8, fontSize: 13, background: 'var(--bg-surface,#fff)', color: 'var(--text-primary,#0f172a)' };
const backBtn = { padding: '10px 18px', border: '1px solid var(--border-color,#cbd5e1)', borderRadius: 10, background: 'var(--bg-surface,#fff)', color: 'var(--text-secondary,#475569)', fontWeight: 600, cursor: 'pointer' };
const nextBtn = { padding: '10px 22px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', fontWeight: 800, cursor: 'pointer' };

function AccountRow({ role, account, onChange }) {
    return (
        <div style={{ padding: 14, border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 12, background: 'var(--bg-surface,#fff)', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: role.color }}>{role.label} — {role.name}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{formatMoney(role.amount)} ({role.pct}%)</div>
            </div>
            <select value={account.method} onChange={(e) => onChange({ ...account, method: e.target.value })} style={{ ...inputStyle, marginBottom: 8 }}>
                <option value="bank">🏦 Bank Transfer (NEFT/RTGS)</option>
                <option value="upi">📱 UPI</option>
                <option value="wallet">👛 Wallet (Paytm/GPay)</option>
            </select>
            {account.method === 'bank' && (
                <div>
                    <input placeholder="Account Holder Name" value={account.name} onChange={(e) => onChange({ ...account, name: e.target.value })} style={{ ...inputStyle, marginBottom: 6 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <input placeholder="Account No." value={account.number} onChange={(e) => onChange({ ...account, number: e.target.value })} style={inputStyle} />
                        <input placeholder="IFSC Code" value={account.ifsc} onChange={(e) => onChange({ ...account, ifsc: e.target.value })} style={inputStyle} />
                    </div>
                </div>
            )}
            {account.method === 'upi' && <input placeholder="UPI ID e.g. name@upi" value={account.upi} onChange={(e) => onChange({ ...account, upi: e.target.value })} style={inputStyle} />}
            {account.method === 'wallet' && <input placeholder="Registered Mobile / Wallet ID" value={account.wallet} onChange={(e) => onChange({ ...account, wallet: e.target.value })} style={inputStyle} />}
        </div>
    );
}

/** "Pay Tour Guide & Vendor" 4-step disbursement wizard (window.openBudgetShareModal). */
export default function BudgetShareModal({ trip, onClose, toast }) {
    const shares = trip.budgetShare || { guidePercent: 50, vendorPercent: 50 };
    const totalBudget = Number(trip.budget || 0);
    const hasGuide = Boolean(trip.guide && trip.guide.name);
    const hasVendor = Boolean(trip.vendor && trip.vendor.name);
    const [step, setStep] = useState(0);
    const [guidePct, setGuidePct] = useState(shares.guidePercent !== undefined ? shares.guidePercent : 50);
    const [vendorPct, setVendorPct] = useState(shares.vendorPercent !== undefined ? shares.vendorPercent : 50);
    const [gw, setGw] = useState('neft');
    const [bankAccount, setBankAccount] = useState('Travel Partner Operating Account');
    const [pin, setPin] = useState('');
    const [reference, setReference] = useState(`Trip-${trip.id}-Payout`);
    const [accounts, setAccounts] = useState(() => ({
        guide: { method: 'bank', name: trip.guide?.name || '', number: `XXXX${Math.floor(1000 + Math.random() * 9000)}`, ifsc: 'HDFC0001234', upi: '', wallet: '' },
        vendor: { method: 'bank', name: trip.vendor?.name || '', number: `XXXX${Math.floor(1000 + Math.random() * 9000)}`, ifsc: 'HDFC0001234', upi: '', wallet: '' },
    }));
    const [receipt, setReceipt] = useState(null);

    const pcts = useMemo(() => ({ partner: 0, guide: Number(guidePct) || 0, vendor: Number(vendorPct) || 0, support: 0, admin: 0 }), [guidePct, vendorPct]);
    const roles = [
        hasGuide && pcts.guide > 0 && { key: 'guide', label: 'Tour Guide', name: trip.guide.name, color: '#7e22ce', pct: pcts.guide, amount: parseFloat(((totalBudget * pcts.guide) / 100).toFixed(2)) },
        hasVendor && pcts.vendor > 0 && { key: 'vendor', label: 'Vendor Service', name: trip.vendor.name, color: '#c2410c', pct: pcts.vendor, amount: parseFloat(((totalBudget * pcts.vendor) / 100).toFixed(2)) },
    ].filter(Boolean);

    const next = () => {
        if (step === 0) {
            if ([pcts.guide, pcts.vendor].some((p) => p < 0 || p > 100)) {
                toast('Percentages must be between 0% and 100%.', 'error');
                return;
            }
        }
        if (step === 2) {
            if (!pin) {
                toast('Enter your Transaction PIN / OTP to authorize.', 'error');
                return;
            }
            const gwMethod = gw.toUpperCase();
            disburseBudgetShare(trip.id, { pcts, gwMethod });
            setReceipt({
                gwMethod,
                at: new Date().toLocaleString(),
                rows: roles.map((r) => ({ ...r, txn: `TXN-${Math.random().toString(36).substr(2, 8).toUpperCase()}` })),
            });
        }
        setStep((s) => Math.min(s + 1, 3));
    };

    const editableRow = (key, label, sub, abbr, color, bg, value, setValue) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 12, background: 'var(--bg-surface,#fff)', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{abbr}</div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary,#0f172a)' }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary,#64748b)' }}>{sub}</div>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min="0" max="100" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: 56, padding: 6, border: '1.5px solid var(--border-color,#cbd5e1)', borderRadius: 8, fontWeight: 700, textAlign: 'center', fontSize: 14, background: 'var(--bg-surface,#fff)', color: 'var(--text-primary,#0f172a)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>%</span>
                <span style={{ minWidth: 75, textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#10b981' }}>{formatMoney((totalBudget * (Number(value) || 0)) / 100)}</span>
            </div>
        </div>
    );

    return (
        <div id="dd-budget-share-modal" style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, paddingTop: 20, boxSizing: 'border-box', overflowY: 'auto' }}>
            <div style={{ background: 'var(--bg-surface,#fff)', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 24, width: '100%', maxWidth: 600, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', color: 'var(--text-primary,#0f172a)', position: 'relative', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
                {step < 3 && <button type="button" onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', color: 'var(--text-secondary,#64748b)', fontSize: 22, cursor: 'pointer' }}>&times;</button>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>💳</div>
                    <div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary,#0f172a)' }}>Pay Tour Guide &amp; Vendor</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary,#64748b)' }}>Trip {trip.id} • {trip.title || ''}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
                    {STEP_LABELS.map((label, i) => (
                        <div key={label} style={{ display: 'contents' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, background: i < step ? '#10b981' : i === step ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : 'var(--bg-card-alt,#e2e8f0)', color: i <= step ? '#fff' : '#94a3b8', boxShadow: i === step ? '0 4px 12px rgba(14,165,233,0.4)' : 'none' }}>{i < step ? '✓' : i + 1}</div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: i === step ? '#0ea5e9' : i < step ? '#10b981' : '#94a3b8' }}>{label}</span>
                            </div>
                            {i < 3 && <div style={{ flex: 1, height: 2, background: i < step ? '#10b981' : 'var(--border-color,#e2e8f0)', marginTop: 16, borderRadius: 2 }} />}
                        </div>
                    ))}
                </div>

                {step === 0 && (
                    <>
                        <div style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div><div style={{ fontSize: 11, color: 'var(--text-secondary,#64748b)', fontWeight: 600 }}>Total Trip Budget</div><div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{formatMoney(totalBudget)}</div></div>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>{(hasGuide ? pcts.guide : 0) + (hasVendor ? pcts.vendor : 0)}% Accepted Split</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary,#0f172a)', marginBottom: 10 }}>Payout disbursement based on partner accepted percentage split</div>
                        {hasGuide && editableRow('guide', 'Tour Guide', trip.guide.name, 'TG', '#7e22ce', '#f3e8ff', guidePct, setGuidePct)}
                        {hasVendor && editableRow('vendor', 'Vendor Service', trip.vendor.name, 'VS', '#c2410c', '#ffedd5', vendorPct, setVendorPct)}
                        {!hasGuide && !hasVendor && <div style={{ padding: 14, textAlign: 'center', color: '#64748b', fontSize: 13, background: 'var(--bg-card-alt,#f8fafc)', borderRadius: 12, marginBottom: 8 }}>No Tour Guide or Vendor assigned to this trip.</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button type="button" onClick={onClose} style={backBtn}>Cancel</button>
                            <button type="button" onClick={next} style={nextBtn}>Next → Account Setup</button>
                        </div>
                    </>
                )}

                {step === 1 && (
                    <>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary,#64748b)', marginBottom: 14 }}>Enter or verify the payout accounts for assigned personnel.</div>
                        {roles.length ? roles.map((r) => (
                            <AccountRow key={r.key} role={r} account={accounts[r.key]} onChange={(acc) => setAccounts((prev) => ({ ...prev, [r.key]: acc }))} />
                        )) : <div style={{ padding: 14, color: '#64748b', textAlign: 'center' }}>No accounts required.</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'space-between' }}>
                            <button type="button" onClick={() => setStep(0)} style={backBtn}>← Back</button>
                            <button type="button" onClick={next} style={nextBtn}>Next → Payment Gateway</button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div style={box}>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary,#64748b)', fontWeight: 600 }}>Total Disbursing</div>
                            <div style={{ fontSize: 26, fontWeight: 900, color: '#10b981' }}>{formatMoney(totalBudget)}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary,#64748b)', marginTop: 4 }}>Disbursing to assigned personnel</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary,#0f172a)', marginBottom: 10 }}>Select Payment Method</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                            {[['neft', '🏦 NEFT / RTGS'], ['imps', '⚡ IMPS (Instant)'], ['upi', '📱 UPI Bulk'], ['cheque', '📄 Cheque / DD']].map(([key, label]) => (
                                <button key={key} type="button" className={`gw-btn ${gw === key ? 'active' : ''}`} onClick={() => setGw(key)} style={{ padding: 12, border: gw === key ? '2px solid #0ea5e9' : '1px solid var(--border-color,#cbd5e1)', borderRadius: 12, background: gw === key ? 'rgba(14,165,233,0.07)' : 'var(--bg-surface,#fff)', fontWeight: gw === key ? 700 : 600, fontSize: 13, cursor: 'pointer', color: gw === key ? 'var(--text-primary,#0f172a)' : 'var(--text-secondary,#475569)' }}>{label}</button>
                            ))}
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ marginBottom: 10 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary,#64748b)', marginBottom: 4 }}>Authorizing Bank Account</label>
                                <select value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} style={{ ...inputStyle, padding: '10px 12px', borderRadius: 10 }}>
                                    <option>Travel Partner Operating Account</option>
                                    <option>HDFC Bank — Corporate Account</option>
                                    <option>ICICI Bank — Business Account</option>
                                    <option>SBI — Corporate Account</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary,#64748b)', marginBottom: 4 }}>Transaction PIN / OTP</label>
                                    <input type="password" placeholder="••••••" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, padding: '10px 12px', borderRadius: 10, fontSize: 14 }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary,#64748b)', marginBottom: 4 }}>Reference Note</label>
                                    <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} style={{ ...inputStyle, padding: '10px 12px', borderRadius: 10 }} />
                                </div>
                            </div>
                            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#92400e' }}>
                                ⚠️ This will initiate a real bank transfer to assigned personnel accounts set in Step 2. Review before confirming.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                            <button type="button" onClick={() => setStep(1)} style={backBtn}>← Back</button>
                            <button type="button" onClick={next} style={{ ...nextBtn, padding: '10px 24px', background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>🔐 Authorize &amp; Disburse</button>
                        </div>
                    </>
                )}

                {step === 3 && receipt && (
                    <>
                        <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 28, boxShadow: '0 8px 24px rgba(16,185,129,0.4)', color: '#fff' }}>✓</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary,#0f172a)', marginBottom: 4 }}>Budget Disbursed Successfully!</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary,#64748b)' }}>All payouts initiated via {receipt.gwMethod} on {receipt.at}</div>
                        </div>
                        <div style={{ ...box, padding: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary,#64748b)', marginBottom: 10 }}>PAYMENT RECEIPTS</div>
                            {receipt.rows.map((r) => (
                                <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color,#f1f5f9)' }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: r.color }}>{r.label}</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{formatMoney(r.amount)}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary,#94a3b8)' }}>{r.pct}% • {r.txn}</div>
                                    </div>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0', fontSize: 14, fontWeight: 800 }}>
                                <span style={{ color: 'var(--text-primary,#0f172a)' }}>Total Disbursed</span>
                                <span style={{ color: '#10b981' }}>{formatMoney(totalBudget)}</span>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} style={{ width: '100%', padding: 13, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>✓ Done</button>
                    </>
                )}
            </div>
        </div>
    );
}
