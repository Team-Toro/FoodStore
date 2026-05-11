## ADDED Requirements

### Requirement: Design tokens SHALL be defined as CSS variables on `:root`

The frontend SHALL declare a single source of truth for all visual primitives (color, typography, spacing, radius, shadow, motion) as CSS custom properties on `:root` inside `frontend/src/index.css`. No feature code MAY hardcode hex values, RGB values, or px-based font sizes outside the spacing scale.

#### Scenario: Color tokens are declared
- **WHEN** a developer inspects `frontend/src/index.css`
- **THEN** the file declares CSS variables for `--brand-{50..900}`, `--accent-{50..900}`, `--bg`, `--bg-subtle`, `--bg-elevated`, `--fg`, `--fg-muted`, `--fg-subtle`, `--border`, `--border-strong`, `--success`, `--warning`, `--danger`, `--info`, and `--ring`

#### Scenario: Typography tokens are declared
- **WHEN** a developer inspects `frontend/src/index.css`
- **THEN** the file declares `--font-sans`, optional `--font-display`, a text-size scale `--text-xs` through `--text-5xl`, and line-height tokens `--leading-tight`, `--leading-normal`, `--leading-relaxed`

#### Scenario: Surface tokens are declared
- **WHEN** a developer inspects `frontend/src/index.css`
- **THEN** the file declares `--radius-sm|md|lg|xl|full`, `--shadow-card`, `--shadow-popover`, `--shadow-modal`, and motion tokens `--ease-out`, `--ease-in-out`, `--duration-fast|base|slow`

#### Scenario: No raw hex values in feature code
- **WHEN** a static search runs `grep -nE "#[0-9a-fA-F]{6}" frontend/src/features frontend/src/pages` after the redesign
- **THEN** no matches appear in source files (excluding SVG assets and test fixtures)

### Requirement: Tokens SHALL be exposed through `tailwind.config.js`

The Tailwind configuration SHALL extend `theme` so that the design tokens are accessible as Tailwind utility classes. Feature code SHALL prefer semantic Tailwind classes (`bg-bg-elevated`, `text-fg-muted`, `rounded-lg`, `shadow-card`) over raw palette utilities.

#### Scenario: Color tokens map to Tailwind classes
- **WHEN** a developer writes `className="bg-brand-500 text-fg"`
- **THEN** Tailwind generates CSS that resolves `bg-brand-500` to `var(--brand-500)` and `text-fg` to `var(--fg)`

#### Scenario: Semantic surface tokens are usable
- **WHEN** a developer writes `className="bg-bg-elevated border border-border rounded-lg shadow-card"`
- **THEN** all four classes are valid Tailwind utilities backed by CSS variables

#### Scenario: No raw palette utilities in redesigned components
- **WHEN** a code review inspects redesigned feature files after Phase 7
- **THEN** classes of the form `bg-gray-\d+`, `text-gray-\d+`, `bg-blue-\d+`, `bg-red-\d+`, `bg-green-\d+`, `bg-yellow-\d+`, `bg-orange-\d+`, `bg-purple-\d+` (and their `text-`/`border-` siblings) do not appear

### Requirement: Focus styles SHALL use the `--ring` token

All interactive elements (buttons, links, inputs, selects, dialogs) SHALL display a visible focus indicator using the `--ring` color token. The default browser outline MAY be suppressed only when a custom focus ring is applied.

#### Scenario: Buttons show a focus ring
- **WHEN** a user keyboard-focuses (Tab) any `Button` component
- **THEN** the button renders a visible focus ring using `var(--ring)` and meeting WCAG 2.1 AA contrast against the surrounding background

#### Scenario: Inputs show a focus ring
- **WHEN** a user focuses an `Input`, `Select`, or `Textarea`
- **THEN** the field renders a visible focus ring matching the same `--ring` token

### Requirement: Color contrast SHALL meet WCAG AA

All text-on-background combinations defined by the design tokens SHALL meet WCAG 2.1 AA contrast: at least 4.5:1 for normal text and 3:1 for large text (>= 18pt) and non-text UI components.

#### Scenario: Body text on default background passes contrast
- **WHEN** an accessibility audit measures contrast of `--fg` over `--bg`
- **THEN** the measured ratio is >= 4.5:1

#### Scenario: Muted text on subtle background passes contrast
- **WHEN** an accessibility audit measures contrast of `--fg-muted` over `--bg-subtle`
- **THEN** the measured ratio is >= 4.5:1

#### Scenario: Status badge text on badge background passes contrast
- **WHEN** an accessibility audit measures contrast of badge foreground over background for each badge variant
- **THEN** every variant meets >= 4.5:1 contrast

### Requirement: Charts SHALL be themed from design tokens

