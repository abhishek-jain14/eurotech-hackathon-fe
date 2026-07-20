# test-fe — QAGenie Frontend

React 18.3.1 · Vite 5.4.8 · Node 22.x

> Note on `package.json` `engines.node`: you specified `22.1.13.0`, but Node
> versions are 3-part semver (major.minor.patch); there is no such release.
> The closest real version is Node 22.1.0. The field is left as requested
> but you'll want `"node": ">=22.1.0"` in practice, or pin to whatever
> 22.x LTS your CI actually installs.

## Structure (mirrors the backend's module names 1:1)

```
src/
  api/            one file per backend module (axios calls only)
  context/        AuthContext (login/logout/session)
  routes/         ProtectedRoute + central AppRoutes route table
  components/
    layout/       Sidebar, Topbar, MainLayout
    common/       RoleGate (hide buttons from a role inline)
  pages/
    auth/         LoginPage (dummy admin/test + real backend login)
    dashboard/    projects/ (Admin-managed keystore/truststore + Environments)
    onboarding/   (Application list + 3-step onboarding: Project -> Environment -> URL)
    environment/  scenarios/ testdata/
    testflows/    execution/ reports/ maintenance/ users/
```

## Hierarchy this UI reflects

```
Project (Admin-managed - keystore/truststore, spec path suffix)
 ├─ Environments (Dev/Staging/Prod)   [Projects screen]
 └─ Applications (onboarded once)     [Applications screen]
      └─ derives its spec URL from a chosen Environment + its name,
         or a custom URL you provide instead
```

Onboarding an application (`/onboarding/new`) asks for a Project first
(this is what supplies keystore/truststore for reaching its endpoint),
then one of that Project's Environments, then shows a live preview of the
derived URL - editable if you switch to "Overwrite with my own URL".

Spec updates after the first are never silently applied: the Applications
list shows a "Pending update — review" badge, which opens a diff (added/
removed/modified endpoints) plus which existing scenarios reference the
changed endpoints, before you approve or reject.

## Role-based access

| Role   | Can view | Can create/edit/delete | Extra |
|--------|----------|--------------------------|-------|
| VIEWER | Everything | Nothing — edit routes 403, action buttons hidden | — |
| TESTER | Everything | Everything except Users | — |
| ADMIN  | Everything | Everything | User management (`/users`) |

Enforced in two layers:
1. **Route level** — `ProtectedRoute` redirects to `/unauthorized` if the
   logged-in role isn't in that route's `allowedRoles` (see
   `routes/AppRoutes.jsx`). E.g. `/onboarding/new` only allows
   `ADMIN`/`TESTER`; a VIEWER never even reaches the form.
2. **Component level** — `RoleGate` hides individual buttons (Add/Edit/
   Delete) inside list pages that VIEWER is otherwise allowed to view.

This mirrors the backend's `@PreAuthorize` checks so a VIEWER hitting the
API directly gets the same 403 the UI already prevented.

## Login

Dummy/demo credential: **admin / test** — always resolves to ADMIN. It
works two ways:
- If `test-be` is running, it goes through `POST /api/v1/auth/login`
  and returns a real JWT (see backend `AuthServiceImpl`).
- If the backend is unreachable, `AuthContext` falls back to a local
  dummy session for `admin`/`test` only, so the FE stays usable in
  isolation. Any other credential always requires a live, reachable
  backend and a real DB-provisioned user.

Seed a TESTER/VIEWER user via `test-be/db-scripts/02_roles_and_users.sql`
or the Users screen (ADMIN only).

## Running locally

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in `.env` (copy `.env.example`) to point at the
`test-be` instance for your environment. Vite's dev server also proxies
`/api/**` to `http://localhost:8080` by default (see `vite.config.js`).

## Build for deployment

```bash
npm run build
```

Outputs a static `dist/` bundle - deploy behind any static host / CDN,
pointing `VITE_API_BASE_URL` at the correct backend per environment.
