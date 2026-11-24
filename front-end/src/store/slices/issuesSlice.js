import { createAsyncThunk, createEntityAdapter, createSelector, createSlice } from '@reduxjs/toolkit';
import { issuesApi } from '../../services/api';
import { STATUS, callApi, trackRequests } from '../thunkHelpers';
import { logout } from './authSlice';

/**
 * issues slice  <->  back-end IssuesController (/issues)
 *
 *   GET    /issues              -> fetchIssues     (Read all)
 *   GET    /issues/:id          -> fetchIssueById  (Read one)
 *   POST   /issues              -> createIssue     (Create: report an issue)
 *   PATCH  /issues/:id          -> updateIssue     (Update)
 *   POST   /issues/:id/resolve  -> resolveIssue    (Update: mark as resolved)
 *   DELETE /issues/:id          -> deleteIssue     (Delete)
 *
 * Records are stored normalized ({ ids, entities }) by createEntityAdapter.
 */

const issuesAdapter = createEntityAdapter();

export const fetchIssues = createAsyncThunk(
    'issues/fetchIssues',
    (_, thunkApi) => callApi(async () => {
        const list = await issuesApi.list();
        return Array.isArray(list) ? list : [];
    }, thunkApi),
);

export const fetchIssueById = createAsyncThunk(
    'issues/fetchIssueById',
    (id, thunkApi) => callApi(() => issuesApi.get(id), thunkApi),
);

export const createIssue = createAsyncThunk(
    'issues/createIssue',
    (payload, thunkApi) => callApi(() => issuesApi.create(payload), thunkApi),
);

export const updateIssue = createAsyncThunk(
    'issues/updateIssue',
    ({ id, changes }, thunkApi) => callApi(() => issuesApi.update(id, changes), thunkApi),
);

export const resolveIssue = createAsyncThunk(
    'issues/resolveIssue',
    ({ id, resolution }, thunkApi) => callApi(() => issuesApi.resolve(id, { resolution }), thunkApi),
);

export const deleteIssue = createAsyncThunk(
    'issues/deleteIssue',
    (id, thunkApi) => callApi(async () => {
        await issuesApi.remove(id);
        return id;
    }, thunkApi),
);

const initialState = issuesAdapter.getInitialState({
    status: STATUS.idle,
    error: null,
    lastFetched: null,
});

const upsertIssue = (state, action) => {
    if (action.payload && action.payload.id) issuesAdapter.upsertOne(state, action.payload);
};

const issuesSlice = createSlice({
    name: 'issues',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchIssues.fulfilled, (state, action) => {
                issuesAdapter.setAll(state, action.payload);
            })
            .addCase(fetchIssueById.fulfilled, upsertIssue)
            .addCase(createIssue.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) issuesAdapter.addOne(state, action.payload);
            })
            .addCase(updateIssue.fulfilled, upsertIssue)
            .addCase(resolveIssue.fulfilled, upsertIssue)
            .addCase(deleteIssue.fulfilled, (state, action) => {
                issuesAdapter.removeOne(state, action.payload);
            })
            .addCase(logout, () => initialState);
        trackRequests(builder, [fetchIssues, fetchIssueById, createIssue, updateIssue, resolveIssue, deleteIssue]);
    },
});

export const {
    selectAll: selectAllIssues,
    selectById: selectIssueById,
    selectIds: selectIssueIds,
    selectTotal: selectIssueCount,
} = issuesAdapter.getSelectors((state) => state.issues);
export const selectOpenIssues = createSelector(
    [selectAllIssues],
    (issues) => issues.filter((issue) => issue.status !== 'Resolved'),
);
/** All issues sorted newest first (memoized, recomputed only when the issues change). */
export const selectIssuesNewestFirst = createSelector(
    [selectAllIssues],
    (issues) => issues.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
);
export const selectIssuesStatus = (state) => state.issues.status;
export const selectIssuesError = (state) => state.issues.error;

export default issuesSlice.reducer;
