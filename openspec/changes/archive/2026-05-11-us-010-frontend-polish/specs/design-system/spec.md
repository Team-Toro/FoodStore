## ADDED Requirements

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
