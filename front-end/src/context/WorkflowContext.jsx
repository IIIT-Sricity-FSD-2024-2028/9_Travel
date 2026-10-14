import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import {
    STORE_KEY, configureWorkflow, getSnapshot, getSyncStatus, hydrateStateFromBackend, reloadFromStorage, subscribe,
} from '../services/workflow';

const WorkflowContext = createContext(null);

/**
 * Wires the workflow store into React:
 *  - toasts for store notices and failed backend syncs
 *  - hydration from GET /workflow/state on sign-in, on every page change and every 5 minutes
 *  - cross-tab updates through the storage event
 */
export function WorkflowProvider({ children }) {
    const { isAuthenticated, session } = useAuth();
    const { toast } = useUI();
    const location = useLocation();

    useEffect(() => {
        configureWorkflow({
            notify: (message, type) => toast(message, type || 'success'),
            onPersistError: (error) => toast(`Changes are saved on this device but could not be synced with the server: ${error.message}`, 'error', 5000),
        });
    }, [toast]);

    const refresh = useCallback((options = {}) => hydrateStateFromBackend({ force: true, ...options }), []);

    // Initial hydration after sign-in and a refresh on each page navigation
    // (the original app re-hydrated on every page load).
    useEffect(() => {
        if (!isAuthenticated) return;
        hydrateStateFromBackend({ force: true });
    }, [isAuthenticated, session.email, location.pathname]);

    useEffect(() => {
        if (!isAuthenticated) return undefined;
        const interval = setInterval(() => {
            const active = document.activeElement;
            const typing = active && ['input', 'textarea', 'select'].includes((active.tagName || '').toLowerCase());
            if (!typing) hydrateStateFromBackend({ force: true });
        }, 300000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    useEffect(() => {
        const onStorage = (event) => {
            if (event.key === STORE_KEY) reloadFromStorage();
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const value = useMemo(() => ({ refresh }), [refresh]);
    return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

/** Current (normalised, read-only) workflow state – re-renders on every change. */
export function useWorkflowState() {
    return useSyncExternalStore(subscribe, getSnapshot);
}

/** { hydrated, hydrating, lastError, lastSyncedAt } */
export function useSyncStatus() {
    return useSyncExternalStore(subscribe, getSyncStatus);
}

export function useWorkflowRefresh() {
    const ctx = useContext(WorkflowContext);
    return ctx ? ctx.refresh : () => hydrateStateFromBackend({ force: true });
}
