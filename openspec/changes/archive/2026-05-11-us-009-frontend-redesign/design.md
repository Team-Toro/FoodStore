## Context

Food Store's frontend has shipped US-001..US-008 and works end-to-end (auth, catalog, cart, checkout via MercadoPago, orders, admin dashboard). Code follows Feature-Sliced Design: `app/`, `pages/`, `features/{auth,store,pedidos,admin}/`, `shared/`. The UI uses Tailwind v3 utility classes everywhere with **no theme tokens** (`tailwind.config.js` `theme.extend` is empty) and **no shared component library** (`src/shared/ui/` contains only `Header.tsx`). Forms, buttons, inputs, modals and cards are re-built ad-hoc per feature.

This change is a redesign — purely presentational. No business logic, API contracts, or state shapes are modified. The challenge is to introduce a coherent design system and a shared component library, then re-skin every feature, without breaking the existing app at any point during the rollout.

## Goals / Non-Goals

**Goals:**
- Define a single source of truth for visual tokens (color, type, spacing, radius, shadow, motion) usable from both CSS and Tailwind.
- Build a small, opinionated, accessible shared component library at `src/shared/ui/`.
- Reskin every primary user journey (catalog, cart, checkout, auth, orders, admin) so it looks production-grade.
- Keep all existing functionality, tests, and Zustand/TanStack Query data flows intact.
- Allow the rollout to happen **one phase at a time**: each merge ships a working app.

**Non-Goals:**
- No Tailwind v4 migration.
- No dark mode shipping (tokens make it possible later; only light theme is delivered).
- No animation library (Framer Motion, GSAP). CSS transitions only.
- No new state managers; no API changes; no route restructuring.
- No internationalization rework (UI strings stay Spanish as today).
- No CMS or storybook tooling — components are documented by JSDoc + colocated examples in `__examples__/` files (optional).

## Decisions

### D1. Design tokens: CSS variables + Tailwind `theme.extend`

**Decision.** Define tokens as CSS custom properties on `:root` in `index.css`, then map them into `tailwind.config.js` via `theme.extend`. Tailwind classes (`bg-brand-500`, `text-fg-muted`, `rounded-lg`, `shadow-card`) are the canonical authoring surface; CSS variables are the fallback for places where Tailwind is awkward (Recharts theming, third-party libs).

**Why not...**
- **Pure Tailwind config (no CSS vars)** → blocks future dark-mode/theming.
- **Pure CSS vars + raw CSS** → loses Tailwind's productivity and existing codebase familiarity.
- **shadcn/ui adoption wholesale** → too heavy for this scope; we borrow the *pattern* (CSS vars + CVA) but author our own primitives.

**Token surface (initial):**
- Color: `--brand-{50..900}`, `--accent-{50..900}`, `--bg`, `--bg-subtle`, `--bg-elevated`, `--fg`, `--fg-muted`, `--fg-subtle`, `--border`, `--border-strong`, `--success`, `--warning`, `--danger`, `--info`, `--ring`.
- Typography: `--font-sans` (system stack + optional Inter), `--font-display`, `--text-{xs..5xl}` step scale, `--leading-tight|normal|relaxed`, `--tracking-tight|normal|wide`.
- Spacing: Tailwind's default 4px grid plus semantic aliases (`--space-section`, `--space-gutter`).
- Radius: `--radius-sm|md|lg|xl|full` mapped to Tailwind `rounded-*`.
- Shadow: `--shadow-card`, `--shadow-popover`, `--shadow-modal`.
- Motion: `--ease-out`, `--ease-in-out`, `--duration-fast|base|slow`.

**Brand palette.** Food Store needs warmth without screaming. Proposed primary: a saturated terracotta/orange family (`#f97316`-leaning, but project-specific) named `brand`. Accent: deep neutral charcoal for contrast. Final hex values selected during tasks phase 1 with the help of the `frontend-design` and `tailwind-design-system` skills.

### D2. Component library: CVA + tailwind-merge

**Decision.** Each shared primitive lives in `src/shared/ui/<Component>.tsx`, uses `class-variance-authority` for typed variants, `tailwind-merge` (via a local `cn()` helper) to merge classes, and `clsx` for conditionals. Exports go through a barrel `src/shared/ui/index.ts`. Components accept `className`, forward refs, and spread native props.

**Why CVA.** Type-safe variants, zero runtime cost, ergonomic API, the de-facto pattern in modern Tailwind codebases. No risk of mixing classes from different states.

