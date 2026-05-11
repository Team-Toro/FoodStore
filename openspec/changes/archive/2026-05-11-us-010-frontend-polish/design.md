## Context

`us-009-frontend-redesign` introduced the canonical design system (CSS variables in `frontend/src/index.css`, Tailwind theme extension in `frontend/tailwind.config.js`), a primitive library at `frontend/src/shared/ui/`, the page-chrome stack (`PageHeader`, `Toolbar`, `DataTable`, `PaginationBar`), and migrated every feature page to semantic tokens. A post-implementation audit found four classes of gaps and one process gap:

1. **Token asymmetry**: `brand` and `accent` colors have full numeric 50–900 scales, but the four semantic *status* colors (`success`, `warning`, `danger`, `info`) only have `DEFAULT/-bg/-fg` aliases. This already caused a real runtime bug — a chart used `bg-success-500` which silently produced no CSS rule, so the bar rendered transparent.
2. **Missing admin CRUD pages**: The admin panel routes for `/admin/categorias` and `/admin/direcciones` either 404 or fall back to placeholders. Backend endpoints already exist (`/api/v1/categorias` is full CRUD; `/api/v1/direcciones` supports GET + soft-delete for admins).
3. **Drawer safe-area drift**: `Drawer.tsx` `DrawerFooter` is documented in its README as honoring iOS safe-area, but the `pb-[env(safe-area-inset-bottom)]` utility is missing in the component code. On iPhones in PWA mode the footer overlaps the home indicator.
4. **Visual inconsistency on Login**: The right-side marketing panel of `LoginPage.tsx` uses a raw `🍽` emoji while the rest of the app uses `lucide-react` icons. The emoji renders inconsistently across OS / browser font stacks.
5. **No regression guard**: Nothing prevents a developer from reintroducing `bg-gray-500` or `text-red-600` in feature code, despite the design-system spec forbidding it.

This change is a focused polish pass. It is intentionally scoped to gaps only — no new design language, no new primitives, no behavioural changes to existing pages.

## Goals / Non-Goals

**Goals:**
- Make the status color token surface symmetric with brand/accent (full 50–900 scales) so `bg-success-500` and friends always resolve.
- Ship two missing admin CRUD pages (`AdminCategorias`, `AdminDirecciones`) that are visually and structurally indistinguishable from `AdminProductos` / `AdminUsuarios`.
- Bring `DrawerFooter` in line with its own documented contract (iOS safe-area).
- Replace the emoji logo on Login with a `lucide-react` icon for visual consistency.
- Prevent regression of raw palette classes via static linting in CI.

**Non-Goals:**
- No backend changes. We rely on existing `/api/v1/categorias` and `/api/v1/direcciones` endpoints.
- No new primitives. Reuse `PageHeader`, `Toolbar`, `DataTable`, `PaginationBar`, `Dialog`, `Button`, `Input`, `Select`, `Badge`.
- No dark mode work. The status scales must be theme-aware (referencing the same CSS variables) but adding a dark theme is out of scope.
- No category-tree drag-and-drop reorder. Parent reassignment is a `Select` inside the edit dialog.
- No bulk operations on the admin pages — single-row CRUD only.
- No internationalization changes. All copy stays Spanish, matching existing admin pages.

## Decisions

### 1. Status color scale: light/airy scale anchored on the existing `--success`/`--warning`/`--danger`/`--info` mid-tone

Each of the four status colors gains 9 numeric CSS variables (`--success-50` through `--success-900`) on `:root` in `frontend/src/index.css`. The existing `DEFAULT` value (e.g. `--success`) maps to the `-500` step so existing usages keep working. The existing `-bg` and `-fg` aliases are preserved unchanged.

```
--success-50 .. --success-900     ← new
--success: var(--success-500)     ← existing (now an alias)
--success-bg, --success-fg        ← existing (unchanged)
```

In `tailwind.config.js` we extend `theme.extend.colors.success` (and the three siblings) from a flat object to a nested object:

