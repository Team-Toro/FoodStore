## ADDED Requirements

### Requirement: Shared primitives SHALL live under `src/shared/ui/`

The frontend SHALL expose a shared component library at `frontend/src/shared/ui/`. Every primitive SHALL be a single file `<PascalCase>.tsx`, SHALL forward refs where appropriate, SHALL accept a `className` prop merged via the project `cn()` helper, and SHALL be re-exported from a barrel `frontend/src/shared/ui/index.ts`.

#### Scenario: Library exposes a barrel
- **WHEN** a developer imports from `@/shared/ui` (or its relative equivalent)
- **THEN** the barrel `frontend/src/shared/ui/index.ts` re-exports every primitive in the library

#### Scenario: Components forward refs and merge classNames
- **WHEN** a developer passes a `ref` and a custom `className` to any primitive
- **THEN** the ref is attached to the underlying DOM element and the className is merged with the component's internal classes via `cn()` (tailwind-merge) without conflict

### Requirement: A `Button` primitive SHALL provide typed variants

The library SHALL ship a `Button` component with typed variants for `variant` (`primary`, `secondary`, `ghost`, `danger`, `link`), `size` (`sm`, `md`, `lg`), and `loading` (boolean). When `loading` is true the button SHALL render a `Spinner`, be disabled, and announce loading state to assistive technology via `aria-busy`.

#### Scenario: Primary button renders with brand background
- **WHEN** a developer renders `<Button variant="primary">Save</Button>`
- **THEN** the button uses `--brand-500` (or its mapped Tailwind class) for background and white foreground

#### Scenario: Loading state disables the button and shows a spinner
- **WHEN** a developer renders `<Button loading>Save</Button>`
- **THEN** the button has `disabled` set, contains a `Spinner`, and has `aria-busy="true"`

### Requirement: Form primitives SHALL support an invalid state

The library SHALL ship `Input`, `Select`, and `Textarea` primitives that all accept a boolean `invalid` prop. When `invalid` is true the field SHALL render with `--danger` border color and the associated `FieldError` text SHALL be displayed when provided.

#### Scenario: Invalid input shows danger border
- **WHEN** a developer renders `<Input invalid />`
- **THEN** the input border color resolves to `var(--danger)`

#### Scenario: Field error message is announced
- **WHEN** a developer pairs an `Input` with a `FieldError` and the field is invalid
- **THEN** the field has `aria-invalid="true"` and `aria-describedby` references the error element

### Requirement: A `Dialog` primitive SHALL trap focus and respect Escape

The library SHALL ship a `Dialog` component that, when open, traps keyboard focus inside its content, restores focus to the previously focused element on close, and closes when the user presses Escape. The backdrop click SHALL also close the dialog unless `dismissable={false}` is set.

#### Scenario: Tab key stays inside an open dialog
- **WHEN** a `Dialog` is open and a user presses Tab repeatedly
- **THEN** keyboard focus cycles only between focusable elements inside the dialog

#### Scenario: Escape closes the dialog
- **WHEN** a `Dialog` is open and a user presses the Escape key
- **THEN** the dialog closes and focus returns to the element that opened it

#### Scenario: Backdrop click closes a dismissable dialog
- **WHEN** a `Dialog` is open with `dismissable` (default true) and a user clicks the backdrop
- **THEN** the dialog closes

### Requirement: A `Drawer` primitive SHALL support left and right sides and lock body scroll

The library SHALL ship a `Drawer` component with `side` (`left` | `right`, default `right`) that slides in from the chosen edge, renders a backdrop, locks the document body's scroll while open, restores scroll on close, and meets the same focus-trap / Escape rules as `Dialog`.

#### Scenario: Cart drawer opens from the right and locks scroll
- **WHEN** the cart drawer opens
- **THEN** it slides in from the right, applies `overflow: hidden` to `body` while open, and removes it on close

