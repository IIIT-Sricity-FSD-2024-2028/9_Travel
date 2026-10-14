import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageStyles from '../components/PageStyles';
import ThemeToggle from '../components/ThemeToggle';

const SLIDES = ['/images/hero1.jpg', '/images/hero2.jpg', '/images/hero3.jpg', '/images/hero4.jpg', '/images/hero5.jpg'];
const LOCATIONS = [
    '📍 Maldives Crystal Lagoon',
    '📍 Swiss Alps Mountain Lake',
    '📍 Dubai Desert & Horizon',
    '📍 Paris Eiffel Tower Cityscape',
    '📍 Kyoto Temple, Japan',
];
const DOT_TITLES = ['Maldives', 'Swiss Alps', 'Kyoto Japan', 'Paris France', 'Rome Italy'];

const FEATURES = [
    ['icon-blue', '👥', 'Vendor Coordination', 'Seamlessly assign and manage vendors for accommodations, transportation, and activities'],
    ['icon-green', '📍', 'Guide Management', 'Connect travelers with local guides and track real-time tour progress'],
    ['icon-purple', '🔔', 'Real-time Updates', 'Instant notifications for all stakeholders about trip changes and progress'],
    ['icon-orange', '🛡️', 'Issue Resolution', 'Quick response system for handling travel issues with support team coordination'],
    ['icon-violet', '📈', 'Trip Monitoring', 'Comprehensive dashboard to track all trips, stages, and performance metrics'],
    ['icon-teal', '✅', 'Status Tracking', 'Monitor every stage from booking to completion with detailed progress indicators'],
];

const STEPS = [
    ['Create Trip', 'Partner creates trip details'],
    ['Assign Vendor', 'Select and assign vendors'],
    ['Assign Guide', 'Connect with local guides'],
    ['Live Updates', 'Real-time progress tracking'],
    ['Issue Handling', 'Quick resolution system'],
    ['Completion', 'Trip review and feedback'],
];

const ROLES = [
    { role: 'superuser', avatar: 'S', cls: 'purple', style: { background: '#6366f1', color: '#fff' }, title: 'Super Admin', text: 'Platform Governance', hint: 'Sign In as Super Admin' },
    { role: 'traveler', avatar: 'T', cls: 'blue', title: 'Traveler', text: 'Track your journey', hint: 'Sign In as Traveler' },
    { role: 'partner', avatar: 'T', cls: 'green', title: 'Travel Partner', text: 'Coordinate trips', hint: 'Sign In as Travel Partner' },
    { role: 'vendor', avatar: 'V', cls: 'violet', title: 'Vendor', text: 'Manage services', hint: 'Sign In as Vendor' },
    { role: 'guide', avatar: 'T', cls: 'orange', title: 'Tour Guide', text: 'Lead experiences', hint: 'Sign In as Tour Guide' },
    { role: 'support', avatar: 'S', cls: 'slate', title: 'Support Executive', text: 'Resolve issues', hint: 'Sign In as Support Executive' },
];

