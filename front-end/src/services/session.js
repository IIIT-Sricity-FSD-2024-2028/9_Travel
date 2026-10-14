/**
 * Session storage helpers (ported from login.js / auth_guard.js / api_client.js).
 *
 * The session returned by POST /auth/login is stored under `dd_session` in BOTH
 * sessionStorage (tab specific – lets different tabs hold different users) and
 * localStorage (persistent fallback), exactly like the original frontend.
 */
export const SESSION_KEY = 'dd_session';

export const ROLE_LABELS = {
  superuser: 'Super User',
  partner: 'Travel Partner',
  traveler: 'Traveler',
  vendor: 'Vendor',
  guide: 'Tour Guide',
  support: 'Support Executive',
};

/** Human readable portal names used in the UI (Super Admin instead of Super User). */
export const PORTAL_LABELS = {
  superuser: 'Super Admin',
  partner: 'Travel Partner',
  traveler: 'Traveler',
  vendor: 'Vendor',
  guide: 'Tour Guide',
  support: 'Support Executive',
};

/** Normalises any role spelling to the session role key used by the app. */
export function normRole(value) {
  if (!value) return '';
  const s = String(value).toLowerCase().trim();
  if (s === 'travel partner' || s === 'partner' || s === 'travel_partner' || s === 'travelpartner') return 'partner';
  if (s === 'tour guide' || s === 'guide' || s === 'tour_guide' || s === 'tourguide') return 'guide';
  if (s === 'support executive' || s === 'support' || s === 'support_executive' || s === 'supportexecutive') return 'support';
  if (s === 'super user' || s === 'super admin' || s === 'superuser' || s === 'superadmin' || s === 'super_admin') return 'superuser';
  if (s === 'traveler' || s === 'traveller') return 'traveler';
  if (s === 'vendor') return 'vendor';
  return s;
}

/** Value of the `x-role` header the backend RolesGuard expects. */
export function roleHeaderLabel(role) {
  return ROLE_LABELS[normRole(role)] || '';
}

export function readStoredSession() {
  try {
    const tabSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (tabSession && tabSession.email) return tabSession;
    return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function writeStoredSession(session) {
  const json = JSON.stringify(session || {});
  try { sessionStorage.setItem(SESSION_KEY, json); } catch { /* storage disabled */ }
  try { localStorage.setItem(SESSION_KEY, json); } catch { /* storage disabled */ }
}

export function clearStoredSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export function isValidSession(session) {
  return Boolean(session && session.email && session.role);
}
