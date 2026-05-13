## Why

The current app has several regressions/inconsistencies between backend contracts, API documentation tooling (ReDoc), and frontend UI behavior that block admin workflows and degrade UX. Fixing these now reduces support load and unblocks ongoing frontend redesign work.

## What Changes

- Fix **Admin Direcciones** to stop erroring by aligning frontend + backend to a supported admin-scoped listing API (including `usuario_email` filtering) and documenting the final contract.
- Fix **API authentication in ReDoc** so interactive documentation can obtain tokens successfully (email vs `username` mismatch / request format mismatch).
- Fix **navbar active-link highlighting** so only the clicked route is highlighted (no double-highlight with “Gestión”).
- Fix **invalid DOM nesting warning** by ensuring `Dialog` content is rendered outside table markup (no `<dialog>` directly under `<tbody>`), without changing feature behavior.

## Capabilities

### New Capabilities
- *(none)*

### Modified Capabilities
- `admin-direcciones`: Clarify and enforce the admin listing contract (admin scope, pagination, optional `usuario_email` filter) and ensure the frontend targets the supported endpoint.
- `auth`: Ensure the login/auth flow is compatible with OpenAPI/ReDoc authentication tooling while preserving the existing email-based login behavior.
- `ui-component-library`: Ensure `Dialog` renders in a way that is valid in all host contexts (e.g., tables) to avoid `validateDOMNesting` warnings.

## Impact

- Backend: admin addresses endpoint/authorization + auth OpenAPI/login request compatibility.
- Frontend: AdminDirecciones page data source, navbar active state logic, and dialog rendering strategy (portal/placement).
- Docs/Tooling: ReDoc “Authorize” flow becomes usable for protected endpoints.
