import { createContext, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { legacyTarget } from '../routes/paths';
import { canOperateSession } from '../services/workflow';

export const PortalContext = createContext({ role: '' });

/** Portal (role) of the page currently rendered. */
export function usePortal() {
    return useContext(PortalContext);
}

/**
 * Navigation helper that understands the original HTML targets
 * (e.g. "travelPartner_trips.html?trip=TRIP-2") as well as React paths.
 */
export function useGo() {
    const navigate = useNavigate();
    const { role } = usePortal();
    return useCallback((target) => {
        if (!target || target === '#') return;
        if (String(target).startsWith('/')) navigate(target);
        else navigate(legacyTarget(role, target));
    }, [navigate, role]);
}

/** Logout with the original "Confirm Logout" dialog. */
export function useLogout() {
    const { logout } = useAuth();
    const { confirm } = useUI();
    const navigate = useNavigate();
    return useCallback(async (event) => {
        if (event) event.preventDefault();
        const ok = await confirm({ title: 'Confirm Logout', message: 'Are you sure you want to log out?', confirmText: 'Logout', tone: 'green' });
        if (!ok) return;
        logout();
        navigate('/login', { replace: true });
    }, [confirm, logout, navigate]);
}

/**
 * Guards an operation for inactive accounts (canOperateSession in workflow.js)
 * and turns thrown errors into toasts.
 */
export function useOperation() {
    const { toast } = useUI();
    return useCallback(async (fn) => {
        if (!canOperateSession()) return undefined;
        try {
            return await fn();
        } catch (error) {
            toast(error.message || 'Something went wrong. Please try again.', 'error');
            return undefined;
        }
    }, [toast]);
}
