import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { uploadApi } from '../../services/api';
import { STATUS, callApi, trackRequests } from '../thunkHelpers';
import { logout } from './authSlice';

/**
 * uploads slice  <->  back-end UploadController (/upload)
 *
 *   POST /upload  -> uploadFile    (Create: multipart upload, field "file")
 *   selectors     -> selectAllUploads / selectUploadById  (Read files uploaded this session)
 *   reducers      -> uploadProgressChanged (Update progress), uploadRemoved (Delete from the list)
 *
 * Records are keyed by the stored file name the back-end returns.
 */

const uploadsAdapter = createEntityAdapter({
    selectId: (file) => file.filename || file.url,
});

export const uploadFile = createAsyncThunk(
    'uploads/uploadFile',
    (file, thunkApi) => callApi(async () => {
        const response = await uploadApi.upload(file, (percent) => {
            thunkApi.dispatch(uploadProgressChanged(percent));
        });
        const url = response?.url || response?.data?.url || '';
        return {
            ...(response?.data && typeof response.data === 'object' ? response.data : response),
            url,
            filename: response?.filename || response?.data?.filename || url.split('/').pop(),
            originalName: file?.name || '',
            uploadedAt: new Date().toISOString(),
        };
    }, thunkApi),
);

const initialState = uploadsAdapter.getInitialState({
    progress: 0,
    status: STATUS.idle,
    error: null,
    lastFetched: null,
});

const uploadsSlice = createSlice({
    name: 'uploads',
    initialState,
    reducers: {
        uploadProgressChanged(state, action) {
            state.progress = action.payload;
        },
        uploadRemoved(state, action) {
            uploadsAdapter.removeOne(state, action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(uploadFile.pending, (state) => {
                state.progress = 0;
            })
            .addCase(uploadFile.fulfilled, (state, action) => {
                state.progress = 100;
                if (action.payload && (action.payload.filename || action.payload.url)) {
                    uploadsAdapter.upsertOne(state, action.payload);
                }
            })
            .addCase(logout, () => initialState);
        trackRequests(builder, [uploadFile]);
    },
});

// Declared before uploadFile runs, used inside its progress callback.
export const { uploadProgressChanged, uploadRemoved } = uploadsSlice.actions;

export const {
    selectAll: selectAllUploads,
    selectById: selectUploadById,
} = uploadsAdapter.getSelectors((state) => state.uploads);
export const selectUploadProgress = (state) => state.uploads.progress;
export const selectUploadStatus = (state) => state.uploads.status;

export default uploadsSlice.reducer;
