## 1. Backend: Admin Direcciones endpoint

- [x] 1.1 Add `GET /api/v1/admin/direcciones` router endpoint restricted to `ADMIN`
- [x] 1.2 Implement service/repository query to list addresses across users with pagination
- [x] 1.3 Add optional `usuario_email` filter support to the admin listing query
- [x] 1.4 Ensure response shape matches standard pagination envelope `{ items, total, page, size, pages }`

## 2. Backend: Auth OpenAPI/ReDoc compatibility

- [x] 2.1 Verify current `/api/v1/auth/login` request parsing and OpenAPI schema (OAuth2 tokenUrl vs body)
- [x] 2.2 Update login to accept `username` as an alias for `email` (without changing existing email-based clients)
- [x] 2.3 Confirm ReDoc "Authorize" can obtain a token and call a protected endpoint (`/api/v1/auth/me`)

## 3. Frontend: Admin Direcciones integration

- [x] 3.1 Update `AdminDirecciones` page to call `GET /api/v1/admin/direcciones` and wire pagination + `usuario_email` search
- [x] 3.2 Ensure empty/error states render correctly and deleted rows are marked per spec

## 4. Frontend: Navbar active state bug

- [x] 4.1 Fix "Gestión" nav item active matching so it does not remain active when a child admin route is active
- [x] 4.2 Verify desktop and mobile nav highlight only the current route

## 5. Frontend: Dialog DOM nesting warning

- [x] 5.1 Update `shared/ui/Dialog` (or affected feature usage) so `<dialog>` is not rendered under table elements (e.g., portal to `document.body`)
- [x] 5.2 Verify `GestionPedidos` cancel dialog no longer logs `validateDOMNesting(...): <dialog> cannot appear as a child of <tbody>`
