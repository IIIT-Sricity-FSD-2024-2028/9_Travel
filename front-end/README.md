# Dream Destination – React frontend

React 18 + Vite + React Router + Axios frontend for the Travel Partner & Vendor Coordination
Platform. It replaces the former static HTML/JS pages and talks to the existing NestJS backend in
`../back-end` (the backend was not changed).

## Run

```bash
# 1. backend (separate terminal)
cd back-end
npm install
npm run start            # http://localhost:3000  (Swagger: /api)

# 2. frontend
cd front-end
npm install
npm run dev              # http://localhost:5173
```

Production build: `npm run build` (output in `dist/`), preview with `npm run preview`.

## Configuration

Copy `.env.example` to `.env` and adjust if the backend is not on `localhost:3000`:

```
VITE_API_BASE_URL=http://localhost:3000
```

No secrets belong in this file — every `VITE_*` variable is embedded in the browser bundle.

## Structure

```
src/
  main.jsx, App.jsx           entry point and providers (UI, theme, auth, workflow data)
  routes/                     route table (paths.js), AppRoutes, ProtectedRoute / RoleProtectedRoute
  context/                    AuthContext, ThemeContext, UIContext (toasts, dialogs, modals), WorkflowContext
  services/api.js             Axios instance + one client per backend resource (auth, users, trips, upload, …)
  services/session.js         session storage helpers and role ↔ x-role header mapping
  services/workflow/          workflow store (GET/PUT /workflow/state), selectors, actions, CSV/PDF exports
  layouts/                    DashboardLayout (sidebar + header), AuthLayout
  components/                 Sidebar, Header, NotificationBell, Icon, modals, upload zone, schedule views, …
  hooks/                      useWorkflowActions, useProfile, useIssueReport, usePasswordChange, …
  pages/<portal>/             one component per original page (traveler, travelPartner, guide, vendor, support, superuser)
  styles/                     the original CSS files (unchanged design) + per-page manifest
public/images/                original images
```

Each page loads exactly the stylesheets the original HTML page loaded, in the same order
(`styles/manifest.js`), so the visual design is preserved.

## Authentication & authorization

* Login/registration use `POST /auth/login` and `POST /auth/register`.
* Every API request carries the `x-role` and `x-user-email` headers expected by the backend's
  `RolesGuard`; the backend remains the authority for permissions.
* `ProtectedRoute` redirects anonymous users to `/login`; `RoleProtectedRoute` keeps each role
  inside its own portal. Suspended accounts are signed out when the backend reports them.
