import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { vendorsApi } from '../../services/api';
import { STATUS, callApi, trackRequests } from '../thunkHelpers';
import { logout } from './authSlice';

/**
 * vendors slice  <->  back-end VendorsController (/vendors)
 *
 *   GET    /vendors       -> fetchVendors     (Read all)
 *   GET    /vendors/:id   -> fetchVendorById  (Read one)
 *   POST   /vendors       -> createVendor     (Create)
 *   PATCH  /vendors/:id   -> updateVendor     (Update)
 *   DELETE /vendors/:id   -> deleteVendor     (Delete)
 *
 * Records are stored normalized ({ ids, entities }) by createEntityAdapter.
 */

const vendorsAdapter = createEntityAdapter();

export const fetchVendors = createAsyncThunk(
    'vendors/fetchVendors',
    (_, thunkApi) => callApi(async () => {
        const list = await vendorsApi.list();
        return Array.isArray(list) ? list : [];
    }, thunkApi),
);

export const fetchVendorById = createAsyncThunk(
    'vendors/fetchVendorById',
    (id, thunkApi) => callApi(async () => vendorsApi.get(id), thunkApi),
);

export const createVendor = createAsyncThunk(
    'vendors/createVendor',
    (payload, thunkApi) => callApi(async () => vendorsApi.create(payload), thunkApi),
);

export const updateVendor = createAsyncThunk(
    'vendors/updateVendor',
    ({ id, changes }, thunkApi) => callApi(async () => vendorsApi.update(id, changes), thunkApi),
);

export const deleteVendor = createAsyncThunk(
    'vendors/deleteVendor',
    (id, thunkApi) => callApi(async () => {
        await vendorsApi.remove(id);
        return id;
    }, thunkApi),
);

const initialState = vendorsAdapter.getInitialState({
    status: STATUS.idle,
    error: null,
    lastFetched: null,
});

const vendorsSlice = createSlice({
    name: 'vendors',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchVendors.fulfilled, (state, action) => {
                vendorsAdapter.setAll(state, action.payload);
            })
            .addCase(fetchVendorById.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) vendorsAdapter.upsertOne(state, action.payload);
            })
            .addCase(createVendor.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) vendorsAdapter.addOne(state, action.payload);
            })
            .addCase(updateVendor.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) vendorsAdapter.upsertOne(state, action.payload);
            })
            .addCase(deleteVendor.fulfilled, (state, action) => {
                vendorsAdapter.removeOne(state, action.payload);
            })
            .addCase(logout, () => initialState);
        trackRequests(builder, [fetchVendors, fetchVendorById, createVendor, updateVendor, deleteVendor]);
    },
});

export const {
    selectAll: selectAllVendors,
    selectById: selectVendorById,
    selectIds: selectVendorIds,
    selectTotal: selectVendorCount,
} = vendorsAdapter.getSelectors((state) => state.vendors);
export const selectVendorsStatus = (state) => state.vendors.status;
export const selectVendorsError = (state) => state.vendors.error;

export default vendorsSlice.reducer;
