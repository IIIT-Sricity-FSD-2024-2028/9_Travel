import { useCallback, useEffect, useState } from 'react';
import { useWorkflowRefresh, useWorkflowState } from '../context/WorkflowContext';
import { usersApi } from '../services/api';

const stripPassword = ({ password, ...rest }) => rest; // eslint-disable-line no-unused-vars

/**
 * Users from GET /users (CRUD.renderUsers). Falls back to the users of the cached workflow
 * state when the API is unreachable, and reports the error so the page can show it.
 */
export function useBackendUsers() {
    const state = useWorkflowState();
    const refreshWorkflow = useWorkflowRefresh();
    const [users, setUsers] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const list = await usersApi.list();
            setUsers((Array.isArray(list) ? list : []).map(stripPassword));
            setError('');
        } catch (err) {
            setError(err.message || 'Error connecting to database');
            setUsers(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    /** Reload users and the workflow state after a create / update / delete. */
    const reloadAll = useCallback(async () => {
        await Promise.all([reload(), Promise.resolve(refreshWorkflow()).catch(() => {})]);
    }, [reload, refreshWorkflow]);

    return { users: users || state.users || [], loading, error, reload, reloadAll, fromCache: !users };
}
