## Why

The Food Store frontend (US-001 through US-008) is functionally complete but visually generic: hardcoded Tailwind utility classes everywhere, no design tokens, ad-hoc buttons/inputs/cards in every feature, minimal mobile responsiveness, and bare-bones empty/loading states. For a production-grade e-commerce experience — and to match the project's ambition declared in `docs/Descripcion.txt` — the UI needs a coherent design system, a shared component library, and a per-page visual rework that elevates catalog, checkout, orders, and the admin dashboard from "demo" to "shippable".

## What Changes

- Introduce a **design-token layer** (CSS variables + `tailwind.config.js theme.extend`) for color, typography, spacing, radius, shadow, and motion — replacing all hardcoded `bg-blue-600`/`text-gray-700` literals.
- Add a **shared UI component library** at `src/shared/ui/` built with `class-variance-authority` (CVA) and `tailwind-merge`: `Button`, `Input`, `Select`, `Textarea`, `Card`, `Badge`, `Dialog`, `Drawer`, `Skeleton`, `EmptyState`, `Toast`, `Tabs`, `Avatar`, `Tooltip`, `Spinner`.
- Redesign **`Header`** with a polished topbar (logo, primary nav, search affordance for catalog, cart badge, user menu with role-aware items, mobile hamburger).
- Redesign the **catalog** (`CatalogoPage`, `ProductCard`, `ProductDetailModal`) with a refined product grid, hover states, filters sidebar, sticky pagination, and richer detail modal with personalization UI.
- Redesign the **cart drawer** (`CartDrawer`) with proper item rows, quantity steppers, line totals, empty state, sticky checkout CTA, and slide/fade transitions.
- Redesign **auth pages** (`LoginPage`, `RegisterPage`) with a split-screen marketing/form layout, inline field validation styling, and password-strength feedback.
- Redesign **order pages** (`MisPedidos`, `DetallePedido`) with a status timeline component (FSM-aware), order cards, and an empty state.
- Redesign the **admin dashboard** with elevated KPI cards, a refined Recharts theme (project tokens, custom tooltips, legends), and consistent CRUD page chrome (page header, toolbar, table, pagination).
- Add **global UX primitives**: toast notifications wired to TanStack Query errors, consistent skeleton loaders, empty states with illustrations, and Framer-Motion-free CSS-only micro-interactions.
- Improve **mobile responsiveness** end-to-end: bottom-aware sticky bars, touch-sized hit targets (>= 44px), responsive grids, and a mobile-first navigation.
- Add **accessibility baseline**: focus rings via tokens, ARIA roles on Dialog/Drawer/Tabs, keyboard nav for menus, color-contrast WCAG AA.

Non-goals (explicitly out of scope):
- No migration to Tailwind v4. Stay on v3.
- No new state-management library. Zustand + TanStack Query remain canonical.
- No API/backend changes. No route restructuring.
- No theme switcher (light/dark) — design tokens are introduced so dark mode is *possible* later, but only the light theme ships now.

## Capabilities

### New Capabilities
- `design-system`: Design tokens (colors, typography, spacing, radius, shadow, motion) exposed as CSS variables and Tailwind theme extensions; conventions for using them; CVA usage rules.
- `ui-component-library`: Shared component library at `src/shared/ui/` with documented APIs, variants, and accessibility contracts for `Button`, `Input`, `Select`, `Textarea`, `Card`, `Badge`, `Dialog`, `Drawer`, `Skeleton`, `EmptyState`, `Toast`, `Tabs`, `Avatar`, `Tooltip`, `Spinner`.

### Modified Capabilities
<!-- The redesign is purely presentational. Existing capability specs (auth,
     pedidos, admin-dashboard, etc.) describe behavior/requirements, not UI
     chrome. Their requirements do not change, so no delta specs are required. -->

## Impact

**Affected code (frontend only):**
- `frontend/tailwind.config.js` — `theme.extend` filled with token mappings.
- `frontend/src/index.css` — adds `:root` CSS variables and base typography.
- `frontend/src/shared/ui/*` — new component library (currently only `Header.tsx`).
- `frontend/src/shared/ui/Header.tsx` — redesigned.
- `frontend/src/features/store/**` — catalog, product card, detail modal, cart drawer.
- `frontend/src/features/auth/**` — login, register pages.
- `frontend/src/features/pedidos/**` — order list, order detail.
- `frontend/src/features/admin/**` — dashboard KPIs, charts, CRUD page chrome.
- `frontend/src/app/providers.tsx` — register `Toaster` provider.

**Dependencies added (frontend):**
- `class-variance-authority` (CVA) — typed component variants.
- `tailwind-merge` — safely merging Tailwind classes.
- `clsx` — conditional classes.
- `lucide-react` — icon set (replaces ad-hoc emoji/Unicode).
- `sonner` (or equivalent lightweight toast lib) — toast notifications.

**Backend / API:** none.

**Tests:** existing Vitest + RTL tests must keep passing. New shared UI primitives get smoke tests where it makes sense (Button variants render, Dialog traps focus). No backend test changes.

**Risk:** moderate — large surface area, but the change is purely additive on the design-system side and a refactor on the feature side. Mitigation: phased rollout per `tasks.md` so each phase ships a working app.
