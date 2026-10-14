import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { UIProvider, useUI } from './context/UIContext';
import { WorkflowProvider } from './context/WorkflowContext';
import AppRoutes from './routes/AppRoutes';

/**
 * auth_guard.js behaviour: when the backend reports the account as suspended
 * (403 from RolesGuard or the status poll), inform the user, end the session
 * and return to the login page.
 */
function SessionWatcher() {
    const { suspendedMessage, clearSuspended, logout } = useAuth();
    const { toast } = useUI();
    const navigate = useNavigate();

    useEffect(() => {
        if (!suspendedMessage) return;
        toast(suspendedMessage, 'error', 6000);
        clearSuspended();
        logout();
        navigate('/login', { replace: true });
    }, [suspendedMessage, clearSuspended, logout, navigate, toast]);

    return null;
}

function ThemedApp() {
    const { toast } = useUI();
    const onThemeNotice = useCallback((message) => toast(message, 'info'), [toast]);
    return (
        <ThemeProvider onToggleNotice={onThemeNotice}>
            <AuthProvider>
                <WorkflowProvider>
                    <SessionWatcher />
                    <AppRoutes />
                </WorkflowProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default function App() {
    return (
        <UIProvider>
            <ThemedApp />
        </UIProvider>
    );
}
