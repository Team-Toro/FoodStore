## Context

This change consolidates a set of small but cross-cutting fixes across backend contracts, OpenAPI/ReDoc auth tooling, and frontend UI behavior.

Current symptoms:
- Admin Direcciones frontend errors due to an endpoint mismatch (frontend targeting an admin-scoped route that the backend does not expose).
- ReDoc cannot authenticate against the login endpoint due to an OpenAPI/security scheme mismatch (commonly `username` vs `email` field naming / OAuth2 password-flow expectations).
- Navbar highlights both “Gestión” and a child link at the same time due to overly-broad active route matching.
- React warns about invalid DOM nesting because a `<dialog>` is rendered inside table markup (`<tbody>`).

Constraints:
- Preserve the project conventions: backend layered architecture; frontend FSD; TanStack Query for server state; Zustand for client state.
- Keep user-visible behavior intact except for the bug fixes.

## Goals / Non-Goals

**Goals:**
- Align Admin Direcciones to a stable admin-scoped listing API that supports pagination and optional `usuario_email` filtering.
- Make ReDoc “Authorize” work with the existing email-based login flow by adjusting OpenAPI auth configuration and/or login request schema to match tooling expectations.
- Fix navbar active state so only the current route is highlighted.
- Eliminate `validateDOMNesting` warnings by rendering `Dialog` outside table DOM structure.

**Non-Goals:**
- No visual redesign beyond what is necessary to remove incorrect highlighting / warnings.
- No new admin features beyond listing/viewing/soft-deleting addresses.
- No changes to the core auth model (still email + password), token semantics, or RBAC rules.

## Decisions

1) **Admin Direcciones API contract**
- Decision: Prefer a dedicated admin endpoint `GET /api/v1/admin/direcciones` for listing/searching across users, rather than overloading the user-scoped `GET /api/v1/direcciones`.
- Rationale: Keeps authorization boundaries explicit; avoids leaking admin-only filters into user endpoints; reduces ambiguity in OpenAPI docs.
- Alternative: Extend `GET /api/v1/direcciones` to accept admin-only `usuario_email` when caller is admin.
  - Trade-off: Harder to reason about; more conditional behavior; risk of accidental exposure.

2) **ReDoc authentication compatibility**
- Decision: Ensure OpenAPI describes the login flow in a way ReDoc can use (either OAuth2 password flow expecting `username` or explicitly documenting a token endpoint that accepts `username` as alias for email).
- Rationale: Tooling compatibility without changing how users log in.
- Alternative: Keep OpenAPI as-is and document curl-only flows.
  - Trade-off: Interactive docs remain broken; higher onboarding friction.

3) **Dialog rendering strategy**
- Decision: Render dialog content via a portal to `document.body` (or equivalent root) so it is never a descendant of table elements.
- Rationale: Guarantees valid DOM nesting regardless of where `Dialog` is used; removes warning; improves layering/z-index behavior.
- Alternative: Move `Dialog` usage out of table rows in feature code.
  - Trade-off: Requires touching multiple pages/components; risk of reintroducing the issue elsewhere.

4) **Navbar active-route matching**
- Decision: Use exact/segment-aware matching for the “Gestión” parent item so it is active only on its index route (or treat it as a non-link group label).
- Rationale: Prevents double-highlight; matches user mental model.
- Alternative: Keep broad matching and change styles.
  - Trade-off: Still confusing; does not fix the underlying routing logic.

## Risks / Trade-offs

- **Risk:** Changing admin direcciones endpoints could break existing frontend code.
  → **Mitigation:** Update both spec + frontend integration in the same change; add an API contract test (backend) or minimal integration test.

- **Risk:** Adjusting OpenAPI/security schemes may affect other tooling or clients.
  → **Mitigation:** Keep actual runtime auth behavior unchanged; only add compatible schema/aliasing; verify `/docs` and ReDoc flows.

- **Risk:** Portal-based Dialog could affect styling (z-index, positioning) or focus management.
  → **Mitigation:** Ensure the existing Dialog primitive already manages focus; keep the same public API; validate a few key dialogs (admin cancel, view address).
