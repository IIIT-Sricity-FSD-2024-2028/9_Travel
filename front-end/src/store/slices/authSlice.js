import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '../../services/api';
import { readStoredSession } from '../../services/session';
import { STATUS, callApi, trackRequests } from '../thunkHelpers';

/**
 * auth slice  <->  back-end AuthController (/auth)
 *
 *   POST /auth/login     -> loginUser     (Read: verifies credentials, returns the session)
 *   POST /auth/register  -> registerUser  (Create: new account)
 *
 * The session itself is persisted in localStorage by AuthContext; this slice mirrors it
 * so any component can read the signed-in user with `useSelector(selectSession)`.
 */

export const loginUser = createAsyncThunk(
    'auth/loginUser',
    (credentials, thunkApi) => callApi(() => authApi.login(credentials), thunkApi),
);

export const registerUser = createAsyncThunk(
    'auth/registerUser',
    (payload, thunkApi) => callApi(() => authApi.register(payload), thunkApi),
);

const initialState = {
    session: readStoredSession(),
    status: STATUS.idle,
    error: null,
    lastFetched: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        /** Stores the session after AuthContext has completed the login. */
        sessionStarted(state, action) {
            state.session = action.payload || {};
        },
        /** Merges profile / status changes into the active session (Update). */
        sessionUpdated(state, action) {
            state.session = { ...state.session, ...action.payload };
        },
        /** Ends the session (Delete). Every entity slice also resets on this action. */
        logout(state) {
            state.session = {};
            state.status = STATUS.idle;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        trackRequests(builder, [loginUser, registerUser]);
    },
});

export const { sessionStarted, sessionUpdated, logout } = authSlice.actions;

export const selectSession = (state) => state.auth.session;
export const selectIsAuthenticated = (state) => Boolean(state.auth.session && state.auth.session.email);
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;
