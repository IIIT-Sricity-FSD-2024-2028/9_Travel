import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/icons/Icon';
import { useUI } from '../../context/UIContext';
import { useWorkflowState } from '../../context/WorkflowContext';
import { PATHS } from '../../routes/paths';

const FALLBACK_EXEC = {
    name: 'Mahendra Kumar',
    email: 'mahendra.support@dreamdestination.com',
    phone: '+91 98765 43210',
};

const FAQS = [
    'How do I change my itinerary?',
    "What if my guide doesn't show up?",
    'How do I contact my guide?',
    'What should I do if I lose my documents?',
    'How do I cancel a hotel stay?',
    'Can I add extra activities to my trip?',
    'What happens in case of bad weather?',
    'Who do I contact in a crisis?',
];

/** Support executive shown to travelers (renderTravelerSupportPage). */
export function useSupportExecutive(state) {
    const users = Array.isArray(state.users) ? state.users : [];
    const exec = users.find((u) => u.role === 'support' || u.email?.includes('support')) || FALLBACK_EXEC;
    const name = exec.name || FALLBACK_EXEC.name;
    return {
        name,
        email: exec.email || FALLBACK_EXEC.email,
        phone: exec.phone || FALLBACK_EXEC.phone,
        initials: name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'MK',
    };
}

/** traveler_support.html */
export default function TravelerSupport() {
    const state = useWorkflowState();
    const navigate = useNavigate();
    const { toast } = useUI();
    const exec = useSupportExecutive(state);
    const call = () => toast(`Calling Support Executive ${exec.name} at ${exec.phone}...`, 'info');
    const email = () => { window.location.href = `mailto:${exec.email}`; };

    return (
        <DashboardLayout role="traveler" page="traveler__traveler_support">
            <div className="page-content">
                <div>
                    <h1>Customer Support</h1>
                    <p>We&apos;re here to help 24/7 during your journey</p>
                </div>
                <div className="support-top-grid">
                    <div className="rep-card">
                        <div className="rep-header">
                            <div className="rep-avatar">{exec.initials}</div>
                            <div>
                                <div className="rep-name">{exec.name}</div>
                                <div className="rep-role">Your Support Executive</div>
                                <div className="rep-status"><div className="status-dot" /> Available Now</div>
                            </div>
                        </div>
                        <div className="rep-details">
                            <div className="rep-detail-item"><Icon name="phone" className="rep-detail-icon" /> <span>{exec.phone}</span></div>
                            <div className="rep-detail-item"><Icon name="mail" className="rep-detail-icon" /> <span>{exec.email}</span></div>
                            <div className="rep-detail-item"><Icon name="clock" className="rep-detail-icon" /> Available 24/7 for your trip</div>
                        </div>
                        <div className="rep-actions">
                            <button type="button" className="btn-rep-call" onClick={call}><Icon name="phone" /> Call Now</button>
                            <button type="button" className="btn-rep-chat" onClick={() => navigate(PATHS.traveler.messages)}><Icon name="message" /> Chat</button>
                        </div>
                    </div>
                    <div className="em-card">
                        <div>
                            <div className="em-header">
                                <div className="em-icon"><Icon name="alerttriangle" /></div>
                                <div>
                                    Emergency Help
                                    <div>Immediate assistance worldwide</div>
                                </div>
                            </div>
                            <div className="em-info">
                                <div className="em-info-item"><Icon name="phone" /> Hotline: <span>{exec.phone}</span></div>
                                <div className="em-info-item"><Icon name="mail" /> Email: <span>{exec.email}</span></div>
                            </div>
                            <div className="em-note">For critical situations including safety concerns, medical emergencies, or severe travel issues.</div>
                        </div>
                        <button type="button" className="btn-em-help" onClick={() => navigate(PATHS.traveler.reportIssue)}><Icon name="phone" /> Emergency Contact</button>
                    </div>
                </div>

                <h2 className="section-headline">How Can We Help You?</h2>
                <div className="help-cards-grid">
                    <div className="hc-card">
                        <div className="hc-icon blue"><Icon name="phone" /></div>
                        <div className="hc-title">Phone Support</div>
                        <div className="hc-desc">Speak directly with our support team for immediate assistance.</div>
                        <button type="button" className="btn-hc blue" onClick={call}>Call Now</button>
                    </div>
                    <div className="hc-card">
                        <div className="hc-icon teal"><Icon name="message" /></div>
                        <div className="hc-title">Live Chat</div>
                        <div className="hc-desc">Get instant help through chat for minor inquiries or guidance.</div>
                        <button type="button" className="btn-hc teal" onClick={() => navigate(PATHS.traveler.messages)}>Start Chat</button>
                    </div>
                    <div className="hc-card">
                        <div className="hc-icon purple"><Icon name="mail" /></div>
                        <div className="hc-title">Email Support</div>
                        <div className="hc-desc">Send us detailed inquiries or documents for review.</div>
                        <button type="button" className="btn-hc purple" onClick={email}>Send Email</button>
                    </div>
                </div>

                <h2 className="section-headline">Frequently Asked Questions</h2>
                <div className="faq-grid">
                    {FAQS.map((q) => <div className="faq-item" key={q}>{q} <Icon name="chevronright" /></div>)}
                </div>
                <button type="button" className="btn-view-all">View All FAQs</button>

                <div className="info-grid">
                    <div className="info-card blue">
                        <Icon name="headphones" className="ic-icon blue" />
                        <div><div className="ic-title">24/7 Support</div><div className="ic-desc">Round the clock assistance during your entire trip.</div></div>
                    </div>
                    <div className="info-card green">
                        <Icon name="clock" className="ic-icon green" />
                        <div><div className="ic-title">Quick Response</div><div className="ic-desc">Average response time under 5 minutes.</div></div>
                    </div>
                    <div className="info-card purple">
                        <Icon name="message" className="ic-icon purple" />
                        <div><div className="ic-title">Multi-Channel</div><div className="ic-desc">Reach us via phone, chat, email, or app.</div></div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
