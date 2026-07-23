# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install deps (no lockfile issues expected; node_modules not currently installed)
npm run dev       # Vite dev server on :5173, proxies /api/** to VITE_API_PROXY_TARGET (default http://localhost:8080)
npm run build     # production build to dist/
npm run preview   # preview the production build
npm run lint      # eslint src -- NOTE: no eslint.config.js exists in this repo yet, so this currently fails
                  # with "no ESLint configuration found" (ESLint 9 requires flat config). If asked to fix
                  # lint, you likely need to create eslint.config.js first.
```

There is no test runner configured (no test script, no test framework in devDependencies). Do not assume Jest/Vitest exist unless you add them.

`VITE_API_BASE_URL` must be set in `.env` (no `.env.example` currently checked in, despite the README instructing to copy one) to point the app at a running backend. Without a reachable backend, the only usable login is the offline dummy `admin`/`test` (see below).

## Architecture

This is a pure client-side React 18 + Vite SPA (React Router 6, Axios) with **no component library** — all styling is hand-rolled utility classes in `src/styles/theme.css` (dark theme, monospace, CSS custom properties). There is no state management library; all shared state is plain React Context.

### Backend-mirrored module layout

`src/` is deliberately structured to mirror the backend's module names 1:1, and `src/api/*.js` has one file per backend module (axios calls only, no business logic). When adding a new backend-backed feature, add/extend the matching `src/api/<module>Api.js` file rather than inlining axios calls in a page.

**Domain hierarchy the whole UI is built around:**
```
Project (Admin-managed: owns keystore/truststore, spec path suffix)
 ├─ Environments (Dev/Staging/Prod)     — /projects/:projectId/environments
 └─ Applications (onboarded once)      — /onboarding
      └─ spec URL is derived from a chosen Environment + app name,
         or a custom URL provided instead
```
Onboarding (`/onboarding/new`) is a 3-step flow: pick a Project → pick one of its Environments → review/override the derived spec URL.

Spec re-fetches after the first are never auto-applied: `ApplicationListPage`/`ApplicationSpecsPage` surface a "Pending update — review" state (diff of added/removed/modified endpoints, plus which existing scenarios reference the changed endpoints) that must be explicitly approved or rejected via `changeTrackerApi`/spec-version endpoints in `applicationApi.js`.

### API call convention

Every function in `src/api/*.js` follows the same shape and always unwraps the backend's envelope:
```js
export const listApplications = (params) => axiosClient.get(BASE, { params }).then((r) => r.data.data);
```
i.e. the backend wraps payloads in `{ data: ... }`, and callers get the unwrapped value directly — never reach for `response.data.data` in a page component, add it to the api file instead. Paginated list endpoints return `{ content: [], pageNumber, pageSize, totalElements, totalPages, last }` — see how `ProjectCacheContext` unwraps `data.content`.

`axiosClient` (`src/api/axiosClient.js`) attaches the bearer token from `localStorage.qagenie_token` on every request and, on any `401`, clears storage and hard-redirects to `/login`. Don't add per-call 401 handling — it's centralized here.

### Auth (`src/context/AuthContext.jsx`)

- Real login: `POST /api/v1/auth/login` via `authApi.js`, returns a JWT persisted to `localStorage` (`qagenie_token`, `qagenie_user`).
- Offline fallback: if the request fails with **no HTTP response at all** (backend unreachable) and credentials are exactly `admin`/`test`, a local dummy ADMIN session is created so the FE stays usable without a backend. Any real HTTP error response (401/422 from a live backend) is never swallowed by this fallback, and any other credential always requires a live backend. Don't "simplify" this by removing the `!err.response` check — that's what keeps the fallback from masking real auth failures.

### Role-based access — two enforcement layers, both required for a new protected feature

Roles: `ADMIN`, `TESTER`, `VIEWER` (`src/constants/roles.js`: `ALL_ROLES`, `EDIT_ROLES` = ADMIN+TESTER, `ADMIN_ONLY`). This mirrors the backend's `@PreAuthorize` checks so a VIEWER hitting the API directly gets the same 403 the UI already prevented.

1. **Route level** — `ProtectedRoute` (wraps route groups in `AppRoutes.jsx`) redirects to `/unauthorized` if `user.role` isn't in that group's `allowedRoles`. Routes are grouped by required role (e.g. `/onboarding/new` and `/onboarding/:id/edit` are only under the `EDIT_ROLES` group; `/users` only under `ADMIN_ONLY`) — a VIEWER never even reaches those components.
2. **Component level** — `RoleGate` (`src/components/common/RoleGate.jsx`) wraps individual Add/Edit/Delete buttons inside list pages that VIEWER can otherwise view, hiding them inline (see `ProjectsPage.jsx` for the canonical pattern).

When adding a new create/edit/delete action, both layers need updating: the route group in `AppRoutes.jsx` (or a new group) for full-page actions, and a `RoleGate` wrap for inline buttons on shared list/view pages.

### `ProjectCacheContext`

Global cache of the projects list (`src/context/ProjectCacheContext.jsx`), since Project is referenced across Environments, Onboarding, and elsewhere. `ensureLoaded()` is idempotent and dedupes concurrent calls via a ref-held in-flight promise — call it in a page's effect instead of fetching projects directly; call `refresh()` after any project mutation.