import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi, usersApi } from '../services/api';
import {
    SESSION_KEY, clearStoredSession, isValidSession, normRole, readStoredSession, writeStoredSession,
} from '../services/session';
import { ensureStateOwner, resetSnapshot } from '../services/workflow';

const AuthContext = createContext(null);

/** Landing route of every portal (ROLE_HOME in auth_guard.js). */
export const ROLE_HOME = {
    traveler: '/traveler/dashboard',
    partner: '/travel-partner/dashboard',
    guide: '/guide/dashboard',
    vendor: '/vendor/dashboard',
    superuser: '/superuser/dashboard',
    support: '/support/dashboard',
};

export function AuthProvider({ children }) {
    const [session, setSessionState] = useState(() => readStoredSession());
    const [accountStatus, setAccountStatus] = useState(() => readStoredSession().status || 'Active');
    const [suspendedMessage, setSuspendedMessage] = useState('');
    const sessionRef = useRef(session);
    sessionRef.current = session;

    const role = normRole(session.role);
    const isAuthenticated = isValidSession(session);

    const setSession = useCallback((next) => {
        if (next && next.email) {
            writeStoredSession(next);
            setSessionState(next);
        } else {
            clearStoredSession();
            setSessionState({});
        }
    }, []);

    /** POST /auth/login – returns the session payload (the page decides about Inactive accounts). */
    const login = useCallback(async ({ email, password, role: selectedRole }) => {
        const data = await authApi.login({ email, password, role: selectedRole });
        if (!data || !data.role) throw new Error('Invalid response from server. Please try again.');
        return data;
    }, []);

    /** Persists the session returned by /auth/login and prepares the workflow cache. */
    const completeLogin = useCallback((data) => {
        const next = { ...data, loginTime: Date.now() };
        ensureStateOwner(next.email);
        resetSnapshot();
        setAccountStatus(next.status || 'Active');
        setSession(next);
        return next;
    }, [setSession]);

    const register = useCallback((payload) => authApi.register(payload), []);

    /** Clears the session but keeps the workflow cache (same as the original logout). */
    const logout = useCallback(() => {
        setSession(null);
        setAccountStatus('Active');
        resetSnapshot();
    }, [setSession]);

    const updateSession = useCallback((partial) => {
        const next = { ...sessionRef.current, ...partial };
        setSession(next);
        return next;
    }, [setSession]);

    // Keep tabs in sync (dd_session written by another tab).
    useEffect(() => {
        const onStorage = (event) => {
            if (event.key === SESSION_KEY) setSessionState(readStoredSession());
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // The API client broadcasts when the backend reports the account as suspended.
    useEffect(() => {
        const onSuspended = (event) => {
            if (!isValidSession(sessionRef.current)) return;
            setSuspendedMessage(event.detail?.message || 'Your account has been suspended by the Super Admin.');
        };
        window.addEventListener('dd:account-suspended', onSuspended);
        return () => window.removeEventListener('dd:account-suspended', onSuspended);
    }, []);

    // Account status polling (auth_guard.js doStatusCheck): first check after 5s, then every 5 minutes.
    // Uses the user's own role/email headers – the backend answers 403 for suspended accounts.
    useEffect(() => {
        if (!isAuthenticated) return undefined;
        let cancelled = false;
        const check = async () => {
            const current = sessionRef.current;
            if (!current.email) return;
            try {
                const user = await usersApi.get(current.email);
                if (cancelled || !user) return;
                if (user.status === 'Suspended' && normRole(current.role) !== 'superuser') {
                    setSuspendedMessage('Your account has been suspended by the Super Admin. You will be logged out.');
                } else {
                    setAccountStatus(user.status || 'Active');
                    if ((user.status || 'Active') !== (current.status || 'Active')) {
                        writeStoredSession({ ...current, status: user.status });
                        setSessionState((prev) => ({ ...prev, status: user.status }));
                    }
                }
            } catch {
                // Network problems must not disrupt the UI; suspension is reported via the interceptor.
            }
        };
        const first = setTimeout(check, 5000);
        const interval = setInterval(check, 300000);
        return () => {
            cancelled = true;
            clearTimeout(first);
            clearInterval(interval);
        };
    }, [isAuthenticated, session.email]);

    const value = useMemo(() => ({
        session,
        role,
        isAuthenticated,
        accountStatus,
        isInactive: accountStatus === 'Inactive' || session.status === 'Inactive',
        suspendedMessage,
        clearSuspended: () => setSuspendedMessage(''),
        login,
        completeLogin,
        register,
        logout,
        updateSession,
    }), [session, role, isAuthenticated, accountStatus, suspendedMessage, login, completeLogin, register, logout, updateSession]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
