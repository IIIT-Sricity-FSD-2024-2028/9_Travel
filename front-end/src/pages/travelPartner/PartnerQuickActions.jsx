import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';
import { relativeTime } from '../../services/workflow';

const P = PATHS.partner;
const CARDS = [
    ['card-blue', 'dashboard', 'Request Vendor Availability', 'Check vendor availability for upcoming trips', 'Check Availability', P.vendorAssignment],
    ['card-teal', 'users', 'Assign Vendor', 'Quickly assign vendors to pending trips', 'Assign Vendor', P.vendorAssignment],
    ['card-purple', 'mappin', 'Assign Tour Guide', 'Assign qualified guides to scheduled trips', 'Assign Guide', P.guideAssignment],
];

/**
 * travelPartner_quickActions.html. The original "Recent Actions" container had no renderer;
 * it now lists the latest updates recorded by the Travel Partner on real trips.
 */
export default function PartnerQuickActions() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const history = (state.trips || [])
        .flatMap((trip) => (trip.updates || []).filter((u) => u.source === 'Travel Partner').map((u) => ({ ...u, trip })))
        .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0))
        .slice(0, 6);

    return (
        <DashboardLayout role="partner" page="travelPartner__travelPartner_quickActions">
            <div className="page-content">
                <div className="page-header">
                    <div className="flex items-center gap-2 mb-1">
                        <div><Icon name="zap" /></div>
                        <h1 className="text-2xl font-bold text-gray-900">Quick Actions</h1>
                    </div>
                    <p className="text-sm text-gray-500">Auxiliary platform actions and tools</p>
                </div>
                <div className="action-grid">
                    {CARDS.map(([cls, icon, title, desc, label, to]) => (
                        <div className={`action-card ${cls}`} key={title}>
                            <div className="action-icon"><Icon name={icon} /></div>
                            <h3 className="action-title">{title}</h3>
                            <p className="action-desc">{desc}</p>
                            <button type="button" className="action-btn" onClick={() => navigate(to)}>{label}</button>
                        </div>
                    ))}
                </div>
                <div className="recent-actions">
                    <div className="recent-header">Recent Actions</div>
                    <div id="quick-actions-history-list">
                        {history.length ? history.map((item) => (
                            <div className="history-item" key={`${item.trip.id}-${item.id}`}>
                                <div className="history-left">
                                    <div className="history-icon"><Icon name="checkcircle" /></div>
                                    <div>
                                        <div className="history-text">{item.title} - {item.trip.id}</div>
                                        <div className="history-time">{relativeTime(item.createdAt)}</div>
                                    </div>
                                </div>
                                <span className="badge-executed">Executed</span>
                            </div>
                        )) : <div style={{ padding: 16, color: 'var(--text-secondary, #64748b)', fontSize: 13 }}>No recent actions yet.</div>}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
