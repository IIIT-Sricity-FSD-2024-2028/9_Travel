import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { workflowApi } from '../../services/api';
import { STATUS, callApi, trackRequests } from '../thunkHelpers';
import { logout } from './authSlice';

/**
 * workflow slice  <->  back-end WorkflowController (/workflow)
 *
 *   GET  /workflow/state  -> fetchWorkflowState  (Read the shared coordination state)
 *   PUT  /workflow/state  -> saveWorkflowState   (Create / Update: replace the shared state)
 *   POST /workflow/reset  -> resetWorkflowState  (Delete: reset to the seed data, Super User only)
 *
 * The portals keep rendering from services/workflow/store.js (localStorage cache + sync);
 * this slice holds the last server snapshot and the sync status in the Redux store.
 */

export const fetchWorkflowState = createAsyncThunk(
    'workflow/fetchWorkflowState',
    (_, thunkApi) => callApi(() => workflowApi.getState(), thunkApi),
);

export const saveWorkflowState = createAsyncThunk(
    'workflow/saveWorkflowState',
    (nextState, thunkApi) => callApi(async () => (await workflowApi.putState(nextState)) || nextState, thunkApi),
);

export const resetWorkflowState = createAsyncThunk(
    'workflow/resetWorkflowState',
    (_, thunkApi) => callApi(() => workflowApi.reset(), thunkApi),
);

const initialState = {
    data: null,
    status: STATUS.idle,
    error: null,
    lastFetched: null,
};

const storeSnapshot = (state, action) => {
    if (action.payload && typeof action.payload === 'object') state.data = action.payload;
};

const workflowSlice = createSlice({
    name: 'workflow',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchWorkflowState.fulfilled, storeSnapshot)
            .addCase(saveWorkflowState.fulfilled, storeSnapshot)
            .addCase(resetWorkflowState.fulfilled, storeSnapshot)
            .addCase(logout, () => initialState);
        trackRequests(builder, [fetchWorkflowState, saveWorkflowState, resetWorkflowState]);
    },
});

export const selectWorkflowData = (state) => state.workflow.data;
export const selectWorkflowStatus = (state) => state.workflow.status;
export const selectWorkflowError = (state) => state.workflow.error;

export default workflowSlice.reducer;
