import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { tripsApi } from '../../services/api';
import { STATUS, callApi, trackRequests } from '../thunkHelpers';
import { logout } from './authSlice';

/**
 * trips slice  <->  back-end TripsController (/trips)
 *
 *   GET    /trips               -> fetchTrips         (Read all)
 *   GET    /trips/:id           -> fetchTripById      (Read one)
 *   GET    /trips/:id/schedule  -> fetchTripSchedule  (Read the day-by-day schedule)
 *   GET    /trips/:id/updates   -> fetchTripUpdates   (Read guide / vendor updates)
 *   POST   /trips               -> createTrip         (Create)
 *   PATCH  /trips/:id           -> updateTrip         (Update)
 *   DELETE /trips/:id           -> deleteTrip         (Delete)
 *
 * Records are stored normalized ({ ids, entities }) by createEntityAdapter.
 */

const tripsAdapter = createEntityAdapter();

export const fetchTrips = createAsyncThunk(
    'trips/fetchTrips',
    (_, thunkApi) => callApi(async () => {
        const list = await tripsApi.list();
        return Array.isArray(list) ? list : [];
    }, thunkApi),
);

export const fetchTripById = createAsyncThunk(
    'trips/fetchTripById',
    (id, thunkApi) => callApi(() => tripsApi.get(id), thunkApi),
);

export const fetchTripSchedule = createAsyncThunk(
    'trips/fetchTripSchedule',
    (id, thunkApi) => callApi(async () => ({ id, schedule: await tripsApi.schedule(id) }), thunkApi),
);

export const fetchTripUpdates = createAsyncThunk(
    'trips/fetchTripUpdates',
    (id, thunkApi) => callApi(async () => ({ id, updates: await tripsApi.updates(id) }), thunkApi),
);

export const createTrip = createAsyncThunk(
    'trips/createTrip',
    (payload, thunkApi) => callApi(() => tripsApi.create(payload), thunkApi),
);

export const updateTrip = createAsyncThunk(
    'trips/updateTrip',
    ({ id, changes }, thunkApi) => callApi(() => tripsApi.update(id, changes), thunkApi),
);

export const deleteTrip = createAsyncThunk(
    'trips/deleteTrip',
    (id, thunkApi) => callApi(async () => {
        await tripsApi.remove(id);
        return id;
    }, thunkApi),
);

const initialState = tripsAdapter.getInitialState({
    status: STATUS.idle,
    error: null,
    lastFetched: null,
});

const tripsSlice = createSlice({
    name: 'trips',
    initialState,
    reducers: {
        /** Removes a trip that only existed locally (e.g. a 404 from DELETE /trips/:id). */
        tripRemovedLocally(state, action) {
            tripsAdapter.removeOne(state, action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTrips.fulfilled, (state, action) => {
                tripsAdapter.setAll(state, action.payload);
            })
            .addCase(fetchTripById.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) tripsAdapter.upsertOne(state, action.payload);
            })
            .addCase(fetchTripSchedule.fulfilled, (state, action) => {
                const { id, schedule } = action.payload;
                if (state.entities[id]) state.entities[id].schedule = Array.isArray(schedule) ? schedule : [];
            })
            .addCase(fetchTripUpdates.fulfilled, (state, action) => {
                const { id, updates } = action.payload;
                if (state.entities[id]) state.entities[id].updates = Array.isArray(updates) ? updates : [];
            })
            .addCase(createTrip.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) tripsAdapter.addOne(state, action.payload);
            })
            .addCase(updateTrip.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) tripsAdapter.upsertOne(state, action.payload);
            })
            .addCase(deleteTrip.fulfilled, (state, action) => {
                tripsAdapter.removeOne(state, action.payload);
            })
            .addCase(logout, () => initialState);
        trackRequests(builder, [
            fetchTrips, fetchTripById, fetchTripSchedule, fetchTripUpdates, createTrip, updateTrip, deleteTrip,
        ]);
    },
});

export const { tripRemovedLocally } = tripsSlice.actions;

export const {
    selectAll: selectAllTrips,
    selectById: selectTripById,
    selectIds: selectTripIds,
    selectTotal: selectTripCount,
} = tripsAdapter.getSelectors((state) => state.trips);
export const selectTripsStatus = (state) => state.trips.status;
export const selectTripsError = (state) => state.trips.error;

export default tripsSlice.reducer;
