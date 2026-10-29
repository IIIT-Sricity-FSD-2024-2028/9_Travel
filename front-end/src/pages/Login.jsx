import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { ROLE_HOME, useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { normRole } from '../services/session';

const FEATURES = [
    { title: 'Real-time Coordination', text: 'Stay connected with all stakeholders' },
    { title: 'Seamless Management', text: 'Handle trips from start to finish' },
];

const PRESET_ACCOUNTS = [
    { name: 'Super Admin', role: 'Super Admin', email: 'superadmin@gmail.com', password: 'admin123', icon: '🛡️', color: '#6366f1' },
    { name: 'N Bharath', role: 'Traveler', email: 'traveler@gmail.com', password: '123456', icon: '✈️', color: '#0ea5e9' },
    { name: 'Dileep', role: 'Travel Partner', email: 'dileep@gmail.com', password: '123456', icon: '🤝', color: '#10b981' },
    { name: 'Koushik', role: 'Tour Guide', email: 'koushik@gmail.com', password: '123456', icon: '🧭', color: '#f59e0b' },
    { name: 'Lokesh', role: 'Vendor', email: 'lokesh@gmail.com', password: '123456', icon: '🏨', color: '#8b5cf6' },
    { name: 'Mahendra', role: 'Support Executive', email: 'mahendra@gmail.com', password: '123456', icon: '🎧', color: '#64748b' },
];

export default function Login() {
    const { login, completeLogin, isAuthenticated, role: userRole } = useAuth();
    const { confirm } = useUI();
    const navigate = useNavigate();
    const location = useLocation();

    // Automatically navigate authenticated users to their portal dashboard
    useEffect(() => {
        if (isAuthenticated) {
            const home = ROLE_HOME[userRole] || ROLE_HOME.traveler;
            const from = location.state?.from;
            const target = from && from.startsWith(home.split('/').slice(0, 2).join('/')) ? from : home;
            navigate(target, { replace: true });
        }
    }, [isAuthenticated, userRole, location.state, navigate]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const redirectTimer = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => () => clearTimeout(redirectTimer.current), []);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) && emailRef.current && !emailRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const clearMessages = () => { setError(''); setSuccessMessage(''); };

    const filteredAccounts = PRESET_ACCOUNTS.filter((acc) => {
        if (!email.trim()) return true;
        const q = email.toLowerCase().trim();
        return acc.email.toLowerCase().includes(q) ||
               acc.name.toLowerCase().includes(q) ||
               acc.role.toLowerCase().includes(q);
    });

    const handleSelectAccount = (acc) => {
        setEmail(acc.email);
        setPassword(acc.password);
        setShowSuggestions(false);
        clearMessages();
    };

    const onEmailChange = (val) => {
        setEmail(val);
        clearMessages();
        setShowSuggestions(true);
        const matched = PRESET_ACCOUNTS.find((a) => a.email.toLowerCase() === val.trim().toLowerCase());
        if (matched) {
            setPassword(matched.password);
        }
    };

    const onSubmit = async (event) => {
        event.preventDefault();
        clearMessages();
        setShowSuggestions(false);
        const trimmed = email.trim();
        if (!trimmed) { setError('Please enter your email address.'); emailRef.current?.focus(); return; }
        if (!password) { setError('Please enter your password.'); passwordRef.current?.focus(); return; }

        setSubmitting(true);
        try {
            // Direct credential login - backend verifies credentials and resolves account role
            const data = await login({ email: trimmed, password });
            if (data.status === 'Inactive') {
                const proceed = await confirm({
                    title: 'Account Inactive',
                    message: '⚠️ Your account is currently Inactive. You can access the portal but cannot perform any actions until the Super Admin reactivates your account.',
                    confirmText: 'Continue',
                    tone: 'green',
                });
                if (!proceed) { setSubmitting(false); return; }
            }
            setSuccessMessage(`Welcome back, ${data.name || 'User'}! Redirecting...`);
            redirectTimer.current = setTimeout(() => {
                const next = completeLogin(data);
                const nextRole = normRole(next.role);
                const from = location.state?.from;
                const home = ROLE_HOME[nextRole] || ROLE_HOME.traveler;
                navigate(from && from.startsWith(home.split('/').slice(0, 2).join('/')) ? from : home, { replace: true });
            }, 300);
        } catch (err) {
            setSubmitting(false);
            const message = err.message || 'Login failed. Please check your credentials.';
            setError(message);
        }
    };

    return (
        <AuthLayout page="login" title={<>Coordinate Travel<br />Beyond Booking</>} description="Connect partners, vendors, guides, and support teams in one powerful platform" features={FEATURES}>
            <div className="login-wrapper">
                <div className="login-box">
                    <h2>Welcome Back</h2>
                    <p className="sub-text">Sign in to access your dashboard</p>

                    {error && <div id="login-error-msg" className="auth-alert error-banner" role="alert">{error}</div>}
                    {successMessage && <div id="login-success-msg" className="auth-alert success-banner" role="status">{successMessage}</div>}

                    <form id="loginForm" onSubmit={onSubmit} noValidate>
                        <label className="label-style" htmlFor="emailInput">Email Address</label>
                        <div className="input-group">
                            <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <input
                                ref={emailRef}
                                type="email"
                                id="emailInput"
                                className="input-field"
                                placeholder="e.g. traveler@gmail.com"
                                value={email}
                                onChange={(e) => onEmailChange(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                onKeyDown={(e) => { if (e.key === 'Escape') setShowSuggestions(false); }}
                                required
                                autoComplete="email"
                                list="presetEmailList"
                            />

                            <datalist id="presetEmailList">
                                {PRESET_ACCOUNTS.map((a) => (
                                    <option key={a.email} value={a.email}>{a.role} ({a.name})</option>
                                ))}
                            </datalist>

                            {/* Floating account auto-complete suggestions */}
                            {showSuggestions && filteredAccounts.length > 0 && (
                                <div className="account-suggestions-dropdown" ref={dropdownRef}>
                                    <div className="account-suggestions-header">
                                        <span>Click account to auto-fill</span>
                                        <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>⚡ 1-click</span>
                                    </div>
                                    {filteredAccounts.map((acc) => (
                                        <div
                                            key={acc.email}
                                            className="account-suggestion-item"
                                            onClick={() => handleSelectAccount(acc)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSelectAccount(acc); }}
                                        >
                                            <div className="account-badge-avatar" style={{ background: `${acc.color}25`, border: `1px solid ${acc.color}50` }}>
                                                {acc.icon}
                                            </div>
                                            <div className="account-info-col">
                                                <div className="account-title-row">
                                                    <span className="account-role-label">{acc.role}</span>
                                                    <span style={{ fontSize: '0.74rem', color: acc.color, fontWeight: 600 }}>({acc.name})</span>
                                                </div>
                                                <span className="account-email-label">{acc.email}</span>
                                            </div>
                                            <span className="account-fill-tag">Select</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <label className="label-style" htmlFor="passwordInput">Password</label>
                        <div className="input-group">
                            <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <input
                                ref={passwordRef}
                                type="password"
                                id="passwordInput"
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); clearMessages(); }}
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <div className="form-utils">
                            <label className="remember"><input type="checkbox" id="rememberMe" /> Remember me</label>
                            <a href="#forgot" className="forgot" onClick={(e) => { e.preventDefault(); window.alert('Password reset instructions have been sent to your email.'); }}>Forgot Password?</a>
                        </div>

                        <button type="submit" id="loginSubmitBtn" className="btn-submit" disabled={submitting}>
                            {submitting ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="create-acc" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                        <div>
                            Don&apos;t have an account? <Link to="/register">Create Account</Link>
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                            Want to partner with us? <Link to="/become-partner" style={{ color: 'var(--primary, #0ea5e9)', fontWeight: 600 }}>Become a Business Partner</Link>
                        </div>
                        <div
                            className="support"
                            onClick={() => window.alert('For support, please email support@dreamdestination.com or contact our 24/7 helpline.')}
                            role="button"
                            tabIndex={0}
                            style={{ cursor: 'pointer', marginTop: 4 }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Contact Support
                        </div>
                    </div>
                </div>
                <p className="policy">By signing in, you agree to our Terms of Service and Privacy Policy</p>
            </div>
        </AuthLayout>
    );
}
