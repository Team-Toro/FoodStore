# FoodStore Design System

UI primitives for the FoodStore frontend. All components use CSS design tokens for colors, spacing, and motion — never hardcoded palette values.

---

## Design Tokens

All tokens are CSS custom properties defined in `src/index.css` and mapped to Tailwind utilities in `tailwind.config.js`.

### Brand & Accent

| Token | Tailwind utility | Description |
|-------|-----------------|-------------|
| `--brand-50` … `--brand-900` | `bg-brand-50` … `text-brand-900` | Amber-orange scale |
| `--accent-50` … `--accent-900` | `bg-accent-50` … `text-accent-900` | Teal scale |

### Semantic Backgrounds

| Token | Tailwind utility | Description |
|-------|-----------------|-------------|
| `--bg` | `bg-bg` | Page background |
| `--bg-subtle` | `bg-bg-subtle` | Subtle surface (cards, rows) |
| `--bg-elevated` | `bg-bg-elevated` | Elevated surface (modals, popovers) |
| `--bg-overlay` | `bg-bg-overlay` | Backdrop overlay |

### Semantic Foregrounds

| Token | Tailwind utility | Description |
|-------|-----------------|-------------|
| `--fg` | `text-fg` | Primary text |
| `--fg-muted` | `text-fg-muted` | Secondary/muted text |
| `--fg-subtle` | `text-fg-subtle` | Placeholder / disabled text |
| `--fg-on-brand` | `text-fg-on-brand` | Text on brand-colored backgrounds |

### Borders

| Token | Tailwind utility | Description |
|-------|-----------------|-------------|
| `--border` | `border-border` | Default border |
| `--border-strong` | `border-border-strong` | Emphasized border |

### Status

| Token | Tailwind utility | Description |
|-------|-----------------|-------------|
| `--success` / `--success-bg` / `--success-fg` | `text-success` / `bg-success-bg` / `text-success-fg` | Green success |
| `--warning` / `--warning-bg` / `--warning-fg` | `text-warning` / `bg-warning-bg` / `text-warning-fg` | Amber warning |
| `--danger` / `--danger-bg` / `--danger-fg` | `text-danger` / `bg-danger-bg` / `text-danger-fg` | Red danger |
| `--info` / `--info-bg` / `--info-fg` | `text-info` / `bg-info-bg` / `text-info-fg` | Blue info |

---

## `cn()` Helper

Located at `src/shared/lib/cn.ts`. Merges Tailwind class strings with deduplication (built on `clsx` + `tailwind-merge`).

```ts
import { cn } from '../lib/cn'

// Merge conditional classes without conflicts
cn('px-4 py-2', isActive && 'bg-brand-500 text-white', className)
```

---

## Primitives

### Button

```tsx
import { Button } from '@/shared/ui'

<Button variant="primary" size="md">Guardar</Button>
<Button variant="danger" size="sm" loading>Eliminando...</Button>
<Button variant="secondary" disabled>Cancelar</Button>
```

Variants: `primary | secondary | ghost | danger | link`
Sizes: `sm | md | lg`

---

### Card

```tsx
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '@/shared/ui'

<Card variant="elevated">
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardBody>Contenido aquí</CardBody>
  <CardFooter>
    <Button variant="primary">Acción</Button>
  </CardFooter>
</Card>
```

Variants: `flat | elevated | outline`

---

### Badge

```tsx
import { Badge, estadoPedidoBadge } from '@/shared/ui'

<Badge variant="success">Entregado</Badge>

// Helper for order state badges
const { variant, label } = estadoPedidoBadge('EN_CAMINO')
<Badge variant={variant}>{label}</Badge>
```

Variants: `neutral | success | warning | danger | info | brand`

---

### Dialog

```tsx
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui'

<Dialog open={open} onClose={() => setOpen(false)}>
  <DialogHeader>
    <DialogTitle>Confirmar acción</DialogTitle>
    <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
  </DialogHeader>
  <DialogFooter>
    <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
    <Button variant="danger" onClick={handleConfirm}>Eliminar</Button>
  </DialogFooter>
</Dialog>
```

Features: focus trap, Escape to close, backdrop click to close, `dismissable` prop.

---

### Drawer

```tsx
import { Drawer, DrawerHeader, DrawerTitle, DrawerBody, DrawerFooter } from '@/shared/ui'

<Drawer open={open} onClose={onClose} side="right" panelWidth="w-full max-w-sm">
  <DrawerHeader>
    <DrawerTitle>Mi panel</DrawerTitle>
  </DrawerHeader>
  <DrawerBody>Contenido scrolleable</DrawerBody>
  <DrawerFooter>
    <Button variant="primary" className="w-full">Confirmar</Button>
  </DrawerFooter>
</Drawer>
```

`DrawerFooter` automatically applies `env(safe-area-inset-bottom)` for iOS notch safety.

---

### Input

```tsx
import { Input, Label, FieldError, HelpText } from '@/shared/ui'

<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    invalid={!!errors.email}
    aria-describedby="email-error"
  />
  <FieldError id="email-error">{errors.email}</FieldError>
</div>
```

---

### PageHeader

```tsx
import { PageHeader } from '@/shared/ui'

<PageHeader
  title="Productos"
  breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Productos' }]}
  actions={<Button variant="primary">Nuevo producto</Button>}
/>
```

---

### DataTable

```tsx
import { DataTable } from '@/shared/ui'
import type { DataTableColumn } from '@/shared/ui'

const columns: DataTableColumn<Product>[] = [
  { key: 'nombre', header: 'Nombre', sortable: true },
  { key: 'precio', header: 'Precio', render: (row) => `$${row.precio}` },
]

<DataTable
  columns={columns}
  data={products}
  loading={isLoading}
  keyExtractor={(row) => row.id}
  emptyMessage="No hay productos"
/>
```

---

## ESLint Guard for Raw Palette Classes

The project enforces the use of semantic design tokens instead of raw Tailwind palette classes (e.g., `bg-gray-500`, `text-red-600`, `border-blue-300`). When `eslint-plugin-tailwindcss` is configured, a `no-restricted-syntax` rule with severity `error` blocks usage of raw palette utilities in `className` props and `cn()`/`clsx()`/`twMerge()` calls inside `src/features/**` and `src/shared/**`.

**Always use semantic tokens instead:**

| Instead of... | Use... |
|---------------|--------|
| `bg-gray-100` | `bg-bg-subtle` |
| `text-red-600` | `text-danger` |
| `border-blue-500` | `border-info` |
| `bg-green-50` | `bg-success-bg` |
| `text-yellow-700` | `text-warning-fg` |

If you genuinely need a raw palette class (e.g., a one-off illustration or third-party integration that cannot use tokens), suppress the rule for that single line only:

```tsx
// eslint-disable-next-line no-restricted-syntax
<div className="bg-amber-400">...</div>
```

Never disable the rule for an entire file or block. If you find yourself suppressing it more than once in the same component, it is a signal to add a new design token instead.
