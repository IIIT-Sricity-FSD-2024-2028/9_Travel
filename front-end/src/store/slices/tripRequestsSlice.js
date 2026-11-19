import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { tripRequestsApi } from '../../services/api';
import { STATUS, callApi, trackRequests } from '../thunkHelpers';
import { logout } from './authSlice';

/**
 * tripRequests slice  <->  back-end TripRequestsController (/trip-requests)
 *
 *   GET    /trip-requests             -> fetchTripRequests   (Read all pending requests)
 *   POST   /trip-requests             -> createTripRequest   (Create: traveler books a package)
 *   POST   /trip-requests/:id/accept  -> acceptTripRequest   (Update: partner accepts the request)
 *   DELETE /trip-requests/:id         -> cancelTripRequest   (Delete: cancel the request)
 *
 * Records are stored normalized ({ ids, entities }) by createEntityAdapter.
 */

const tripRequestsAdapter = createEntityAdapter();

export const fetchTripRequests = createAsyncThunk(
    'tripRequests/fetchTripRequests',
    (_, thunkApi) => callApi(async () => {
        const list = await tripRequestsApi.list();
        return Array.isArray(list) ? list : [];
    }, thunkApi),
);

export const createTripRequest = createAsyncThunk(
    'tripRequests/createTripRequest',
    (payload, thunkApi) => callApi(() => tripRequestsApi.create(payload), thunkApi),
);

export const acceptTripRequest = createAsyncThunk(
    'tripRequests/acceptTripRequest',
    (id, thunkApi) => callApi(async () => ({ id, trip: await tripRequestsApi.accept(id) }), thunkApi),
);

export const cancelTripRequest = createAsyncThunk(
    'tripRequests/cancelTripRequest',
    (id, thunkApi) => callApi(async () => {
        await tripRequestsApi.cancel(id);
        return id;
    }, thunkApi),
);

const initialState = tripRequestsAdapter.getInitialState({
    status: STATUS.idle,
    error: null,
    lastFetched: null,
});

const tripRequestsSlice = createSlice({
    name: 'tripRequests',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchTripRequests.fulfilled, (state, action) => {
                tripRequestsAdapter.setAll(state, action.payload);
            })
            .addCase(createTripRequest.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) tripRequestsAdapter.addOne(state, action.payload);
            })
            .addCase(acceptTripRequest.fulfilled, (state, action) => {
                // An accepted request becomes a planned trip and leaves the pending list.
                tripRequestsAdapter.removeOne(state, action.payload.id);
            })
            .addCase(cancelTripRequest.fulfilled, (state, action) => {
                tripRequestsAdapter.removeOne(state, action.payload);
            })
            .addCase(logout, () => initialState);
        trackRequests(builder, [fetchTripRequests, createTripRequest, acceptTripRequest, cancelTripRequest]);
    },
});

export const {
    selectAll: selectAllTripRequests,
    selectById: selectTripRequestById,
    selectIds: selectTripRequestIds,
    selectTotal: selectTripRequestCount,
} = tripRequestsAdapter.getSelectors((state) => state.tripRequests);
export const selectTripRequestsStatus = (state) => state.tripRequests.status;
export const selectTripRequestsError = (state) => state.tripRequests.error;

export default tripRequestsSlice.reducer;
