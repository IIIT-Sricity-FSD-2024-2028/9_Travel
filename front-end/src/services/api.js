import axios from 'axios';
import { readStoredSession, roleHeaderLabel } from './session';

/**
 * Central HTTP client for the existing NestJS backend.
 *
 * Every request carries the same headers the original api_client.js sent:
 *   - x-role        → role label checked by the backend RolesGuard
 *   - x-user-email  → active session user (not sent for /auth/* requests)
 */
const fallbackHost = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || `http://${fallbackHost}:3000`).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const session = readStoredSession();
  const url = String(config.url || '');
  const isAuthRequest = url.startsWith('/auth/');
  const roleLabel = roleHeaderLabel(session.role);
  config.headers = config.headers || {};
  if (roleLabel) config.headers['x-role'] = roleLabel;
  if (!isAuthRequest && session.email) config.headers['x-user-email'] = session.email;
  // Let the browser set the multipart boundary for file uploads.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(new ApiError(
        `Cannot reach the backend API. Start the NestJS backend on ${API_BASE_URL}.`,
        0,
      ));
    }
    const { status, data } = error.response;
    const raw = data && data.message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw || `Request failed: ${status}`);
    // The backend blocks suspended accounts with 401/403 – broadcast it so the app can sign the user out.
    if ((status === 401 || status === 403) && /suspended/i.test(message)) {
      window.dispatchEvent(new CustomEvent('dd:account-suspended', { detail: { message } }));
    }
    return Promise.reject(new ApiError(message, status, data));
  },
);

/** Unwraps the `{ success, data }` envelope every controller returns. */
const unwrap = (response) => {
  const payload = response.data;
  return payload && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload;
};

// ---------------------------------------------------------------------------
// Endpoint helpers – these mirror the real controllers in back-end/src.
// ---------------------------------------------------------------------------

export const authApi = {
  login: (body) => api.post('/auth/login', body).then(unwrap),
  sendRegistrationOtp: (body) => api.post('/auth/send-registration-otp', body).then(unwrap),
  verifyOtp: (body) => api.post('/auth/verify-otp', body).then(unwrap),
  resendOtp: (email) => api.post('/auth/resend-otp', { email }).then(unwrap),
  register: (body) => api.post('/auth/register', body).then(unwrap),
  applyPartner: (body) => api.post('/auth/apply-partner', body).then(unwrap),
};

export const partnerApplicationsApi = {
  list: () => api.get('/partner-applications').then(unwrap),
  get: (id) => api.get(`/partner-applications/${encodeURIComponent(id)}`).then(unwrap),
  approve: (id) => api.post(`/partner-applications/${encodeURIComponent(id)}/approve`).then(unwrap),
  reject: (id, rejectionReason) => api.post(`/partner-applications/${encodeURIComponent(id)}/reject`, { rejectionReason }).then(unwrap),
};

export const usersApi = {
  list: () => api.get('/users').then(unwrap),
  get: (idOrEmail) => api.get(`/users/${encodeURIComponent(idOrEmail)}`).then(unwrap),
  create: (body) => api.post('/users', body).then(unwrap),
  update: (id, body) => api.patch(`/users/${encodeURIComponent(id)}`, body).then(unwrap),
  remove: (id) => api.delete(`/users/${encodeURIComponent(id)}`).then(unwrap),
};

export const tripsApi = {
  list: () => api.get('/trips').then(unwrap),
  get: (id) => api.get(`/trips/${encodeURIComponent(id)}`).then(unwrap),
  create: (body) => api.post('/trips', body).then(unwrap),
  update: (id, body) => api.patch(`/trips/${encodeURIComponent(id)}`, body).then(unwrap),
  remove: (id) => api.delete(`/trips/${encodeURIComponent(id)}`).then(unwrap),
  schedule: (id) => api.get(`/trips/${encodeURIComponent(id)}/schedule`).then(unwrap),
  updates: (id) => api.get(`/trips/${encodeURIComponent(id)}/updates`).then(unwrap),
};

export const tripRequestsApi = {
  list: () => api.get('/trip-requests').then(unwrap),
  create: (body) => api.post('/trip-requests', body).then(unwrap),
  accept: (id) => api.post(`/trip-requests/${encodeURIComponent(id)}/accept`).then(unwrap),
  cancel: (id) => api.delete(`/trip-requests/${encodeURIComponent(id)}`).then(unwrap),
};

export const issuesApi = {
  list: () => api.get('/issues').then(unwrap),
  get: (id) => api.get(`/issues/${encodeURIComponent(id)}`).then(unwrap),
};

export const messagesApi = {
  list: (params) => api.get('/messages', { params }).then(unwrap),
};

export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }).then(unwrap),
};

export const guidesApi = {
  list: () => api.get('/guides').then(unwrap),
};

export const vendorsApi = {
  list: () => api.get('/vendors').then(unwrap),
};

/** The workflow state API is what the original frontend used as its data store. */
export const workflowApi = {
  getState: () => api.get('/workflow/state').then(unwrap),
  putState: (state) => api.put('/workflow/state', state).then(unwrap),
};

/**
 * Multipart upload to the existing UploadController (field name "file").
 * Returns the controller response including `url` (e.g. /uploads/file-123.png).
 */
export const uploadApi = {
  upload: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload', form, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    }).then((response) => response.data);
  },
};

/** Turns a backend-relative upload path into an absolute URL usable in <img src>. */
export function fileUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (path.startsWith('/uploads/')) return `${API_BASE_URL}${path}`;
  return path;
}

export default api;
