import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { useUI } from '../context/UIContext';
import { authApi } from '../services/api';

const PARTNER_ROLES = [
    { role: 'Tour Guide', label: 'Tour Guide' },
    { role: 'Vendor', label: 'Vendor' },
];

const FEATURES = [
    { title: 'Trusted Partner Network', text: 'Deliver memorable experiences and grow your travel business' },
    { title: 'Direct Super User Review', text: 'Verified partner accounts with comprehensive coordination tools' },
];

const OTP_LENGTH = 6;

export default function BecomePartner() {
    const { success } = useUI();
    const navigate = useNavigate();

    const [requestedRole, setRequestedRole] = useState('Tour Guide');
    const [form, setForm] = useState({
        applicantName: '',
        businessName: '',
        email: '',
        phone: '',
        address: '',
        businessDetails: '',
        verificationInfo: '',
        password: '',
        confirmPassword: '',
    });

    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState('');
    const [infoMsg, setInfoMsg] = useState('');
    const [sendingOtp, setSendingOtp] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [countdown, setCountdown] = useState(60);

    const otpInputRef = useRef(null);

    // Countdown for resend OTP
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

    /** Step 1: Send verification code to email before application submission */
    const handleSendOtp = async (event) => {
        event.preventDefault();
        setError('');
        setInfoMsg('');

        if (!form.applicantName.trim()) {
            setError('Please enter your full name.');
            return;
        }
        if (!form.businessName.trim()) {
            setError('Please enter your business or agency name.');
            return;
        }
        if (!form.email.trim()) {
            setError('Please enter your official email address.');
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
                name: form.applicantName.trim(),
                purpose: `${requestedRole} Application`,
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
            setError(err.message || 'Failed to send verification code. Please check your email.');
        } finally {
            setSendingOtp(false);
        }
    };

    /** Step 2: Verify OTP and submit partner application */
    const handleVerifyAndSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setInfoMsg('');

        if (otp.trim().length !== OTP_LENGTH) {
            setError('Please enter the full 6-digit verification code.');
            return;
        }

        setSubmitting(true);
        try {
            await authApi.applyPartner({
                applicantName: form.applicantName.trim(),
                businessName: form.businessName.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim(),
                address: form.address.trim(),
                businessDetails: form.businessDetails.trim(),
                verificationInfo: form.verificationInfo.trim(),
                requestedRole,
                password: form.password,
                otp: otp.trim(),
            });

            success(
                'Application Submitted',
                'Your business partner application has been verified and submitted with status PENDING. Our Super User will review and approve your account before you can log in.',
                () => navigate('/login'),
            );
        } catch (err) {
            setError(err.message || 'Application submission failed. Please check the verification code.');
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
                name: form.applicantName.trim(),
                purpose: `${requestedRole} Application`,
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
        <AuthLayout
            page="register"
            title={<>Partner with<br />Dream Destination</>}
            description="Apply as an external business partner. Your application will be reviewed and verified by our platform administrators."
            features={FEATURES}
        >
            <div className="login-wrapper register-view">
                <div className="login-box" style={{ maxWidth: 520 }}>
                    <h2>{otpSent ? 'Verify Business Email' : 'Become a Business Partner'}</h2>
                    <p className="sub-text">
                        {otpSent
                            ? `Enter the 6-digit code sent to ${form.email.trim()}`
                            : 'Submit your application as a Guide or Vendor'}
                    </p>

                    {error && <div className="auth-alert error-banner" role="alert">{error}</div>}
                    {infoMsg && <div className="auth-alert success-banner" role="status">{infoMsg}</div>}

                    {!otpSent ? (
                        <>
                            <div style={{ padding: '10px 14px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, fontSize: 13, color: '#b45309', marginBottom: 16 }}>
                                ⏳ <strong>Verification Required:</strong> Partner applications start in <strong>PENDING</strong> status and must be approved by the Super User before you can log in.
                            </div>

                            <span className="label-style">Select Partner Type</span>
                            <div className="role-selector" style={{ marginBottom: 18 }}>
                                {PARTNER_ROLES.map((item) => (
                                    <button
                                        key={item.role}
                                        type="button"
                                        className={`role-btn${requestedRole === item.role ? ' active' : ''}`}
                                        onClick={() => setRequestedRole(item.role)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            <form id="partnerApplicationForm" onSubmit={handleSendOtp}>
                                <label className="label-style" htmlFor="partApplicantName">Applicant / Contact Person Name</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <input
                                        id="partApplicantName"
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g. Alex Morgan"
                                        value={form.applicantName}
                                        onChange={update('applicantName')}
                                        required
                                    />
                                </div>

                                <label className="label-style" htmlFor="partBusinessName">Business / Agency Name</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <input
                                        id="partBusinessName"
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g. Highland Trekking Co."
                                        value={form.businessName}
                                        onChange={update('businessName')}
                                        required
                                    />
                                </div>

                                <label className="label-style" htmlFor="partEmail">Official Email Address</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <input
                                        id="partEmail"
                                        type="email"
                                        className="input-field"
                                        placeholder="partner@example.com"
                                        value={form.email}
                                        onChange={update('email')}
                                        required
                                    />
                                </div>

                                <label className="label-style" htmlFor="partPhone">Phone Number</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <input
                                        type="tel"
                                        id="partPhone"
                                        className="input-field"
                                        placeholder="10-digit mobile number"
                                        value={form.phone}
                                        onChange={update('phone')}
                                        required
                                        maxLength={10}
                                    />
                                </div>

                                <label className="label-style" htmlFor="partAddress">Location / Operating Address</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <input
                                        id="partAddress"
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g. Paris, France or North Goa"
                                        value={form.address}
                                        onChange={update('address')}
                                        required
                                    />
                                </div>

                                <label className="label-style" htmlFor="partBusinessDetails">Business &amp; Services Details</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <input
                                        id="partBusinessDetails"
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g. Mountain guide with 8 years experience / Hotel and transport services"
                                        value={form.businessDetails}
                                        onChange={update('businessDetails')}
                                        required
                                    />
                                </div>

                                <label className="label-style" htmlFor="partVerificationInfo">Verification Info / License #</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <input
                                        id="partVerificationInfo"
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g. Govt Guide License #GL-9281 or Business Tax ID"
                                        value={form.verificationInfo}
                                        onChange={update('verificationInfo')}
                                        required
                                    />
                                </div>

                                <label className="label-style" htmlFor="partPassword">Account Password</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input
                                        type="password"
                                        id="partPassword"
                                        className="input-field"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={update('password')}
                                        required
                                        minLength={3}
                                    />
                                </div>

                                <label className="label-style" htmlFor="partConfirmPassword">Confirm Password</label>
                                <div className="input-group">
                                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input
                                        type="password"
                                        id="partConfirmPassword"
                                        className="input-field"
                                        placeholder="••••••••"
                                        value={form.confirmPassword}
                                        onChange={update('confirmPassword')}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn-submit" disabled={sendingOtp}>
                                    {sendingOtp ? 'Sending Verification Code...' : 'Verify Email & Submit Application'}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Step 2: Verification Code Input */
                        <form id="partnerOtpForm" onSubmit={handleVerifyAndSubmit}>
                            <div style={{ padding: '12px 14px', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: 8, fontSize: 13, color: '#0369a1', marginBottom: 18 }}>
                                ✉️ We sent a 6-digit verification code to <strong>{form.email.trim()}</strong> to verify that this official business email exists and belongs to you.
                            </div>

                            <label className="label-style" htmlFor="partOtpInput">Enter 6-Digit Verification Code</label>
                            <div className="input-group">
                                <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <input
                                    ref={otpInputRef}
                                    id="partOtpInput"
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
                                {submitting ? 'Verifying & Submitting...' : 'Confirm Code & Submit Application'}
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
                        <div>
                            Already registered or approved? <Link to="/login">Sign In</Link>
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                            Normal traveler? <Link to="/register" style={{ color: 'var(--primary, #0ea5e9)', fontWeight: 600 }}>Sign Up as Traveler</Link>
                        </div>
                    </div>
                </div>
                <p className="policy">By applying, you agree to our Partner Code of Conduct and Verification Policy</p>
            </div>
        </AuthLayout>
    );
}
