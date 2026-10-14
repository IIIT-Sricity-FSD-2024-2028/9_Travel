import { useCallback, useEffect, useState } from 'react';
import { useWorkflowRefresh, useWorkflowState } from '../context/WorkflowContext';
import { tripsApi } from '../services/api';
import { normalizeTrip } from '../services/workflow';

/**
 * Trips for the Super Admin pages (CRUD.renderTrips): GET /trips merged with the trips of the
 * live workflow state (the state version wins because it carries the normalized schedule).
 */
export function useBackendTrips() {
    const state = useWorkflowState();
    const refreshWorkflow = useWorkflowRefresh();
    const [apiTrips, setApiTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const list = await tripsApi.list();
            setApiTrips(Array.isArray(list) ? list : []);
            setError('');
        } catch (err) {
            setError(err.message || 'Could not load trips');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    const reloadAll = useCallback(async () => {
        await Promise.all([reload(), Promise.resolve(refreshWorkflow({ ignoreRecentWrites: true })).catch(() => {})]);
    }, [reload, refreshWorkflow]);

    const byId = new Map((state.trips || []).map((t) => [t.id, t]));
    apiTrips.forEach((t) => { if (t && t.id && !byId.has(t.id)) byId.set(t.id, normalizeTrip(t)); });

    return { trips: Array.from(byId.values()), loading, error, reload, reloadAll };
}
