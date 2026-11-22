import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useWorkflowRefresh, useWorkflowState } from '../context/WorkflowContext';
import { normalizeTrip } from '../services/workflow';
import {
    fetchTrips, selectAllTrips, selectTripsError, selectTripsStatus,
} from '../store/slices/tripsSlice';

/**
 * Trips for the Super Admin pages: the Redux `trips` slice (fetchTrips thunk -> GET /trips)
 * merged with the trips of the live workflow state (the state version wins because it
 * carries the normalized schedule).
 */
export function useBackendTrips() {
    const dispatch = useDispatch();
    const state = useWorkflowState();
    const refreshWorkflow = useWorkflowRefresh();
    const apiTrips = useSelector(selectAllTrips);
    const status = useSelector(selectTripsStatus);
    const error = useSelector(selectTripsError);

    const reload = useCallback(() => dispatch(fetchTrips()), [dispatch]);

    useEffect(() => { reload(); }, [reload]);

    const reloadAll = useCallback(async () => {
        await Promise.all([reload(), Promise.resolve(refreshWorkflow({ ignoreRecentWrites: true })).catch(() => {})]);
    }, [reload, refreshWorkflow]);

    const byId = new Map((state.trips || []).map((t) => [t.id, t]));
    // Store records are frozen by Redux; normalizeTrip fills in nested data, so give it a copy.
    apiTrips.forEach((t) => { if (t && t.id && !byId.has(t.id)) byId.set(t.id, normalizeTrip(structuredClone(t))); });

    return {
        trips: Array.from(byId.values()),
        loading: status === 'idle' || status === 'loading',
        error: status === 'failed' ? (error || 'Could not load trips') : '',
        reload,
        reloadAll,
    };
}
