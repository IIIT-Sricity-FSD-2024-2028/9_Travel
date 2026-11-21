import { isFulfilled, isPending, isRejected } from '@reduxjs/toolkit';

/**
 * Shared helpers for the async thunks of every Redux slice.
 *
 * Provides standardized error formatting, lifecycle management, and request status tracking.
 * Thunks reject with a plain, serializable `{ message, status }` object so the
 * Redux state stays serializable and `dispatch(thunk()).unwrap()` throws an
 * error with the same `message` / `status` fields the ApiError class exposes.
 */
export const toRejectValue = (error) => ({
    message: (error && (error.response?.data?.message || error.message)) || 'Request failed',
    status: (error && (error.response?.status || error.status)) || 0,
});

/**
 * Runs an API call and maps failures through `rejectWithValue` with serializable error payloads.
 */
export const callApi = async (request, { rejectWithValue }) => {
    try {
        return await request();
    } catch (error) {
        return rejectWithValue(toRejectValue(error));
    }
};

/** Request lifecycle values used by every slice's `status` field. */
export const STATUS = {
    idle: 'idle',
    loading: 'loading',
    succeeded: 'succeeded',
    failed: 'failed',
};

/**
 * Common pending / fulfilled / rejected bookkeeping for a slice's thunks.
 * Uses Redux Toolkit matchers to update status, error, and lastFetched timestamps.
 * Must be called after the slice's own `addCase` handlers.
 */
export const trackRequests = (builder, thunks) => {
    builder
        .addMatcher(isPending(...thunks), (state) => {
            state.status = STATUS.loading;
            state.error = null;
        })
        .addMatcher(isFulfilled(...thunks), (state) => {
            state.status = STATUS.succeeded;
            state.lastFetched = Date.now();
        })
        .addMatcher(isRejected(...thunks), (state, action) => {
            state.status = STATUS.failed;
            state.error = action.payload?.message || action.error?.message || 'Request failed';
        });
};
