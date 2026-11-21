import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { guidesApi } from '../../services/api';
import { STATUS, callApi, trackRequests } from '../thunkHelpers';
import { logout } from './authSlice';

/**
 * guides slice  <->  back-end GuidesController (/guides)
 *
 *   GET    /guides       -> fetchGuides     (Read all)
 *   GET    /guides/:id   -> fetchGuideById  (Read one)
 *   POST   /guides       -> createGuide     (Create)
 *   PATCH  /guides/:id   -> updateGuide     (Update)
 *   DELETE /guides/:id   -> deleteGuide     (Delete)
 *
 * Records are stored normalized ({ ids, entities }) by createEntityAdapter.
 */

const guidesAdapter = createEntityAdapter();

export const fetchGuides = createAsyncThunk(
    'guides/fetchGuides',
    (_, thunkApi) => callApi(async () => {
        const list = await guidesApi.list();
        return Array.isArray(list) ? list : [];
    }, thunkApi),
);

export const fetchGuideById = createAsyncThunk(
    'guides/fetchGuideById',
    (id, thunkApi) => callApi(async () => guidesApi.get(id), thunkApi),
);

export const createGuide = createAsyncThunk(
    'guides/createGuide',
    (payload, thunkApi) => callApi(async () => guidesApi.create(payload), thunkApi),
);

export const updateGuide = createAsyncThunk(
    'guides/updateGuide',
    ({ id, changes }, thunkApi) => callApi(async () => guidesApi.update(id, changes), thunkApi),
);

export const deleteGuide = createAsyncThunk(
    'guides/deleteGuide',
    (id, thunkApi) => callApi(async () => {
        await guidesApi.remove(id);
        return id;
    }, thunkApi),
);

const initialState = guidesAdapter.getInitialState({
    status: STATUS.idle,
    error: null,
    lastFetched: null,
});

const guidesSlice = createSlice({
    name: 'guides',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchGuides.fulfilled, (state, action) => {
                guidesAdapter.setAll(state, action.payload);
            })
            .addCase(fetchGuideById.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) guidesAdapter.upsertOne(state, action.payload);
            })
            .addCase(createGuide.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) guidesAdapter.addOne(state, action.payload);
            })
            .addCase(updateGuide.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) guidesAdapter.upsertOne(state, action.payload);
            })
            .addCase(deleteGuide.fulfilled, (state, action) => {
                guidesAdapter.removeOne(state, action.payload);
            })
            .addCase(logout, () => initialState);
        trackRequests(builder, [fetchGuides, fetchGuideById, createGuide, updateGuide, deleteGuide]);
    },
});

export const {
    selectAll: selectAllGuides,
    selectById: selectGuideById,
    selectIds: selectGuideIds,
    selectTotal: selectGuideCount,
} = guidesAdapter.getSelectors((state) => state.guides);
export const selectGuidesStatus = (state) => state.guides.status;
export const selectGuidesError = (state) => state.guides.error;

export default guidesSlice.reducer;
