import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageStyles from '../components/PageStyles';
import ThemeToggle from '../components/ThemeToggle';

const SLIDES = ['/images/hero1.jpg', '/images/hero2.jpg', '/images/hero3.jpg', '/images/hero4.jpg', '/images/hero5.jpg'];
const LOCATIONS = [
    '📍 Maldives Crystal Lagoon',
    '📍 Swiss Alps Mountain Escape',
    '📍 Dubai Desert & Horizon',
    '📍 Paris Eiffel Tower Cityscape',
    '📍 Kyoto Temple, Japan',
];
const DOT_TITLES = ['Maldives', 'Swiss Alps', 'Dubai', 'Paris', 'Kyoto'];

/**
 * Shared layout of the Login and Register screens: full-page photo slideshow,
 * top bar with brand / theme toggle / home link and the left hero panel.
 */
export default function AuthLayout({ page, title, description, features, children }) {
    const [slide, setSlide] = useState(0);
    const timer = useRef(null);

    useEffect(() => {
        document.body.classList.add('auth-body');
        return () => document.body.classList.remove('auth-body');
    }, []);

    useEffect(() => {
        timer.current = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500);
        return () => clearInterval(timer.current);
    }, []);

    return (
        <>
            <PageStyles page={page} />
            <div className="auth-page-slideshow">
                {SLIDES.map((src, i) => (
                    <div key={src} className={`login-slide${i === slide ? ' active' : ''}`} style={{ backgroundImage: `url('${src}')` }} />
                ))}
                <div className="login-overlay" />
            </div>

            <div className="auth-top-bar">
                <Link to="/" className="auth-brand-logo">
                    <div className="logo-sq">DD</div>
                    <span>Dream Destination</span>
                </Link>
                <div className="auth-top-actions">
                    <ThemeToggle />
                    <Link to="/" className="back-home-btn">← Back to Home</Link>
                </div>
            </div>

            <div className="auth-content-container">
                <div className="left-panel">
                    <div className="login-slide-location">
                        <span className="location-dot" />
                        <span id="login-location-text">{LOCATIONS[slide]}</span>
                    </div>
                    <h1>{title}</h1>
                    <p className="hero-desc">{description}</p>
                    {features.map((feature) => (
                        <div className="glass-card" key={feature.title}>
                            <div className="check-icon">✓</div>
                            <div>
                                <div style={{ fontWeight: 600 }}>{feature.title}</div>
                                <div style={{ fontSize: '0.88rem', opacity: 0.88 }}>{feature.text}</div>
                            </div>
                        </div>
                    ))}
                    <div className="login-slide-controls">
                        {DOT_TITLES.map((dotTitle, i) => (
                            <button key={dotTitle} type="button" className={`login-slide-dot${i === slide ? ' active' : ''}`} onClick={() => setSlide(i)} title={dotTitle} aria-label={`Show ${dotTitle}`} />
                        ))}
                    </div>
                </div>
                <div className="right-panel">{children}</div>
            </div>
        </>
    );
}
