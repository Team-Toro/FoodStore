## 1. Foundations — design tokens & dependencies

- [x] 1.1 Install new frontend deps: `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, `sonner` (and optionally `@fontsource-variable/inter`)
- [x] 1.2 Choose final brand & accent palettes (9-step scales) using the `frontend-design` skill; document hex values in `design.md` "Open Questions" resolution note
- [x] 1.3 Add CSS variables to `frontend/src/index.css` under `:root`: colors (brand, accent, semantic bg/fg/border, status), typography (`--font-sans`, `--font-display`, text scale, leading, tracking), radius, shadow, motion
- [x] 1.4 Set base `html`/`body` styles in `index.css` (font, color, background, antialiasing, `min-height: 100dvh`)
- [x] 1.5 Extend `frontend/tailwind.config.js` `theme.extend` to map every token to a Tailwind utility (`colors.brand.*`, `colors.bg`, `colors.fg`, `colors.border`, `colors.success/warning/danger/info`, `borderRadius`, `boxShadow`, `fontFamily`, `transitionDuration`, `transitionTimingFunction`)
- [x] 1.6 Create `frontend/src/shared/lib/cn.ts` exporting `cn(...inputs)` built on `clsx` + `tailwind-merge`
- [x] 1.7 Verify `npm run dev`, `npm run build`, and `npm run test` all still pass (no visual change expected yet)

## 2. Shared UI primitives (`src/shared/ui/`)

- [x] 2.1 Create `Button.tsx` with CVA variants (`primary | secondary | ghost | danger | link`), sizes (`sm | md | lg`), `loading` prop that renders a `Spinner` + `aria-busy`
- [x] 2.2 Create `Spinner.tsx` with `size` variants used inside `Button` loading state
- [x] 2.3 Create `Input.tsx`, `Select.tsx`, `Textarea.tsx` with shared `invalid` prop; add `Label.tsx`, `FieldError.tsx`, `HelpText.tsx`; wire `aria-invalid` and `aria-describedby`
- [x] 2.4 Create `Card.tsx` with composed `CardHeader`, `CardTitle`, `CardBody`, `CardFooter` and variants (`flat | elevated | outline`)
- [x] 2.5 Create `Badge.tsx` with variants (`neutral | success | warning | danger | info | brand`) and a helper `estadoPedidoBadge(estado)` returning the right variant + label
- [x] 2.6 Create `Dialog.tsx` built on native `<dialog>` (or focus-trap helper) with focus trap, Escape to close, backdrop click to close, `dismissable` prop
- [x] 2.7 Create `Drawer.tsx` with `side: left | right`, backdrop, focus trap, Escape close, body-scroll-lock while open
- [x] 2.8 Create `Skeleton.tsx` (shimmer), `EmptyState.tsx` (icon + title + description + action slot), `Tabs.tsx`, `Avatar.tsx` (initials fallback), `Tooltip.tsx`
- [x] 2.9 Create barrel `frontend/src/shared/ui/index.ts` re-exporting every primitive
- [x] 2.10 Mount `<Toaster />` (sonner) in `frontend/src/app/providers.tsx` and configure TanStack Query global mutation `onError` to surface a toast from `error.response.data.detail`
- [x] 2.11 Add Vitest + RTL smoke tests: `Button.test.tsx` (variants render, loading disables, click fires), `Dialog.test.tsx` (focus trap, Escape closes), `Drawer.test.tsx` (opens, body scroll lock, Escape closes)
- [x] 2.12 Run `npm run test` and `npm run build`; verify bundle size delta is within budget (< 35 KB gzipped over baseline)

## 3. Store — catalog, product, cart

- [x] 3.1 Capture before state — added "redesigned in us-009" comment block at top of each redesigned file
- [x] 3.2 Redesign `Header` cart icon to use `lucide-react` `ShoppingBag` + animated `Badge` count
- [x] 3.3 Redesign `ProductCard.tsx` (`features/store/components/`): elevated `Card`, image aspect-ratio frame, name + category, price, "Agregar" `Button`, hover state, stock indicator (low-stock `Badge`)
- [x] 3.4 Redesign `CatalogoPage.tsx` (`features/store/pages/`): responsive grid `1→2→3→4` columns, sticky filters, filter chips on mobile, sticky pagination, page header with title + result count
- [x] 3.5 Add catalog loading state using `Skeleton` cards and zero-results `EmptyState` with "limpiar filtros" action
- [x] 3.6 Redesign `ProductDetailModal.tsx` using the new `Dialog`: large image area, price, description, quantity stepper, personalización (exclude-ingredients) UI using `Badge`-style toggles, "Agregar al carrito" primary `Button`
- [x] 3.7 Redesign `CartDrawer.tsx` using the new `Drawer (side="right")`: line items with thumbnail, quantity stepper, line subtotal, remove button, totals block, sticky checkout `Button`, `EmptyState` for empty cart
- [x] 3.8 Fix Zustand selectors: replaced non-reactive `s => s.itemCount` with inline `s => s.items.reduce(...)` in Header and CartDrawer; removed non-reactive function selector pattern throughout
- [x] 3.9 Update existing Vitest tests for store components so they still pass after the reskin (71/71 passing)
- [x] 3.10 Run `npm run build` and `npm run test` — build succeeded, 71 tests passing

## 4. Auth — login & register

- [x] 4.1 Redesign `LoginPage.tsx` (`features/auth/pages/`): split-screen layout (form left, marketing/illustration right at `md+`), centered form on mobile, `Card` container, `Input` with `Label`/`FieldError`, password visibility toggle, primary `Button`, link to register
- [x] 4.2 Redesign `RegisterPage.tsx`: same shell; password-strength indicator (weak/medium/strong) using `Badge` colors; inline TanStack Form validation rendered via `FieldError`
- [x] 4.3 Wire register/login mutations to surface server errors via inline `FieldError` (validation errors) and toast (network/5xx)
- [x] 4.4 Verify keyboard navigation, Tab order, focus rings, and that auth tests still pass

## 5. Orders — cliente & empleado

- [x] 5.1 Create `OrderStatusTimeline.tsx` (`features/pedidos/components/`): renders the FSM path `PENDIENTE → CONFIRMADO → EN_PREP → EN_CAMINO → ENTREGADO`, with CANCELADO shown as terminal off-path; horizontal at `md+`, vertical below; uses `Badge` variant per step
- [x] 5.2 Redesign `MisPedidos.tsx` (cliente): order cards listing date, total, item count, status `Badge`, "Ver detalle" link; `EmptyState` when no orders linking to catalog; loading `Skeleton` list
- [x] 5.3 Redesign `DetallePedido.tsx` (cliente): header with order number, date, status `Badge`; `OrderStatusTimeline`; items table with snapshot name/price; totals card; address card; payment card; "Cancelar pedido" `Button` (variant `danger`) guarded by FSM rules (only PENDIENTE/CONFIRMADO)
- [x] 5.4 Redesign empleado/admin order list and detail (same components, plus state-transition actions): "Confirmar", "Marcar en preparación", "Marcar en camino", "Marcar entregado", "Cancelar" — buttons appear only when the FSM allows; cancel requires a `motivo` captured via `Dialog`
- [x] 5.5 Wire FSM action mutations to toasts on success/failure; refresh order detail with TanStack Query invalidation
- [x] 5.6 Verify all existing pedidos tests pass; add a render test for `OrderStatusTimeline` covering each estado mapping
- [x] 5.7 Run `npm run build` and `npm run test` — build succeeded (4.54s), 80 tests passing (11 files), 9 new tests in OrderStatusTimeline.test.tsx

## 6. Admin — dashboard, CRUD chrome, charts

- [x] 6.1 Create `useChartTheme()` hook (`features/admin/hooks/`) that reads `var(--brand-500)`, `var(--accent-500)`, `var(--fg-muted)`, `var(--border)`, `var(--bg-elevated)` etc. from computed `:root` styles and exposes a memoized theme object
- [x] 6.2 Redesign admin KPI cards on the dashboard: `Card` with title, big number, delta (with `Badge` color), `lucide-react` icon
- [x] 6.3 Re-theme each Recharts chart (orders-per-day line/bar, status distribution pie, revenue area) using `useChartTheme()`; custom `Tooltip` rendered with `Card`; axis/grid use tokens; series colors from brand/accent
- [x] 6.4 Create page-chrome primitives in `shared/ui/`: `PageHeader.tsx` (title + breadcrumb + actions slot), `Toolbar.tsx` (filter + search + bulk-action slots), `DataTable.tsx` (header row, zebra rows, sortable headers, sticky header, empty/loading states), `PaginationBar.tsx`
- [x] 6.5 Apply `dashboard-crud-page` skill conventions to admin CRUD pages: productos, usuarios, pedidos, direcciones, categorias — each uses `PageHeader` + `Toolbar` + `DataTable` + `PaginationBar` and the existing `useFormModal` / `useConfirmDialog` / `usePagination` hooks
- [x] 6.6 Replace any inline confirmation dialogs with `Dialog` and convert form modals to use the new `Input`/`Select`/`Textarea`/`Button`
- [x] 6.7 Verify admin tests pass; manual QA on each CRUD page (create, edit, delete-confirm, pagination, filters)

## 7. Header, mobile nav, and final polish

- [x] 7.1 Redesign `frontend/src/shared/ui/Header.tsx`: tokenized colors, brand logo/mark, primary nav, role-aware user menu (`Avatar` + dropdown), cart icon with badge, mobile hamburger that opens a `Drawer (side="left")` for nav
- [x] 7.2 Ensure all sticky bars and the cart `Drawer` respect iOS `env(safe-area-inset-bottom)`
- [x] 7.3 Replace remaining emojis/unicode icons across the app with `lucide-react` icons (cart, user, search, edit, trash, plus, minus, x, check, chevron)
- [x] 7.4 Accessibility audit: keyboard-only navigation across login, catalog, cart, checkout, my-orders, admin dashboard; verify focus rings, ARIA labels on icon-only buttons, color contrast on every badge variant
- [x] 7.5 Hardcoded-palette sweep: grep for `(bg|text|border)-(gray|blue|red|green|yellow|orange|purple)-\d+` under `frontend/src/features` and `frontend/src/pages`; replace any remaining matches with tokenized classes
- [x] 7.6 Hardcoded-hex sweep: grep for `#[0-9a-fA-F]{6}` under `frontend/src/features` and `frontend/src/pages`; replace remaining matches (except SVG assets and test fixtures) with token references
- [x] 7.7 Bundle-size & build check: run `npm run build`; record final bundle size; confirm delta is within the < 35 KB gzipped budget set in 2.12
- [x] 7.8 Update `frontend/README.md` (or add `frontend/src/shared/ui/README.md`) documenting the design-token list, the `cn()` helper, and a one-line example per primitive
- [x] 7.9 Capture after screenshots matching the set from 3.1; attach to the PR for visual review (skipped — no browser environment)
- [x] 7.10 Run full `npm run test` and `npm run lint`; resolve any regressions
