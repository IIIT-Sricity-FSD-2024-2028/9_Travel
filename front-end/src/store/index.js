import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import usersReducer from './slices/usersSlice';
import guidesReducer from './slices/guidesSlice';
import vendorsReducer from './slices/vendorsSlice';
import tripsReducer from './slices/tripsSlice';
import tripRequestsReducer from './slices/tripRequestsSlice';
import issuesReducer from './slices/issuesSlice';
import messagesReducer from './slices/messagesSlice';
import notificationsReducer from './slices/notificationsSlice';
import workflowReducer from './slices/workflowSlice';
import uploadsReducer from './slices/uploadsSlice';

/**
 * Redux store of the React app.
 *
 * One slice per back-end controller (one-to-one mapping):
 *
 *   store key       slice file              back-end controller
 *   ------------    --------------------    -------------------------------
 *   auth            authSlice.js            AuthController          /auth
 *   users           usersSlice.js           UsersController         /users
 *   guides          guidesSlice.js          GuidesController        /guides
 *   vendors         vendorsSlice.js         VendorsController       /vendors
 *   trips           tripsSlice.js           TripsController         /trips
 *   tripRequests    tripRequestsSlice.js    TripRequestsController  /trip-requests
 *   issues          issuesSlice.js          IssuesController        /issues
 *   messages        messagesSlice.js        MessagesController      /messages
 *   notifications   notificationsSlice.js   NotificationsController /notifications
 *   workflow        workflowSlice.js        WorkflowController      /workflow
 *   uploads         uploadsSlice.js         UploadController        /upload
 *
 * Every slice talks to the API only through createAsyncThunk thunks (redux-thunk is
 * included by configureStore's default middleware).
 */
export const store = configureStore({
    reducer: {
        auth: authReducer,
        users: usersReducer,
        guides: guidesReducer,
        vendors: vendorsReducer,
        trips: tripsReducer,
        tripRequests: tripRequestsReducer,
        issues: issuesReducer,
        messages: messagesReducer,
        notifications: notificationsReducer,
        workflow: workflowReducer,
        uploads: uploadsReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        // The workflow snapshot is a large JSON document; skip the dev-only deep checks on it.
        immutableCheck: { ignoredPaths: ['workflow.data'] },
        serializableCheck: { ignoredPaths: ['workflow.data'] },
    }),
    devTools: import.meta.env.DEV,
});

export default store;