**Initial components (Phase 2):**
| Component | Variants | Notes |
|---|---|---|
| `Button` | `variant: primary\|secondary\|ghost\|danger\|link`, `size: sm\|md\|lg`, `loading: bool` | Wraps a spinner when `loading`. |
| `Input` | `size`, `invalid` | Pairs with `Label`, `FieldError`, `HelpText`. |
| `Select` | `size`, `invalid` | Native `<select>`, custom chevron. |
| `Textarea` | `size`, `invalid` | Auto-grow optional. |
| `Card` | `variant: flat\|elevated\|outline`, `padding` | Composed: `Card`, `CardHeader`, `CardTitle`, `CardBody`, `CardFooter`. |
| `Badge` | `variant: neutral\|success\|warning\|danger\|info\|brand`, `size` | Used for order status pills. |
| `Dialog` | controlled `open` | Built on native `<dialog>` for focus trap + ESC. |
| `Drawer` | `side: right\|left`, controlled `open` | Used by cart. Backdrop + body-scroll-lock. |
| `Skeleton` | `width`, `height`, `circle` | Animated shimmer. |
| `EmptyState` | `icon`, `title`, `description`, `action` | For empty cart, no orders, no products. |
| `Toast` (`sonner`) | provided by lib, wrapped in project Toaster | Centralised in `app/providers.tsx`. |
| `Tabs` | controlled or uncontrolled | Used in admin and pedidos detail. |
| `Avatar` | `size`, fallback initials | Header user menu. |
| `Tooltip` | trigger on hover/focus | For icon-only buttons. |
| `Spinner` | `size` | Used inside Button loading state. |

**Forms.** Existing TanStack Form usage stays. The new `Input`/`Select`/`Textarea`/`FieldError` components replace the bare `<input>` elements inside form components.

### D3. Icons: `lucide-react`

**Decision.** Adopt `lucide-react` as the single icon set. Replace emoji / unicode (`🛒`, `›`, `★`) used in headers/buttons today. Icons are tree-shaken; bundle impact ~1-2 KB per icon.

### D4. Toasts: `sonner`

**Decision.** Use `sonner` for toast notifications. Tiny (~3 KB), unstyled-by-default, plays well with Tailwind. Mount once in `app/providers.tsx`. TanStack Query global `onError` handler triggers toasts for mutations; queries surface inline errors. Replace `alert()` calls if any.

### D5. Charts: re-theme Recharts, don't replace

**Decision.** Keep Recharts. Re-theme via the `recharts` skill: pull colors from CSS variables (`getComputedStyle(document.documentElement).getPropertyValue('--brand-500')`) in a `useChartTheme()` hook so charts inherit tokens. Custom `<Tooltip>` content using the project's `Card`. Axis/grid colors use `--border` and `--fg-muted`.

### D6. Migration strategy: phased reskin, no big-bang

**Decision.** Ship the redesign in six phases (see `tasks.md`). After each phase the app is fully functional. The order is chosen so blockers come first:

1. **Tokens & base styles** — non-breaking; old classes keep working alongside new tokens.
2. **Shared UI primitives** — new components added, not yet consumed. App unchanged.
3. **Store / catalog / cart** — highest-impact surface; reskin using new components.
4. **Auth pages** — small, self-contained.
5. **Orders (cliente + empleado)** — order list, detail, status timeline.
6. **Admin** — dashboard chrome, charts, CRUD pages.

A final pass (Phase 7) handles cross-cutting polish: `Header`, mobile nav, accessibility audit, and removal of any leftover hardcoded color literals.

### D7. Code conventions for the new components

- File naming: `PascalCase.tsx` for components, `kebab-case.ts` for helpers.
- Each component exports both the component and its variants schema for testability: `export { Button, buttonVariants }`.
- `cn()` helper lives at `src/shared/lib/cn.ts` (already has `lib/` dir).
- Tailwind classes prefer **semantic tokens** (`bg-bg-elevated`, `text-fg-muted`) over raw palette (`bg-white`, `text-gray-500`). Lint rule (optional, future) can enforce this.
- No inline `style={{}}` unless dynamic (e.g., progress bar width).
- All interactive components must have visible `:focus-visible` styles using `--ring`.

### D8. Accessibility floor

- Color contrast WCAG AA (4.5:1 for text, 3:1 for UI).
- Every form field has a `<label>` association.
- `Dialog`/`Drawer` trap focus, restore on close, respect `Esc`.
- `Tooltip` content also reachable via keyboard.
- Order-status `Badge` colors are paired with text (never color-only).

### D9. Mobile-first responsiveness