#### Scenario: Drawer traps focus and closes on Escape
- **WHEN** a `Drawer` is open
- **THEN** focus is trapped inside, and pressing Escape closes the drawer and restores focus

### Requirement: An `EmptyState` primitive SHALL be used wherever a collection is empty

The library SHALL ship an `EmptyState` component accepting `icon`, `title`, `description`, and an optional `action` slot. Catalog, cart, order list, address list, and admin tables SHALL render `EmptyState` (not bare text) when their collection is empty.

#### Scenario: Empty cart renders EmptyState
- **WHEN** the cart drawer is opened with zero items
- **THEN** it renders an `EmptyState` with a cart icon, a Spanish title ("Tu carrito está vacío"), a short description, and a primary action that links to the catalog

#### Scenario: No orders renders EmptyState
- **WHEN** the cliente `MisPedidos` page loads and the user has zero orders
- **THEN** it renders an `EmptyState` with an order icon, a title, a description, and a primary action linking to the catalog

#### Scenario: Catalog with zero results renders EmptyState
- **WHEN** the catalog page is rendered with filters that match no products
- **THEN** it renders an `EmptyState` with a search/filter icon, a title indicating no results, and an action to clear filters

### Requirement: A `Badge` primitive SHALL render order status pills

The library SHALL ship a `Badge` component with `variant` covering `neutral`, `success`, `warning`, `danger`, `info`, and `brand`. Order status SHALL use `Badge` with a stable mapping from each `EstadoPedido` to a variant. The badge SHALL always include the status text (color is never the sole carrier of meaning).

#### Scenario: PENDIENTE renders as warning
- **WHEN** an order with status `PENDIENTE` is displayed
- **THEN** the status badge uses the `warning` variant and shows the text "Pendiente"

#### Scenario: ENTREGADO renders as success
- **WHEN** an order with status `ENTREGADO` is displayed
- **THEN** the status badge uses the `success` variant and shows the text "Entregado"

#### Scenario: CANCELADO renders as danger
- **WHEN** an order with status `CANCELADO` is displayed
- **THEN** the status badge uses the `danger` variant and shows the text "Cancelado"

### Requirement: Toasts SHALL be wired to TanStack Query errors

A single `Toaster` (sonner) SHALL be mounted in `app/providers.tsx`. The TanStack Query client SHALL be configured with a global mutation error handler that surfaces user-friendly toasts for failed mutations. Query errors SHALL still be presented inline by the consuming feature; toasts SHALL NOT replace inline error UI for queries.

#### Scenario: Failed mutation triggers a toast
- **WHEN** a mutation (e.g., place order, cancel order, login) fails with a 4xx or 5xx response
- **THEN** a `sonner` toast appears with a translated error message derived from the response `detail` field

#### Scenario: Toaster is mounted once
- **WHEN** the application boots
- **THEN** exactly one `<Toaster />` is mounted, inside `app/providers.tsx`

### Requirement: Smoke tests SHALL cover critical primitives

The redesign SHALL include Vitest + React Testing Library smoke tests for at least `Button` (variants render, loading disables, click handler fires), `Dialog` (opens, traps focus, closes on Escape), and `Drawer` (opens, locks scroll, closes on Escape). These tests SHALL run as part of `npm run test` in CI.

#### Scenario: Button tests pass
- **WHEN** `npm run test` is run after Phase 2
- **THEN** the `Button` test file passes, asserting each variant renders, `loading` disables and shows a spinner, and `onClick` fires when not loading

#### Scenario: Dialog focus-trap test passes
- **WHEN** `npm run test` is run after Phase 2
- **THEN** the `Dialog` test asserts that pressing Tab inside an open dialog stays within the dialog and that Escape closes it

#### Scenario: Drawer body-scroll-lock test passes
- **WHEN** `npm run test` is run after Phase 2
- **THEN** the `Drawer` test asserts that `document.body` has `overflow: hidden` while open and the style is removed on close
