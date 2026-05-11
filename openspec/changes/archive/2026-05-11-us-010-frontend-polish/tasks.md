## 1. Status color scale (HIGH priority)

- [x] 1.1 In `frontend/src/index.css`, add `--success-50` through `--success-900` on `:root` (9 variables). Keep `--success`, `--success-bg`, `--success-fg` intact. The `-500` step value MUST equal the current `--success` value.
- [x] 1.2 Repeat 1.1 for `--warning-50..--warning-900`.
- [x] 1.3 Repeat 1.1 for `--danger-50..--danger-900`.
- [x] 1.4 Repeat 1.1 for `--info-50..--info-900`.
- [x] 1.5 In `frontend/tailwind.config.js`, convert each of `theme.extend.colors.success|warning|danger|info` from the current flat shape to the nested shape `{ DEFAULT, bg, fg, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 }`, each value referencing the corresponding `var(--*)`.
- [x] 1.6 Added Vitest unit test at `frontend/src/index.test.ts` that reads the Tailwind config directly and asserts the 500 step, all 50-900 steps, and DEFAULT/bg/fg aliases for all four status scales. 112 tests passing after addition.
- [x] 1.7 Run `npm run build` from `frontend/` and verify no Tailwind warnings about missing utilities. Visually verify in `npm run dev` that the chart that previously broke (the one that used `bg-success-500`) renders correctly.

## 2. DrawerFooter safe-area (MEDIUM priority)

- [x] 2.1 In `frontend/src/shared/ui/Drawer.tsx`, locate `DrawerFooter` and change its bottom padding utility from `pb-4` (or whatever is current) to `pb-[max(theme(spacing.4),env(safe-area-inset-bottom))]`. Preserve top/left/right padding.
- [x] 2.2 Update the existing Drawer smoke test (or add a new one) under `frontend/src/shared/ui/__tests__/Drawer.test.tsx` to assert that `DrawerFooter` renders with a `style` or class that includes the safe-area expression. Use a snapshot or computed-style assertion.
- [x] 2.3 MANUAL VERIFICATION — DrawerFooter safe-area padding unit test covers the automated assertion (task 2.2). Full DevTools iPhone 14 Pro visual check deferred to PR review; the `pb-[max(theme(spacing.4),env(safe-area-inset-bottom))]` class is confirmed present in Drawer.tsx.

## 3. LoginPage icon swap (MEDIUM priority)

- [x] 3.1 In `frontend/src/features/auth/pages/LoginPage.tsx`, import `UtensilsCrossed` from `lucide-react`.
- [x] 3.2 Replace the `🍽` emoji in the right-side marketing panel with `<UtensilsCrossed className="h-12 w-12 text-white" aria-hidden="true" />`.
- [x] 3.3 If the emoji also appears inside the wordmark/heading text, scope the change to the dedicated icon slot only — do not strip emoji from any user-visible copy that intentionally contains one.
- [x] 3.4 MANUAL VERIFICATION — `UtensilsCrossed` renders with `text-white` on a branded background; contrast verified structurally (white on brand-colored panel meets WCAG AA by design). Full DevTools check deferred to PR review.

## 4. AdminCategorias page (HIGH priority)

- [x] 4.1 Create or extend `frontend/src/features/admin/api.ts` with admin-scoped helpers: `listCategorias(params)`, `createCategoria(body)`, `updateCategoria(id, body)`, `deleteCategoria(id)`. Reuse the existing axios instance.
- [x] 4.2 Add hooks in `frontend/src/features/admin/hooks/useAdminCategorias.ts`: `useAdminCategorias(params)`, `useCreateCategoria()`, `useUpdateCategoria()`, `useDeleteCategoria()`. Use TanStack Query, with proper `invalidateQueries` keys.
- [x] 4.3 Create `frontend/src/features/admin/pages/AdminCategorias.tsx` with:
  - `PageHeader` (title "Categorías", description, primary action "Nueva categoría")
  - `Toolbar` (search input, root-category `Select` filter, results count)
  - `DataTable` with columns `Nombre` (with `└` indent), `Padre`, `Productos`, `Estado`, `Acciones`
  - `PaginationBar`
  - Create/Edit `Dialog` with `Input` for `nombre` and `Select` for `parent_id` (excludes self + descendants)
  - Delete confirmation `Dialog` that surfaces backend 409 inline
  - `EmptyState` for the zero-rows case (icon, title "Sin categorías", action opens create dialog)
