import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { authApi } from '../services/api';
import { autoAssignTraveler, getSnapshot } from '../services/workflow';

const FEATURES = [
    { title: 'Tailored Experiences', text: 'Custom tools personalized for your role' },
    { title: 'Global Network', text: 'Connect with travelers, partners, and guides' },
];

const OTP_LENGTH = 6;

export default function Register() {
    const { register } = useAuth();
    const { success } = useUI();
    const navigate = useNavigate();

    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState('');
    const [infoMsg, setInfoMsg] = useState('');
    const [sendingOtp, setSendingOtp] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [countdown, setCountdown] = useState(60);

    const otpInputRef = useRef(null);

    // Resend countdown timer
    useEffect(() => {
        if (!otpSent || countdown <= 0) return;
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [otpSent, countdown]);

    const update = (field) => (event) => {
        setForm((prev) => ({ ...prev, [field]: event.target.value }));
        setError('');
        setInfoMsg('');
    };

    /** Step 1: Send OTP to verify that the entered email exists */
    const handleSendOtp = async (event) => {
        event.preventDefault();
        setError('');
        setInfoMsg('');

        if (!form.name.trim()) {
            setError('Please enter your full name.');
            return;
        }
        if (!form.email.trim()) {
            setError('Please enter your email address.');
            return;
        }
        if (!/^\d{10}$/.test(form.phone.trim())) {
            setError('Invalid phone number. Use exactly 10 digits.');
            return;
        }
        if (form.password.length < 3) {
            setError('Password must be at least 3 characters.');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSendingOtp(true);
        try {
            const res = await authApi.sendRegistrationOtp({
                email: form.email.trim(),
                name: form.name.trim(),
                purpose: 'Traveler Registration',
            });
            setOtpSent(true);
            setCountdown(60);
            if (res && res.devOtp) {
                setOtp(res.devOtp);
                setInfoMsg(`📧 SMTP not configured yet. Your verification code is ${res.devOtp}`);
            } else {
                setInfoMsg(`A 6-digit verification code has been sent to ${form.email.trim()}.`);
            }
            setTimeout(() => otpInputRef.current?.focus(), 100);
        } catch (err) {
            setError(err.message || 'Failed to send verification code. Please check the email.');
        } finally {
            setSendingOtp(false);
        }
    };

    /** Step 2: Complete registration with OTP verification */
    const handleVerifyAndRegister = async (event) => {
        event.preventDefault();
        setError('');
        setInfoMsg('');

        if (otp.trim().length !== OTP_LENGTH) {
            setError('Please enter the full 6-digit verification code.');
            return;
        }

        setSubmitting(true);
        try {
            const cleanEmail = form.email.trim().toLowerCase();
            await register({
                name: form.name.trim(),
                email: cleanEmail,
                phone: form.phone.trim(),
                password: form.password,
                role: 'Traveler',
                otp: otp.trim(),
            });

            // Equal round-robin partner / support assignment for new travelers
            autoAssignTraveler(cleanEmail, getSnapshot().users || []);

            success(
                'Email Verified & Account Created',
                'Your email has been verified and your Traveler account is now active! You can now sign in.',
                () => navigate('/login'),
            );
        } catch (err) {
            setError(err.message || 'Registration failed. Please check the verification code.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0 || sendingOtp) return;
        setSendingOtp(true);
        setError('');
        setInfoMsg('');
        try {
            const res = await authApi.sendRegistrationOtp({
                email: form.email.trim(),
                name: form.name.trim(),
                purpose: 'Traveler Registration',
            });
            setCountdown(60);
            if (res && res.devOtp) {
                setOtp(res.devOtp);
                setInfoMsg(`📧 SMTP not configured yet. Your verification code is ${res.devOtp}`);
            } else {
                setInfoMsg(`A fresh verification code has been sent to ${form.email.trim()}.`);
            }
        } catch (err) {
            setError(err.message || 'Failed to resend verification code.');
        } finally {
            setSendingOtp(false);
        }
    };

    return (
        <AuthLayout page="register" title={<>Join the Travel<br />Ecosystem</>} description="Register today to streamline travel coordination and gain powerful platform capabilities." features={FEATURES}>
            <div className="login-wrapper register-view">
                <div className="login-box">
                    <h2>{otpSent ? 'Verify Your Email' : 'Create Account'}</h2>
                    <p className="sub-text">
                        {otpSent
                            ? `Enter the 6-digit code sent to ${form.email.trim()}`
                            : 'Join Dream Destination platform as a Traveler'}
                    </p>

                    {error && <div className="auth-alert error-banner" role="alert">{error}</div>}
                    {infoMsg && <div className="auth-alert success-banner" role="status">{infoMsg}</div>}

                    {!otpSent ? (
                        <>
                            <span className="label-style">Account Type</span>
                            <div className="role-selector" style={{ marginBottom: 16 }}>
                                <button type="button" className="role-btn full-width active" style={{ cursor: 'default' }}>
                                    Traveler
                                </button>
                            </div>

                            <form id="registerForm" onSubmit={handleSendOtp}>
                                <label className="label-style" htmlFor="regName">Full Name</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <input id="regName" type="text" className="input-field" placeholder="N Bharath" value={form.name} onChange={update('name')} required />
                                </div>

                                <label className="label-style" htmlFor="regEmail">Email Address</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <input id="regEmail" type="email" className="input-field" placeholder="you@example.com" value={form.email} onChange={update('email')} required />
                                </div>

                                <label className="label-style" htmlFor="phoneNumber">Phone Number</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <input type="tel" id="phoneNumber" name="phone" className="input-field" placeholder="1234567890" value={form.phone} onChange={update('phone')} required maxLength={10} />
                                </div>

                                <label className="label-style" htmlFor="password">Password</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input type="password" id="password" className="input-field" placeholder="••••••••" value={form.password} onChange={update('password')} required minLength={3} />
                                </div>

                                <label className="label-style" htmlFor="confirmPassword">Confirm Password</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input type="password" id="confirmPassword" className="input-field" placeholder="••••••••" value={form.confirmPassword} onChange={update('confirmPassword')} required />
                                </div>

                                <button type="submit" className="btn-submit" disabled={sendingOtp}>
                                    {sendingOtp ? 'Sending Verification Code...' : 'Verify Email & Sign Up'}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Step 2: OTP Entry */
                        <form id="otpVerifyForm" onSubmit={handleVerifyAndRegister}>
                            <div style={{ padding: '12px 14px', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: 8, fontSize: 13, color: '#0369a1', marginBottom: 18 }}>
                                ✉️ We sent a 6-digit verification code to <strong>{form.email.trim()}</strong> to verify that this email belongs to you.
                            </div>

                            <label className="label-style" htmlFor="regOtpInput">Enter 6-Digit Verification Code</label>
                            <div className="input-group">
                                <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <input
                                    ref={otpInputRef}
                                    id="regOtpInput"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={OTP_LENGTH}
                                    className="input-field"
                                    placeholder="• • • • • •"
                                    value={otp}
                                    onChange={(e) => {
                                        setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH));
                                        setError('');
                                    }}
                                    style={{ letterSpacing: 6, fontSize: 22, fontWeight: 700, textAlign: 'center' }}
                                    required
                                    autoComplete="one-time-code"
                                />
                            </div>

                            <button type="submit" className="btn-submit" disabled={submitting || otp.length !== OTP_LENGTH}>
                                {submitting ? 'Verifying & Creating Account...' : 'Confirm Code & Complete Sign Up'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>
                                {countdown > 0 ? (
                                    <span style={{ color: '#64748b' }}>Resend code in <strong>{countdown}s</strong></span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        disabled={sendingOtp}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary,#0ea5e9)', fontWeight: 600, fontSize: 14, padding: 0 }}
                                    >
                                        {sendingOtp ? 'Sending...' : '🔄 Resend Verification Code'}
                                    </button>
                                )}
                            </div>

                            <div style={{ textAlign: 'center', marginTop: 12 }}>
                                <button
                                    type="button"
                                    onClick={() => { setOtpSent(false); setOtp(''); setError(''); setInfoMsg(''); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, padding: 0 }}
                                >
                                    ← Edit Details / Change Email
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="create-acc" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                        <div>Already have an account? <Link to="/login">Sign In</Link></div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                            Are you a Tour Guide or Vendor? <Link to="/become-partner" style={{ color: 'var(--primary, #0ea5e9)', fontWeight: 600 }}>Become a Business Partner</Link>
                        </div>
                    </div>
                </div>
                <p className="policy">By signing up, you agree to our Terms of Service and Privacy Policy</p>
            </div>
        </AuthLayout>
    );
}
