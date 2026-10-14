import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { ROLE_HOME, useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { normRole } from '../services/session';

const ROLE_BUTTONS = [
    { role: 'superuser', label: 'Super Admin', full: true },
    { role: 'traveler', label: 'Traveler' },
    { role: 'partner', label: 'Travel Partner' },
    { role: 'vendor', label: 'Vendor' },
    { role: 'guide', label: 'Tour Guide' },
    { role: 'support', label: 'Support Executive', full: true },
];

const DEMO_ACCOUNTS = [
    { role: 'superuser', email: 'superadmin@gmail.com', label: 'Admin' },
    { role: 'traveler', email: 'traveler@gmail.com', label: 'Traveler' },
    { role: 'partner', email: 'dileep@gmail.com', label: 'Partner' },
    { role: 'guide', email: 'koushik@gmail.com', label: 'Guide' },
    { role: 'vendor', email: 'lokesh@gmail.com', label: 'Vendor' },
    { role: 'support', email: 'mahendra@gmail.com', label: 'Support' },
];

const EMAIL_TO_ROLE = {
    'superadmin@gmail.com': 'superuser',
    'traveler@gmail.com': 'traveler',
    'nbharathnrr@gmail.com': 'traveler',
    'dileep@gmail.com': 'partner',
    'partner@gmail.com': 'partner',
    'koushik@gmail.com': 'guide',
    'guide@gmail.com': 'guide',
    'lokesh@gmail.com': 'vendor',
    'vendor@gmail.com': 'vendor',
    'mahendra@gmail.com': 'support',
    'support@gmail.com': 'support',
};

const FEATURES = [
    { title: 'Real-time Coordination', text: 'Stay connected with all stakeholders' },
    { title: 'Seamless Management', text: 'Handle trips from start to finish' },
];

export default function Login() {
    const { login, completeLogin } = useAuth();
    const { confirm } = useUI();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const requestedRole = normRole(searchParams.get('role'));

    const [role, setRole] = useState(ROLE_BUTTONS.some((b) => b.role === requestedRole) ? requestedRole : 'superuser');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [pulse, setPulse] = useState(false);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const redirectTimer = useRef(null);

    useEffect(() => () => clearTimeout(redirectTimer.current), []);

    const placeholder = DEMO_ACCOUNTS.find((d) => d.role === role)?.email || 'you@gmail.com';
    const clearMessages = () => { setError(''); setSuccessMessage(''); };

    const fillDemo = (demo) => {
        setRole(demo.role);
        setEmail(demo.email);
        setPassword('');
        clearMessages();
        setTimeout(() => passwordRef.current?.focus(), 0);
        setPulse(true);
        setTimeout(() => setPulse(false), 200);
    };

    const onEmailChange = (value) => {
        setEmail(value);
        clearMessages();
        const detected = EMAIL_TO_ROLE[value.trim().toLowerCase()];
        if (detected) setRole(detected);
    };

    const onSubmit = async (event) => {
        event.preventDefault();
        clearMessages();
        const trimmed = email.trim();
        if (!trimmed) { setError('Please enter your email address.'); emailRef.current?.focus(); return; }
        if (!password) { setError('Please enter your password.'); passwordRef.current?.focus(); return; }

        setSubmitting(true);
        try {
            const data = await login({ email: trimmed, password, role });
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
            const roleMatch = message.match(/Select "(.*?)" to sign in/i);
            if (roleMatch && roleMatch[1]) setRole(normRole(roleMatch[1]) || role);
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

                    <span className="label-style">Select Your Role</span>
                    <div className="role-selector" id="roleGrid">
                        {ROLE_BUTTONS.map((btn) => (
                            <button
                                key={btn.role}
                                type="button"
                                data-role={btn.role}
                                className={`role-btn${btn.full ? ' full-width' : ''}${role === btn.role ? ' active' : ''}`}
                                onClick={() => { setRole(btn.role); clearMessages(); }}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    <div className="demo-accounts-bar" id="demoAccountsBar">
                        <div className="demo-bar-header">
                            <span>💡 Quick Demo Accounts</span>
                            <span className="demo-bar-hint">1-click fill</span>
                        </div>
                        <div className="demo-pills" id="demoPills">
                            {DEMO_ACCOUNTS.map((demo) => (
                                <button key={demo.role} type="button" className="demo-pill" data-role={demo.role} onClick={() => fillDemo(demo)}>{demo.label}</button>
                            ))}
                        </div>
                    </div>

                    <form id="loginForm" onSubmit={onSubmit} noValidate>
                        <label className="label-style" htmlFor="emailInput">Email Address</label>
                        <div className="input-group">
                            <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <input ref={emailRef} type="email" id="emailInput" className="input-field" placeholder={placeholder} value={email} onChange={(e) => onEmailChange(e.target.value)} required autoComplete="email" />
                        </div>

                        <label className="label-style" htmlFor="passwordInput">Password</label>
                        <div className="input-group">
                            <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <input ref={passwordRef} type="password" id="passwordInput" className="input-field" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); clearMessages(); }} required autoComplete="current-password" />
                        </div>

                        <div className="form-utils">
                            <label className="remember"><input type="checkbox" id="rememberMe" /> Remember me</label>
                            <a href="#forgot" className="forgot" onClick={(e) => { e.preventDefault(); window.alert('Password reset instructions have been sent to your email.'); }}>Forgot Password?</a>
                        </div>

                        <button type="submit" id="loginSubmitBtn" className="btn-submit" disabled={submitting} style={pulse ? { transform: 'scale(1.02)' } : undefined}>
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
                        <div className="support" onClick={() => setRole('support')} role="button" tabIndex={0} style={{ cursor: 'pointer', marginTop: 4 }}>
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
