## Why

`us-009-frontend-redesign` shipped the design system, primitive library and a full color sweep, but a post-implementation audit surfaced gaps: the status color tokens lack numeric scales (which already caused a runtime bug with `bg-success-500`), the admin panel is missing dedicated CRUD pages for categories and addresses, the `DrawerFooter` is missing iOS safe-area padding documented in its README, the login marketing panel still leaks a raw emoji as logo, and there is no lint guard preventing reintroduction of raw palette classes. This change closes those gaps so the design system is internally consistent and the admin panel is feature-complete before us-011.

## What Changes

- Add **full 50–900 numeric scales** for `success`, `warning`, `danger`, `info` status colors in `src/index.css` (CSS variables) and `tailwind.config.js`, mirroring the structure already used for `brand` and `accent`. Keeps existing `DEFAULT/-bg/-fg` aliases as semantic wrappers.
- Create `AdminCategorias` CRUD page under `src/features/admin/pages/` for managing the hierarchical category tree (create, edit, delete, parent reassignment).
- Create `AdminDirecciones` CRUD page under `src/features/admin/pages/` for the admin to browse user addresses and soft-delete them.
- Wire both new pages into the admin router and the admin sidebar/navigation.
- Add `pb-[env(safe-area-inset-bottom)]` to `DrawerFooter` in `src/shared/ui/Drawer.tsx` (already documented in its README as supported).
- Replace the `🍽` emoji in the right-side marketing panel of `LoginPage.tsx` with a `lucide-react` icon (`UtensilsCrossed` or `ChefHat`).
- Add an ESLint guard (`eslint-plugin-tailwindcss` or custom no-restricted-syntax rule) that flags raw palette classes (`bg-gray-*`, `text-blue-*`, `bg-red-*`, etc.) inside `src/features/**` and `src/shared/**`, with a `lint:tokens` npm script and CI integration.

## Capabilities

### New Capabilities

- `admin-categorias`: CRUD page for hierarchical categories (tree view + parent reassignment), built on the page-chrome primitives (`PageHeader`, `Toolbar`, `DataTable`, `PaginationBar`, `Dialog`).
- `admin-direcciones`: Admin read + soft-delete page for user addresses, built on the same page-chrome primitives.

### Modified Capabilities

- `design-system`: Status colors (`success`, `warning`, `danger`, `info`) gain full 50–900 numeric scales as CSS variables AND Tailwind theme entries, in addition to the existing `DEFAULT/-bg/-fg` aliases.
- `ui-component-library`: `DrawerFooter` requirement updated to mandate iOS safe-area padding (`pb-[env(safe-area-inset-bottom)]`), aligning behavior with its documented contract.

## Impact

- **Code**:
  - `frontend/src/index.css` — add 9 numeric tokens × 4 status colors (36 new CSS variables)
  - `frontend/tailwind.config.js` — extend status color objects with 50–900 keys
  - `frontend/src/features/admin/pages/AdminCategorias.tsx` — new page
  - `frontend/src/features/admin/pages/AdminDirecciones.tsx` — new page
  - `frontend/src/features/admin/hooks/` — new hooks for categorias / direcciones if not already present
  - `frontend/src/features/admin/api.ts` (or per-feature `api.ts`) — admin-scoped endpoints
  - `frontend/src/app/router.tsx` (or equivalent) — register new routes
  - `frontend/src/shared/ui/Drawer.tsx` — single-line change in `DrawerFooter`
  - `frontend/src/features/auth/pages/LoginPage.tsx` — icon swap
  - `frontend/package.json` + `frontend/.eslintrc.*` — lint plugin + `lint:tokens` script
- **APIs**: no backend changes; consumes existing `/api/v1/categorias` and `/api/v1/direcciones` endpoints.
- **Dependencies**: adds `eslint-plugin-tailwindcss` (dev) — small, tree-shakeable, well-maintained.
- **Tests**: smoke tests for the two new admin pages (render + open dialog), plus unit assertion that `bg-success-500` resolves to a defined token.
- **Non-breaking**: existing usages of `success`/`warning`/`danger`/`info` semantic aliases continue to work; numeric scales are additive.
