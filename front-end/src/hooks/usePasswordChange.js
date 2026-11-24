import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { authApi } from '../services/api';
import { updateUser } from '../store/slices/usersSlice';
import { canOperateSession } from '../services/workflow';

/**
 * Password change through the existing backend endpoints:
 *  1. POST /auth/login   – verifies the current password
 *  2. PATCH /users/:id   – stores the new password (UpdateUserDto.password)
 * Returns true when the password was changed.
 */
export function usePasswordChange() {
    const dispatch = useDispatch();
    const { session } = useAuth();
    const { toast } = useUI();
    const [saving, setSaving] = useState(false);

    const change = useCallback(async (current, next) => {
        if (!current && !next) return false;
        if (!current || !next) {
            toast('Enter both your current password and a new password.', 'warning');
            return false;
        }
        if (next.length < 6) {
            toast('The new password must be at least 6 characters long.', 'warning');
            return false;
        }
        if (current === next) {
            toast('The new password must be different from the current password.', 'warning');
            return false;
        }
        if (!canOperateSession()) return false;
        setSaving(true);
        try {
            try {
                await authApi.login({ email: session.email, password: current });
            } catch (error) {
                toast(error.status === 401 ? 'Current password is incorrect.' : error.message, 'error');
                return false;
            }
            await dispatch(updateUser({ id: session.id || session.email, changes: { password: next } })).unwrap();
            toast('Password updated successfully.', 'success');
            return true;
        } catch (error) {
            toast(`Password update failed: ${error.message}`, 'error');
            return false;
        } finally {
            setSaving(false);
        }
    }, [dispatch, session.email, session.id, toast]);

    return { change, saving };
}