```js
success: {
  DEFAULT: 'var(--success)',
  bg: 'var(--success-bg)',
  fg: 'var(--success-fg)',
  50:  'var(--success-50)',
  100: 'var(--success-100)',
  // ...
  900: 'var(--success-900)',
}
```

**Alternative considered**: Compute scales from the mid-tone at build time via a tailwind plugin. Rejected — adds a build dependency, hides the source of truth, and we already declare `brand-*` and `accent-*` as literal CSS variables. Consistency wins.

**Color values**: Pick 50/100 as washed pastel tints suitable for badge backgrounds, 500 == the existing mid-tone, 700–900 as dark variants for high-contrast text. We commit to specific RGB triples in `tasks.md`, chosen so each scale's 500 step equals the current `--success` / `--warning` / `--danger` / `--info` values, preserving visual continuity.

### 2. AdminCategorias architecture — flat DataTable with depth indicator + Dialog for create/edit

Hierarchical categories could be rendered as a true tree, but the existing admin pages use `DataTable` exclusively. For consistency and to maximize reuse:

- **Render**: flat paginated `DataTable` with columns `Nombre`, `Padre`, `Productos (count)`, `Estado`, `Acciones`. The `Nombre` column prefixes deep entries with `└` plus indent (computed from `parent_id` chain) to convey hierarchy at a glance.
- **Filter**: a `Toolbar` `Select` lets the admin filter by root category, narrowing to one branch.
- **Edit dialog**: `Dialog` with `Input` for `nombre`, `Select` for `parent_id` (lists all *other* categories, with a "(sin padre)" option). The dialog forbids selecting a descendant as parent (cycle prevention) — this is a client-side check in addition to backend validation.
- **Delete**: confirmation `Dialog`. If the category has children OR linked products, the backend returns a 409; the page surfaces the error inline. We do not attempt cascading delete from the UI.

**Alternative considered**: Render a real tree with a recursive component. Rejected for scope and consistency — every other admin CRUD uses `DataTable`. A tree-view is a candidate for a future change.

### 3. AdminDirecciones architecture — read + soft-delete only

The address management feature for clients lives in `src/features/direcciones/`. Admin access is intentionally narrow:

- **Columns**: `Usuario` (email), `Etiqueta`, `Calle`, `Ciudad`, `Provincia`, `CP`, `Creada`, `Acciones`.
- **Toolbar**: search by user email (server-side, debounced 300ms).
- **Actions**: view (opens a read-only `Dialog`), soft-delete (confirmation `Dialog`). No create or edit from admin — only the owning user can modify their own addresses.
- **Data fetching**: a new `useAdminDirecciones(params)` hook in `src/features/admin/hooks/` calling `GET /api/v1/direcciones?usuario_id=&page=&size=`. The endpoint already filters by `deleted_at IS NULL` for non-admin callers; admins see deleted entries with a visual `Badge` (`variant="danger"`, text "Eliminada"). Soft-delete calls `DELETE /api/v1/direcciones/{id}` which the backend authorizes via the ADMIN role check that already exists.

**Alternative considered**: Embedded inside the existing user-detail drawer. Rejected — the audit specifically requested a dedicated page accessible from the admin sidebar so it shows up in nav and gets its own permalink.

### 4. DrawerFooter safe-area — single-line change

Add the Tailwind utility `pb-[env(safe-area-inset-bottom)]` to the root element of `DrawerFooter`. This is non-breaking because `env(safe-area-inset-bottom)` resolves to `0px` on platforms without a safe area. Combined with the existing `p-4` we use `pb-[max(theme(spacing.4),env(safe-area-inset-bottom))]` to avoid the iOS inset from *replacing* the base padding — it should *add to* the floor of `1rem`.

### 5. Login logo icon — `UtensilsCrossed` from lucide-react

`lucide-react` is already a project dependency (per us-009). We swap the inline `🍽` for `<UtensilsCrossed className="h-12 w-12 text-brand-500" />`. We choose `UtensilsCrossed` over `ChefHat` because it appears next to the brand wordmark and reads better at small sizes; `ChefHat` looks more like an avatar and is reserved for empty states.

