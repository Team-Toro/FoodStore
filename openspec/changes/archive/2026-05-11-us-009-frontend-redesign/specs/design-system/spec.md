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