Recharts visualisations in the admin dashboard SHALL pull their colors (series, axes, grid, tooltip surfaces) from the design tokens via CSS variables. The same `useChartTheme()` hook SHALL be used by every chart so the theme is consistent.

#### Scenario: Bar chart inherits brand color
- **WHEN** the admin dashboard renders the orders-per-day bar chart
- **THEN** the bar fill comes from `var(--brand-500)` (or another mapped brand token) and not from a hardcoded hex value

#### Scenario: Axis and grid lines inherit border token
- **WHEN** any chart in the admin dashboard renders
- **THEN** the axis text uses `var(--fg-muted)` and the grid stroke uses `var(--border)`

#### Scenario: Tooltip surface uses elevated background
- **WHEN** a user hovers a chart data point
- **THEN** the tooltip is rendered with `var(--bg-elevated)` background, `var(--border)` outline, and `var(--shadow-popover)` shadow

### Requirement: Status colors SHALL expose full 50–900 numeric scales

The design system SHALL declare full numeric color scales (`-50`, `-100`, `-200`, `-300`, `-400`, `-500`, `-600`, `-700`, `-800`, `-900`) for each of the four semantic status colors `success`, `warning`, `danger`, `info`, as CSS custom properties on `:root` in `frontend/src/index.css`. The existing `--success`, `--warning`, `--danger`, `--info` DEFAULT variables SHALL be preserved and SHALL alias the corresponding `-500` step so existing usages remain valid. The existing `-bg` and `-fg` aliases SHALL be preserved unchanged. The scales SHALL be exposed through `tailwind.config.js` as nested color objects under `theme.extend.colors.success`, `warning`, `danger`, `info`, with `DEFAULT`, `bg`, `fg`, and the numeric keys all mapped to their CSS variables.

#### Scenario: All numeric status tokens are declared
- **WHEN** a developer inspects `frontend/src/index.css`
- **THEN** the file declares `--success-50` through `--success-900`, `--warning-50` through `--warning-900`, `--danger-50` through `--danger-900`, and `--info-50` through `--info-900` (40 new variables total across the four status colors)

#### Scenario: DEFAULT alias maps to the 500 step
- **WHEN** a developer compares the computed values of `var(--success)` and `var(--success-500)`
- **THEN** the two values are identical (and the same SHALL hold for `warning`, `danger`, `info`)

#### Scenario: bg and fg aliases remain valid
- **WHEN** a developer reads `frontend/src/index.css` after this change
- **THEN** `--success-bg`, `--success-fg`, `--warning-bg`, `--warning-fg`, `--danger-bg`, `--danger-fg`, `--info-bg`, `--info-fg` are still declared and produce the same colors as before

#### Scenario: Tailwind exposes numeric status utilities
- **WHEN** a developer writes `className="bg-success-500 text-success-50"`
- **THEN** Tailwind generates CSS that resolves `bg-success-500` to `var(--success-500)` and `text-success-50` to `var(--success-50)`

#### Scenario: Tailwind preserves semantic aliases
- **WHEN** a developer writes `className="bg-danger text-danger-fg"`
- **THEN** the classes still compile and `bg-danger` resolves to `var(--danger)` (i.e. `var(--danger-500)`)

### Requirement: Raw palette utilities SHALL be blocked by a lint rule

The frontend SHALL include an ESLint rule that blocks raw Tailwind palette utility classes (`bg-gray-\d+`, `bg-red-\d+`, `bg-blue-\d+`, `bg-green-\d+`, `bg-yellow-\d+`, `bg-orange-\d+`, `bg-purple-\d+`, `bg-pink-\d+`, `bg-indigo-\d+` and their `text-` and `border-` siblings) inside JSX `className` attributes and inside calls to `cn`, `clsx`, or `twMerge` under `src/features/**` and `src/shared/**`. The rule SHALL run with severity `error` so CI fails when violated. A standalone `npm run lint:tokens` script SHALL run the rule in isolation.

#### Scenario: Raw palette class triggers a lint error
- **WHEN** a developer commits `<div className="bg-gray-500" />` inside `src/features/store/CatalogPage.tsx`
- **THEN** `npm run lint` and `npm run lint:tokens` both exit non-zero and report the offending file, line, and column

#### Scenario: Tokenized class passes the lint rule
- **WHEN** a developer writes `<div className="bg-bg-elevated text-fg-muted" />`
- **THEN** the lint rule emits no warning or error

#### Scenario: Inline disable is honored for rare exceptions
- **WHEN** a developer prefixes a line with `// eslint-disable-next-line no-restricted-syntax`
- **THEN** the rule does not report on that line (used only for 3rd-party logos or generated SVGs)

#### Scenario: lint:tokens runs the rule standalone
- **WHEN** a developer runs `npm run lint:tokens`
- **THEN** ESLint runs scoped to the token guard rule against `src/features/**` and `src/shared/**` and exits 0 only if no violations exist