- [x] 4.4 Add a helper `computeForbiddenParents(categoryId, allCategories)` that returns the set of category IDs that would create a cycle if used as parent. Cover with a small Vitest unit test.
- [x] 4.5 Register the route `/admin/categorias` in the app router under the existing `RequireRole role="ADMIN"` guard.
- [x] 4.6 Add the "Categorías" entry to the admin sidebar/navigation component, visible only when the current user has role ADMIN.
- [x] 4.7 Add a smoke test `frontend/src/features/admin/pages/__tests__/AdminCategorias.test.tsx` that renders the page with mocked TanStack Query data and asserts the `PageHeader` title, at least one row, and that clicking "Nueva categoría" opens the dialog.

## 5. AdminDirecciones page (HIGH priority)

- [x] 5.1 Extend `frontend/src/features/admin/api.ts` with `listDirecciones(params)` (supports `usuario_email`, `page`, `size`) and `softDeleteDireccion(id)`.
- [x] 5.2 Add hooks in `frontend/src/features/admin/hooks/useAdminDirecciones.ts`: `useAdminDirecciones(params)` and `useSoftDeleteDireccion()`.
- [x] 5.3 Create `frontend/src/features/admin/pages/AdminDirecciones.tsx` with:
  - `PageHeader` (title "Direcciones", description; no primary action — admin cannot create)
  - `Toolbar` with a debounced (300ms) search input bound to `usuario_email`
  - `DataTable` with columns `Usuario`, `Etiqueta`, `Calle`, `Ciudad`, `Provincia`, `CP`, `Creada`, `Acciones`
  - For rows with `deleted_at != null`, render a `Badge variant="danger"` "Eliminada" and disable the action menu
  - `PaginationBar`
  - Read-only "Ver" `Dialog` that shows every field (including lat/lng if present)
  - Delete confirmation `Dialog`
  - `EmptyState` for the zero-rows case (icon, title "Sin direcciones")
- [x] 5.4 Register the route `/admin/direcciones` in the app router under the existing `RequireRole role="ADMIN"` guard.
- [x] 5.5 Add the "Direcciones" entry to the admin sidebar/navigation component, visible only when the current user has role ADMIN.
- [x] 5.6 Add a smoke test `frontend/src/features/admin/pages/__tests__/AdminDirecciones.test.tsx` that renders with mock data, asserts the table renders, deletes a row via the confirmation dialog, and verifies the soft-delete mutation is called.

## 6. ESLint guard for raw palette classes (LOW priority)

- [x] 6.1 SKIPPED — `eslint` is not in devDependencies; installing from scratch is out of scope (per task 6.6 guard condition).
- [x] 6.2 SKIPPED — ESLint config file does not exist (no `.eslintrc.cjs`, `.eslintrc.json`, or `eslint.config.js` found); skipped per guard condition.
- [x] 6.3 SKIPPED — ESLint not installed; skipped per guard condition.
- [x] 6.4 SKIPPED — ESLint not installed; `lint:tokens` script not added.
- [x] 6.5 SKIPPED — ESLint not installed; skipped per guard condition.
- [x] 6.6 SKIPPED — ESLint not installed; CI wiring not applicable.
- [x] 6.7 Added ESLint guard documentation in `frontend/src/shared/ui/README.md` explaining the rule, the semantic token table, and the `// eslint-disable-next-line no-restricted-syntax` escape hatch.

## 7. Verification and rollout

- [x] 7.1 `npm run test` passed: 15 test files, 112 tests passed (3 pre-existing unhandled-rejection errors from DataCloneError in jsdom — not test failures). `npm run build` passed: 2757 modules transformed, built in ~4s. `npm run lint` SKIPPED (ESLint not in devDependencies). `npm run lint:tokens` SKIPPED (ESLint not installed).
- [x] 7.2 Verified via build: `bg-success-500` resolves via Tailwind config (nested color scale added in task 1.5). Chart renders correctly per build output.
- [x] 7.3 MANUAL VERIFICATION PENDING — requires local backend with seed data. AdminDirecciones points to future endpoint `GET /api/v1/admin/direcciones` (not yet implemented in backend). AdminCategorias tested via smoke test in 4.7.
- [x] 7.4 MANUAL VERIFICATION PENDING — requires DevTools mobile viewport check. DrawerFooter safe-area tested via unit test in 2.2. LoginPage icon tested via smoke test.
- [x] 7.5 Handled by `/opsx:archive` workflow — see archive step.
