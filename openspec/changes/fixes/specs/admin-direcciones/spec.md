## MODIFIED Requirements

### Requirement: An `AdminDirecciones` page SHALL provide read and soft-delete for user addresses

The admin panel SHALL expose a route `/admin/direcciones` that renders an `AdminDirecciones` page allowing admins to browse every user's addresses and soft-delete inappropriate entries. The page SHALL use `PageHeader`, `Toolbar`, `DataTable`, and `PaginationBar` for visual consistency.

#### Scenario: Admin lists addresses
- **WHEN** an authenticated admin navigates to `/admin/direcciones`
- **THEN** the page renders a paginated `DataTable` with columns `Usuario`, `Etiqueta`, `Calle`, `Ciudad`, `Provincia`, `CP`, `Creada`, `Acciones`, sourced from `GET /api/v1/admin/direcciones?page=&size=`

#### Scenario: Admin searches by user email
- **WHEN** an admin types in the `Toolbar` search field
- **THEN** after a 300ms debounce the query refetches with `GET /api/v1/admin/direcciones?page=&size=&usuario_email=<query>` and the table updates

#### Scenario: Admin views a single address
- **WHEN** an admin clicks the row action "Ver"
- **THEN** a read-only `Dialog` opens showing every field of the address including raw lat/lng if present

#### Scenario: Admin soft-deletes an address
- **WHEN** an admin clicks the row action "Eliminar" and confirms the `Dialog`
- **THEN** the page calls `DELETE /api/v1/direcciones/{id}`, closes the dialog, invalidates the query, and shows a sonner success toast

#### Scenario: Deleted addresses are visually marked
- **WHEN** the response includes addresses with `deleted_at != NULL` (admins see them)
- **THEN** the row renders a `Badge` with `variant="danger"` and text "Eliminada", and the action menu offers no further actions

#### Scenario: Page is forbidden for non-admins
- **WHEN** a non-admin attempts to load `/admin/direcciones`
- **THEN** the router redirects to the home page (or shows the standard 403 view) and no request to `/api/v1/admin/direcciones` is issued

#### Scenario: Empty state when no addresses exist
- **WHEN** the table query returns zero rows
- **THEN** the table area renders an `EmptyState` with title "Sin direcciones", an explanatory description, and no primary action

### Requirement: The admin sidebar SHALL link to AdminDirecciones

The admin layout's sidebar/navigation SHALL include a "Direcciones" entry that routes to `/admin/direcciones`. The entry SHALL be visible only to users with role `ADMIN`.

#### Scenario: Sidebar entry visible for admins
- **WHEN** a user with role `ADMIN` is signed in
- **THEN** the admin sidebar shows a "Direcciones" entry linking to `/admin/direcciones`

#### Scenario: Sidebar entry hidden for non-admins
- **WHEN** a user without role `ADMIN` is signed in
- **THEN** the "Direcciones" entry is not rendered

## ADDED Requirements

### Requirement: Backend SHALL expose an admin-scoped addresses listing endpoint

The backend SHALL expose `GET /api/v1/admin/direcciones` restricted to users with role `ADMIN` that returns a paginated list of addresses across all users. The endpoint SHALL support an optional `usuario_email` filter.

#### Scenario: Admin lists all addresses
- **WHEN** an authenticated admin requests `GET /api/v1/admin/direcciones?page=1&size=20`
- **THEN** the backend responds `200 OK` with a pagination envelope `{ items, total, page, size, pages }`

#### Scenario: Admin filters by usuario_email
- **WHEN** an authenticated admin requests `GET /api/v1/admin/direcciones?page=1&size=20&usuario_email=ana@ejemplo.com`
- **THEN** the backend responds `200 OK` returning only addresses whose owning user's email matches the filter

#### Scenario: Non-admin is forbidden
- **WHEN** a non-admin requests `GET /api/v1/admin/direcciones`
- **THEN** the backend responds `403 Forbidden`
