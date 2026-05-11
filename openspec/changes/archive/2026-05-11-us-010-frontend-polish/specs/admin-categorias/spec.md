## ADDED Requirements

### Requirement: An `AdminCategorias` page SHALL provide CRUD for the category tree

The admin panel SHALL expose a route `/admin/categorias` that renders an `AdminCategorias` page allowing admins to create, edit, soft-delete, and reassign the parent of any category. The page SHALL use the standard page-chrome stack (`PageHeader`, `Toolbar`, `DataTable`, `PaginationBar`) for visual consistency with `AdminProductos` and `AdminUsuarios`.

#### Scenario: Admin lists categories
- **WHEN** an authenticated admin navigates to `/admin/categorias`
- **THEN** the page renders a paginated `DataTable` with columns `Nombre`, `Padre`, `Productos`, `Estado`, `Acciones`, sourced from `GET /api/v1/categorias?page=&size=`

#### Scenario: Hierarchy is conveyed in the Nombre column
- **WHEN** the table renders a category whose `parent_id` is not null
- **THEN** the `Nombre` cell is visually indented and prefixed with a tree glyph (e.g. `└`) at a depth proportional to the parent chain

#### Scenario: Admin filters by root category
- **WHEN** an admin selects a root category in the `Toolbar` `Select`
- **THEN** the table refetches and only shows that root and its descendants

#### Scenario: Admin creates a category
- **WHEN** an admin clicks the `Toolbar` "Nueva categoría" button, fills `nombre`, optionally selects a `parent_id`, and submits
- **THEN** the page calls `POST /api/v1/categorias`, closes the `Dialog`, invalidates the query, and shows a sonner success toast

#### Scenario: Admin edits a category
- **WHEN** an admin clicks the row action "Editar", changes `nombre` or `parent_id`, and submits
- **THEN** the page calls `PUT /api/v1/categorias/{id}` and refreshes the table

#### Scenario: Parent reassignment forbids cycles
- **WHEN** an admin opens the edit `Dialog` for category A
- **THEN** the `parent_id` `Select` excludes A itself and every descendant of A from its options

#### Scenario: Admin soft-deletes a category
- **WHEN** an admin clicks the row action "Eliminar" and confirms the `Dialog`
- **THEN** the page calls `DELETE /api/v1/categorias/{id}` and refreshes the table

#### Scenario: Delete fails when category is in use
- **WHEN** the backend returns 409 because the category has children or linked products
- **THEN** the page surfaces the backend `detail` message inline in the confirmation `Dialog` and does NOT close it

#### Scenario: Empty state when no categories exist
- **WHEN** the table query returns zero rows and no filter is active
- **THEN** the table area renders an `EmptyState` with title "Sin categorías", a description, and a primary action that opens the "Nueva categoría" `Dialog`

### Requirement: The admin sidebar SHALL link to AdminCategorias

The admin layout's sidebar/navigation SHALL include a "Categorías" entry that routes to `/admin/categorias`. The entry SHALL be visible only to users with role `ADMIN`.

#### Scenario: Sidebar entry visible for admins
- **WHEN** a user with role `ADMIN` is signed in
- **THEN** the admin sidebar shows a "Categorías" entry linking to `/admin/categorias`

#### Scenario: Sidebar entry hidden for non-admins
- **WHEN** a user without role `ADMIN` is signed in
- **THEN** the "Categorías" entry is not rendered