export default function LandingPage() {
    const navigate = useNavigate();
    const [slide, setSlide] = useState(0);
    const timer = useRef(null);

    const resetTimer = useCallback(() => {
        clearInterval(timer.current);
        timer.current = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500);
    }, []);

    useEffect(() => {
        resetTimer();
        return () => clearInterval(timer.current);
    }, [resetTimer]);

    const scrollTo = (id) => (event) => {
        event.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            <PageStyles page="landing_page" />
            <nav>
                <a href="#top" className="nav-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <div className="nav-logo-icon">✈</div>
                    Dream Destination
                </a>
                <ul className="nav-links" id="landing-nav-links">
                    <li><a href="#features" onClick={scrollTo('features')}>Features</a></li>
                    <li><a href="#how-it-works" onClick={scrollTo('how-it-works')}>How it Works</a></li>
                    <li><a href="#roles" onClick={scrollTo('roles')}>Roles</a></li>
                    <li><a href="#contact" onClick={scrollTo('contact')}>Contact</a></li>
                </ul>
                <div className="nav-actions">
                    <ThemeToggle />
                    <button type="button" className="btn-login" id="nav-login-btn" onClick={() => navigate('/login')}>Login</button>
                    <button type="button" className="btn-get-started" id="nav-get-started-btn" onClick={() => navigate('/login')}>Get Started</button>
                </div>
            </nav>

            <section className="hero">
                <div className="hero-slideshow">
                    {SLIDES.map((src, i) => (
                        <div key={src} className={`hero-slide${i === slide ? ' active' : ''}`} style={{ backgroundImage: `url('${src}')` }} />
                    ))}
                    <div className="hero-overlay" />
                </div>

                <div className="hero-content">
                    <div className="hero-left">
                        <div className="hero-location-badge">
                            <span className="location-dot" />
                            <span id="hero-location-text">{LOCATIONS[slide]}</span>
                        </div>
                        <div className="hero-label">Beyond Booking</div>
                        <h1 className="hero-title">Seamless Travel<br />Coordination<br /><span>Beyond Booking</span></h1>
                        <p className="hero-subtitle">Connect partners, vendors, guides, and support teams in one powerful platform.
                            Manage every aspect of travel coordination with real-time updates and seamless collaboration.</p>
                        <div className="hero-buttons">
                            <button type="button" className="btn-primary" id="hero-get-started-btn" onClick={() => navigate('/login')}>Get Started →</button>
                            <button type="button" className="btn-secondary" id="hero-explore-btn" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Explore</button>
                        </div>
                    </div>
                    <div className="hero-right">
                        <div className="trip-card">
                            <div className="trip-card-header">
                                <span className="title">Trip Progress</span>
                                <span className="live-badge">Live Updates</span>
                            </div>
                            <div className="trip-item green">
                                <span className="trip-item-icon">
                                    <div><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
                                </span>
                                <div className="trip-item-text">
                                    <div className="main">Vendor Assigned</div>
                                    <div className="sub">Hotel Paradise · Paris</div>
                                </div>
                            </div>
                            <div className="trip-item blue">
                                <span className="trip-item-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#ec4899" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" fill="#fff" /></svg>
                                </span>
                                <div className="trip-item-text">
                                    <div className="main">Guide On Route</div>
                                    <div className="sub">ETA: 15 minutes</div>
                                </div>
                            </div>
                            <div className="trip-item yellow">
                                <span className="trip-item-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                                </span>
                                <div className="trip-item-text">
                                    <div className="main">New Alert</div>
                                    <div className="sub">Weather update for tomorrow</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hero-slide-controls">
                    {DOT_TITLES.map((title, i) => (
                        <button key={title} type="button" className={`slide-dot${i === slide ? ' active' : ''}`} title={title} aria-label={`Show ${title}`} onClick={() => { setSlide(i); resetTimer(); }} />
                    ))}
                </div>
            </section>

            <section id="features" className="features">
                <div className="section-header">
                    <h2>Powerful Features</h2>
                    <p>Everything you need to coordinate seamless travel experiences</p>
                </div>
                <div className="features-grid">
                    {FEATURES.map(([cls, emoji, title, text]) => (
                        <div className="feature-card" key={title}>
                            <div className={`feature-icon ${cls}`}>{emoji}</div>
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="how-it-works" className="how-it-works">
                <div className="section-header">
                    <h2>How It Works</h2>
                    <p>Simple workflow from trip creation to completion</p>
                </div>
                <div className="steps">
                    {STEPS.map(([title, desc], i) => (
                        <div className="step" key={title}>
                            <div className="step-num">{i + 1}</div>
                            <div className="step-title">{title}</div>
                            <div className="step-desc">{desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section id="roles" className="roles">
                <div className="section-header">
                    <h2>Multiple Roles, One Platform</h2>
                    <p>Tailored experiences for every stakeholder</p>
                </div>
                <div className="roles-grid">
                    {ROLES.map((r) => (
                        <div className="role-card" key={r.role} role="button" tabIndex={0} title={r.hint} onClick={() => navigate(`/login?role=${r.role}`)} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/login?role=${r.role}`); }}>
                            <div className={`role-avatar ${r.cls}`} style={r.style}>{r.avatar}</div>
                            <h3>{r.title}</h3>
                            <p>{r.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="cta-section">
                <h2>Ready to Transform Travel Coordination?</h2>
                <p>Join thousands of travel professionals using Dream Destination</p>
                <button type="button" className="btn-cta" id="cta-get-started-btn" onClick={() => navigate('/login')}>Get Started Today</button>
            </div>

            <footer id="contact">
                <div className="footer-brand">
                    <div className="logo">
                        <div className="logo-icon">✈</div>
                        Dream Destination
                    </div>
                    <p>Travel coordination platform<br />beyond booking</p>
                </div>
                <div className="footer-col">
                    <h4>Product</h4>
                    <ul>
                        <li><a href="#features" onClick={scrollTo('features')}>Features</a></li>
                        <li><a href="#how-it-works" onClick={scrollTo('how-it-works')}>How it Works</a></li>
                        <li><a href="#roles" onClick={scrollTo('roles')}>Roles</a></li>
                    </ul>
                </div>
                <div className="footer-col">
                    <h4>Company</h4>
                    <ul>
                        <li><Link to="/">About</Link></li>
                        <li><Link to="/">Careers</Link></li>
                        <li><a href="#contact" onClick={scrollTo('contact')}>Contact</a></li>
                    </ul>
                </div>
                <div className="footer-col">
                    <h4>Support</h4>
                    <ul>
                        <li><Link to="/login?role=support">Help Center</Link></li>
                        <li><Link to="/">Documentation</Link></li>
                        <li><Link to="/login?role=support">Contact Support</Link></li>
                    </ul>
                </div>
            </footer>
            <div className="footer-bottom">© 2026 Dream Destination. All rights reserved.</div>
        </>
    );
}