### 6. Lint guard — `eslint-plugin-tailwindcss` + custom `no-restricted-syntax`

We add **two** layers:

1. **`eslint-plugin-tailwindcss`** with its `classnames-order` and `enforces-shorthand` rules enabled (these are independently valuable).
2. **`no-restricted-syntax`** with a regex that matches raw palette literals (`bg-gray-\d+`, `bg-red-\d+`, `bg-blue-\d+`, `bg-green-\d+`, `bg-yellow-\d+`, `bg-orange-\d+`, `bg-purple-\d+`, `bg-pink-\d+`, `bg-indigo-\d+`, plus `text-*` and `border-*` siblings) inside JSX `className` attributes and `cn()` calls. Scope: `src/features/**/*` and `src/shared/**/*`.

The rule has severity `error` to fail CI. A short allow-list is supported via an inline `// eslint-disable-next-line no-restricted-syntax` for the (extremely rare) legitimate use case (3rd-party logos, generated SVGs).

**Alternative considered**: Use only `eslint-plugin-tailwindcss`. Rejected — that plugin enforces formatting and shorthand but does NOT block raw palette utilities. The custom rule is the only one doing the regression-prevention job called out in the proposal.

A new npm script `lint:tokens` runs ESLint with `--rule "no-restricted-syntax: error"` so the check is also runnable as a standalone command.

## Risks / Trade-offs

- **[Risk] Adding 36 new CSS variables to `:root`** → Mitigation: documented in design-system spec, ordered alphabetically next to existing tokens; one PR diff is reviewable.
- **[Risk] Tailwind's JIT bundle grows by ~12 KB** → Mitigation: Tailwind only emits utilities actually used; in practice we will use a few of these classes (mostly `bg-status-50`/`text-status-700` for charts and inline badges). Bundle impact will be <2 KB gzipped.
- **[Risk] AdminCategorias circular-parent client check could be bypassed** → Mitigation: backend validates the same constraint on PUT. UI check is a UX nicety; backend remains the source of truth.
- **[Risk] AdminDirecciones admin-only DELETE leaks no privacy if RBAC misconfigured** → Mitigation: the route in the SPA is gated by `RequireRole role="ADMIN"`. Backend authorization is independent.
- **[Risk] `eslint-plugin-tailwindcss` known to throw false positives on dynamic class concatenation** → Mitigation: configure `callees: ["cn", "clsx", "twMerge"]` so the plugin only inspects strings inside the allowed callers; everything else is ignored.
- **[Trade-off] Flat DataTable for hierarchical categories** is a deliberate compromise for consistency over fidelity. A future change may introduce a true tree view; the data layer (which keeps `parent_id`) does not need to change.
- **[Trade-off] No bulk delete on AdminDirecciones**: less powerful for the admin, but matches how the rest of the admin panel operates — single-row CRUD only.

## Migration Plan

This is additive and non-breaking. Deployment is a single PR.

1. Land token additions (Decision #1) — safe to deploy alone; no usages change.
2. Land `DrawerFooter` and Login icon fixes — purely visual.
3. Land `AdminCategorias` and `AdminDirecciones` pages + routes — opt-in via sidebar entries.
4. Land ESLint guard last, with a `--max-warnings 0` flag, so all earlier work survives the new check.

Rollback: revert the PR. No data migration, no feature flag.

## Open Questions

- Do we want a separate dark scale for status colors (e.g. distinct values when a dark theme exists), or do the same RGB triples work? **Resolution**: same triples for now; dark theme is a separate change.
- Should the AdminDirecciones page also show the count of orders that used each address? **Resolution**: out of scope — the audit asked for view + soft-delete only.
- Should `eslint-plugin-tailwindcss`'s `no-custom-classname` rule be enabled? **Resolution**: no — it requires a complete `safelist` and would conflict with our CSS-variable-based theme.
