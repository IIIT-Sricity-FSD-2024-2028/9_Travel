import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROLE_HOME, useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { PORTAL_LABELS } from '../services/session';

/** Requires a signed-in session (auth_guard.js: no session → login page). */
export function ProtectedRoute() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    }
    return <Outlet />;
}

/**
 * Requires the signed-in role to match the portal (auth_guard.js: wrong portal →
 * redirect to the user's own portal with an "Access denied" notice).
 */
export function RoleProtectedRoute({ role }) {
    const { role: userRole, isAuthenticated } = useAuth();
    const { toast } = useUI();
    const allowed = isAuthenticated && userRole === role;
    const warned = useRef(false);

    useEffect(() => {
        if (isAuthenticated && !allowed && !warned.current && ROLE_HOME[userRole]) {
            warned.current = true;
            toast(`Access denied. You are signed in as ${PORTAL_LABELS[userRole] || userRole}. Redirected to your portal.`, 'warning');
        }
    }, [isAuthenticated, allowed, userRole, toast]);

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!allowed) return <Navigate to={ROLE_HOME[userRole] || '/login'} replace />;
    return <Outlet />;
}
