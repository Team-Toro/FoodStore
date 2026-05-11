## MODIFIED Requirements

### Requirement: A `Drawer` primitive SHALL support left and right sides and lock body scroll

The library SHALL ship a `Drawer` component with `side` (`left` | `right`, default `right`) that slides in from the chosen edge, renders a backdrop, locks the document body's scroll while open, restores scroll on close, and meets the same focus-trap / Escape rules as `Dialog`. The component SHALL also expose `DrawerHeader`, `DrawerBody`, and `DrawerFooter` slots. The `DrawerFooter` SHALL honor the iOS safe-area inset at the bottom by applying `pb-[max(theme(spacing.4),env(safe-area-inset-bottom))]` so that on devices with a home indicator the footer content remains above the inset without losing its base padding on devices without one.

#### Scenario: Cart drawer opens from the right and locks scroll
- **WHEN** the cart drawer opens
- **THEN** it slides in from the right, applies `overflow: hidden` to `body` while open, and removes it on close

#### Scenario: Drawer traps focus and closes on Escape
- **WHEN** a `Drawer` is open
- **THEN** focus is trapped inside, and pressing Escape closes the drawer and restores focus

#### Scenario: DrawerFooter respects iOS safe-area
- **WHEN** a `Drawer` is rendered on a platform that reports a non-zero `env(safe-area-inset-bottom)` (e.g. an iPhone in PWA mode)
- **THEN** the bottom padding of `DrawerFooter` is at least the inset value, AND on platforms reporting `0px` the bottom padding falls back to the base `theme(spacing.4)` (1rem)

#### Scenario: DrawerFooter base padding is preserved
- **WHEN** a `Drawer` is rendered on a platform without a safe area (e.g. desktop browser)
- **THEN** the computed bottom padding of `DrawerFooter` is exactly `1rem` (the base `spacing.4` value)

## ADDED Requirements

### Requirement: UI iconography SHALL use `lucide-react` consistently

All visual icons in feature pages and the shared primitive library SHALL be sourced from `lucide-react`. Raw emoji characters SHALL NOT be used as decorative icons or logos in feature code under `src/features/**` and `src/shared/**`. Emoji MAY still appear inside user-generated content (product names, address labels, etc.).

#### Scenario: LoginPage marketing panel uses a lucide icon
- **WHEN** the `LoginPage` renders its right-side marketing panel
- **THEN** the logo/icon position renders a `lucide-react` icon (`UtensilsCrossed` or `ChefHat`), not a raw emoji character

#### Scenario: No raw emoji icons in feature code
- **WHEN** a static search runs for cuisine-related emoji glyphs (`🍽`, `🍔`, `🍕`, `🍴`, `🥘`, `🍳`) inside JSX text or attribute values under `src/features/**` and `src/shared/**`
- **THEN** zero matches are returned in source files (excluding test fixtures, mock data, and seed scripts)
