import { createAsyncThunk, createEntityAdapter, createSelector, createSlice } from '@reduxjs/toolkit';
import { notificationsApi } from '../../services/api';
import { STATUS, callApi, trackRequests } from '../thunkHelpers';
import { logout } from './authSlice';

/**
 * notifications slice  <->  back-end NotificationsController (/notifications)
 *
 *   GET    /notifications?role&email  -> fetchNotifications     (Read all for a role / user)
 *   PATCH  /notifications/:id/read    -> markNotificationRead   (Update: mark read for a role)
 *   DELETE /notifications/:id         -> deleteNotification     (Delete)
 *   (no POST endpoint)                -> notificationAdded      (Create: the back-end creates
 *                                        notifications itself, so new ones are added locally)
 *
 * Records are stored normalized ({ ids, entities }) by createEntityAdapter,
 * newest first.
 */

const notificationsAdapter = createEntityAdapter({
    sortComparer: (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
});

export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    (params, thunkApi) => callApi(async () => {
        const list = await notificationsApi.list(params);
        return Array.isArray(list) ? list : [];
    }, thunkApi),
);

export const markNotificationRead = createAsyncThunk(
    'notifications/markNotificationRead',
    ({ id, role }, thunkApi) => callApi(() => notificationsApi.markRead(id, { role }), thunkApi),
);

export const deleteNotification = createAsyncThunk(
    'notifications/deleteNotification',
    (id, thunkApi) => callApi(async () => {
        await notificationsApi.remove(id);
        return id;
    }, thunkApi),
);

const initialState = notificationsAdapter.getInitialState({
    status: STATUS.idle,
    error: null,
    lastFetched: null,
});

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        notificationAdded(state, action) {
            if (action.payload && action.payload.id) notificationsAdapter.upsertOne(state, action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                notificationsAdapter.setAll(state, action.payload);
            })
            .addCase(markNotificationRead.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) notificationsAdapter.upsertOne(state, action.payload);
            })
            .addCase(deleteNotification.fulfilled, (state, action) => {
                notificationsAdapter.removeOne(state, action.payload);
            })
            .addCase(logout, () => initialState);
        trackRequests(builder, [fetchNotifications, markNotificationRead, deleteNotification]);
    },
});

export const { notificationAdded } = notificationsSlice.actions;

export const {
    selectAll: selectAllNotifications,
    selectById: selectNotificationById,
    selectIds: selectNotificationIds,
    selectTotal: selectNotificationCount,
} = notificationsAdapter.getSelectors((state) => state.notifications);

/** Unread notifications for a role key (e.g. 'traveler'). */
export const selectUnreadNotifications = createSelector(
    [selectAllNotifications, (_, role) => role],
    (notifications, role) => notifications.filter((n) => !(n.readBy || []).includes(role)),
);
export const selectNotificationsStatus = (state) => state.notifications.status;
export const selectNotificationsError = (state) => state.notifications.error;

export default notificationsSlice.reducer;