- Breakpoints: Tailwind defaults (`sm 640, md 768, lg 1024, xl 1280, 2xl 1536`).
- Catalog grid: `1 → 2 → 3 → 4` columns at `sm/md/lg/xl`.
- Cart becomes full-screen drawer below `sm`.
- Header collapses to hamburger below `md`; cart icon stays visible.
- Touch targets ≥ 44×44 px.
- Sticky CTAs respect iOS `env(safe-area-inset-bottom)`.

## Risks / Trade-offs

- **[Risk] Large blast radius — almost every page touched.** → Mitigation: strict phasing per `tasks.md`; each phase merges independently and keeps the app working. Reskinning a feature is done file-by-file; tests run after each.
- **[Risk] Visual regressions hidden by lack of snapshot tests.** → Mitigation: take before/after screenshots of the catalog grid, cart drawer, checkout, dashboard, and order detail at the start of Phase 3. Manual diff during PR review.
- **[Risk] Adding dependencies (CVA, tailwind-merge, clsx, lucide-react, sonner) grows the bundle.** → Mitigation: all are tiny (sum ≲ 30 KB gzipped) and tree-shakeable. Run `vite build` after Phase 2 to measure.
- **[Risk] Hardcoded color literals leak back in.** → Mitigation: after Phase 7, grep for `bg-(gray|blue|red|green|yellow|orange|purple)-\d` and `text-(...)\-\d` and replace with tokens. Optionally add an ESLint rule in a follow-up change.
- **[Risk] Recharts re-theming via CSS vars requires reading computed styles at mount.** → Mitigation: encapsulate in `useChartTheme()` hook; memoize values; tested in admin dashboard.
- **[Trade-off] CVA + tailwind-merge add a tiny runtime cost vs. raw className strings.** → Accepted: typed variants and merge safety are worth it.
- **[Trade-off] Native `<dialog>` for `Dialog` simplifies focus-trap but has limited animation hooks.** → Accepted; CSS transitions on backdrop + content cover the need.
- **[Trade-off] No Storybook/component playground.** → Accepted to keep scope tight. We can revisit when the library outgrows ~15 components.

## Migration Plan

1. **Phase 1 — Foundations.** Add CSS variables to `index.css`, fill `tailwind.config.js theme.extend`, install `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `sonner`. Add `src/shared/lib/cn.ts`. Verify `npm run dev` and `npm run build` still work. No visual change yet.
2. **Phase 2 — UI primitives.** Implement components from the table in D2. Add `src/shared/ui/index.ts` barrel. Add `<Toaster />` to `app/providers.tsx`. Smoke tests for `Button`, `Dialog`, `Drawer`.
3. **Phase 3 — Store.** Reskin `CatalogoPage`, `ProductCard`, `ProductDetailModal`, `CartDrawer` using new primitives + tokens. Add empty/loading states. Update tests.
4. **Phase 4 — Auth.** Reskin `LoginPage`, `RegisterPage`. Add split-screen layout + inline validation styles.
5. **Phase 5 — Orders.** Reskin `MisPedidos`, `DetallePedido` (cliente + empleado views). Add `OrderStatusTimeline` component (uses FSM order: PENDIENTE→CONFIRMADO→EN_PREP→EN_CAMINO→ENTREGADO, with CANCELADO as terminal off-path).
6. **Phase 6 — Admin.** Reskin dashboard (KPI cards, Recharts theme via `useChartTheme()`), CRUD page chrome (PageHeader, Toolbar, Table, Pagination). Apply `dashboard-crud-page` skill conventions.
7. **Phase 7 — Polish.** Redesign `Header` + mobile nav, accessibility pass, grep for hardcoded palette classes, bundle-size check.

**Rollback strategy.** Each phase is its own commit (or PR). Reverting a phase rolls back its visual changes only; tokens added in Phase 1 are additive and safe to keep even if later phases are reverted.

## Open Questions

- Final brand palette hex values. Resolved during Phase 1 task `1.2 — choose brand & accent palettes` with the help of the `frontend-design` skill.
- Whether to ship a typography pairing (e.g., Inter for body + display font) or stay system-stack only. Default to system-stack with Inter loaded for headings via `@fontsource-variable/inter`; revisited in Phase 1.
- Whether `OrderStatusTimeline` should be vertical (mobile-friendly) or horizontal-on-desktop / vertical-on-mobile. Default: responsive (horizontal ≥ `md`, vertical below).
- Whether to keep emoji-style status icons or switch fully to lucide. Decision: lucide; emojis only in marketing copy.
