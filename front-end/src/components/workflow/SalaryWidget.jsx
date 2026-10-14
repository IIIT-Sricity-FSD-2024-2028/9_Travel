import { useAuth } from '../../context/AuthContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { SALARY_PAYOUTS_KEY, safeJson } from '../../services/workflow';

/** "Payments & Confidential Salary" card on profile pages (renderMonthlySalaryWidget). */
export default function SalaryWidget() {
    const { session } = useAuth();
    const state = useWorkflowState();
    if (!session || !session.email) return null;

    const currentEmail = String(session.email || '').toLowerCase().trim();
    const currentName = String(session.name || '').toLowerCase().trim();
    const currentId = String(session.id || '').toLowerCase().trim();

    const myPayouts = safeJson(SALARY_PAYOUTS_KEY, []).filter((p) => {
        const pEmail = String(p.userEmail || p.userId || '').toLowerCase().trim();
        const pName = String(p.userName || '').toLowerCase().trim();
        const pId = String(p.userId || '').toLowerCase().trim();
        return (pEmail && (pEmail === currentEmail || currentEmail.includes(pEmail)))
            || (pName && (pName === currentName || currentName.includes(pName)))
            || (pId && pId === currentId);
    });
    const salaryNotifs = (state.notifications || []).filter((n) => {
        const isSal = String(n.title || '').toLowerCase().includes('salary') || String(n.message || '').toLowerCase().includes('salary');
        const rec = String(n.recipientId || n.userEmail || '').toLowerCase().trim();
        return isSal && (!rec || rec === currentEmail || rec === currentId || (currentName && String(n.message || '').toLowerCase().includes(currentName)));
    });
    if (!myPayouts.length && !salaryNotifs.length) return null;

    const latest = myPayouts[0] || {};
    const amountVal = latest.amount || (salaryNotifs[0] && (String(salaryNotifs[0].message).match(/₹([\d,]+)/) || [])[1]);
    const amount = amountVal ? (String(amountVal).startsWith('₹') ? amountVal : `₹${Number(String(amountVal).replace(/,/g, '')).toLocaleString()}`) : 'Disbursed';
    const month = latest.month || 'Current Month';
    const dateStr = latest.disbursedAt ? new Date(latest.disbursedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';

    return (
        <div id="employee-salary-payout-widget" style={{ marginTop: 24, background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', color: '#ffffff', padding: 24, borderRadius: 16, boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.3)' }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', paddingBottom: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>💳 Payments &amp; Confidential Salary</span>
                <span style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: 99, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confidential</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💸</div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#a7f3d0' }}>Monthly Salary Disbursed</div>
                        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{amount} <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.85 }}>({month})</span></div>
                        <div style={{ fontSize: 12, color: '#d1fae5', marginTop: 2 }}>Processed on {dateStr} • Direct Bank Transfer Completed</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                        ✓ Completed ({latest.id || 'PAY-SUCCESS'})
                    </span>
                </div>
            </div>
        </div>
    );
}
