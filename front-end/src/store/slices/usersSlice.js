import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { usersApi } from '../../services/api';
import { STATUS, callApi, trackRequests } from '../thunkHelpers';
import { logout } from './authSlice';

/**
 * users slice  <->  back-end UsersController (/users)
 *
 *   GET    /users       -> fetchUsers     (Read all)
 *   GET    /users/:id   -> fetchUserById  (Read one)
 *   POST   /users       -> createUser     (Create)
 *   PATCH  /users/:id   -> updateUser     (Update)
 *   DELETE /users/:id   -> deleteUser     (Delete)
 *
 * Records are stored normalized ({ ids, entities }) by createEntityAdapter.
 */

/** Passwords returned by the API never enter the Redux store. */
const stripPassword = (user) => {
    if (!user || typeof user !== 'object') return user;
    const { password, ...rest } = user; // eslint-disable-line no-unused-vars
    return rest;
};

const usersAdapter = createEntityAdapter();

export const fetchUsers = createAsyncThunk(
    'users/fetchUsers',
    (_, thunkApi) => callApi(async () => {
        const list = await usersApi.list();
        return Array.isArray(list) ? list.map(stripPassword) : [];
    }, thunkApi),
);

export const fetchUserById = createAsyncThunk(
    'users/fetchUserById',
    (id, thunkApi) => callApi(async () => stripPassword(await usersApi.get(id)), thunkApi),
);

export const createUser = createAsyncThunk(
    'users/createUser',
    (payload, thunkApi) => callApi(async () => stripPassword(await usersApi.create(payload)), thunkApi),
);

export const updateUser = createAsyncThunk(
    'users/updateUser',
    ({ id, changes }, thunkApi) => callApi(async () => stripPassword(await usersApi.update(id, changes)), thunkApi),
);

export const deleteUser = createAsyncThunk(
    'users/deleteUser',
    (id, thunkApi) => callApi(async () => {
        await usersApi.remove(id);
        return id;
    }, thunkApi),
);

const initialState = usersAdapter.getInitialState({
    status: STATUS.idle,
    error: null,
    lastFetched: null,
});

const usersSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchUsers.fulfilled, (state, action) => {
                usersAdapter.setAll(state, action.payload);
            })
            .addCase(fetchUserById.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) usersAdapter.upsertOne(state, action.payload);
            })
            .addCase(createUser.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) usersAdapter.addOne(state, action.payload);
            })
            .addCase(updateUser.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) usersAdapter.upsertOne(state, action.payload);
            })
            .addCase(deleteUser.fulfilled, (state, action) => {
                usersAdapter.removeOne(state, action.payload);
            })
            .addCase(logout, () => initialState);
        trackRequests(builder, [fetchUsers, fetchUserById, createUser, updateUser, deleteUser]);
    },
});

export const {
    selectAll: selectAllUsers,
    selectById: selectUserById,
    selectIds: selectUserIds,
    selectTotal: selectUserCount,
} = usersAdapter.getSelectors((state) => state.users);
export const selectUsersStatus = (state) => state.users.status;
export const selectUsersError = (state) => state.users.error;

export default usersSlice.reducer;
