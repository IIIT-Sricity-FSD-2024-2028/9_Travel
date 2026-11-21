import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { messagesApi } from '../../services/api';
import { STATUS, callApi, trackRequests } from '../thunkHelpers';
import { logout } from './authSlice';

/**
 * messages slice  <->  back-end MessagesController (/messages)
 *
 *   GET    /messages?tripId&email  -> fetchMessages     (Read all, optionally filtered)
 *   GET    /messages/:id           -> fetchMessageById  (Read one)
 *   POST   /messages               -> sendMessage       (Create)
 *   PATCH  /messages/:id           -> updateMessage     (Update)
 *   DELETE /messages/:id           -> deleteMessage     (Delete)
 *
 * Records are stored normalized ({ ids, entities }) by createEntityAdapter,
 * newest first.
 */

const messagesAdapter = createEntityAdapter({
    sortComparer: (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
});

export const fetchMessages = createAsyncThunk(
    'messages/fetchMessages',
    (params, thunkApi) => callApi(async () => {
        const list = await messagesApi.list(params);
        return Array.isArray(list) ? list : [];
    }, thunkApi),
);

export const fetchMessageById = createAsyncThunk(
    'messages/fetchMessageById',
    (id, thunkApi) => callApi(() => messagesApi.get(id), thunkApi),
);

export const sendMessage = createAsyncThunk(
    'messages/sendMessage',
    (payload, thunkApi) => callApi(() => messagesApi.create(payload), thunkApi),
);

export const updateMessage = createAsyncThunk(
    'messages/updateMessage',
    ({ id, changes }, thunkApi) => callApi(() => messagesApi.update(id, changes), thunkApi),
);

export const deleteMessage = createAsyncThunk(
    'messages/deleteMessage',
    (id, thunkApi) => callApi(async () => {
        await messagesApi.remove(id);
        return id;
    }, thunkApi),
);

const initialState = messagesAdapter.getInitialState({
    status: STATUS.idle,
    error: null,
    lastFetched: null,
});

const messagesSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchMessages.fulfilled, (state, action) => {
                messagesAdapter.setAll(state, action.payload);
            })
            .addCase(fetchMessageById.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) messagesAdapter.upsertOne(state, action.payload);
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) messagesAdapter.addOne(state, action.payload);
            })
            .addCase(updateMessage.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) messagesAdapter.upsertOne(state, action.payload);
            })
            .addCase(deleteMessage.fulfilled, (state, action) => {
                messagesAdapter.removeOne(state, action.payload);
            })
            .addCase(logout, () => initialState);
        trackRequests(builder, [fetchMessages, fetchMessageById, sendMessage, updateMessage, deleteMessage]);
    },
});

export const {
    selectAll: selectAllMessages,
    selectById: selectMessageById,
    selectIds: selectMessageIds,
    selectTotal: selectMessageCount,
} = messagesAdapter.getSelectors((state) => state.messages);
export const selectMessagesStatus = (state) => state.messages.status;
export const selectMessagesError = (state) => state.messages.error;

export default messagesSlice.reducer;
