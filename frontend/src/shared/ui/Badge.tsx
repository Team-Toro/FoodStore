import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-medium leading-tight',
  {
    variants: {
      variant: {
        neutral: 'bg-bg-subtle text-fg-muted border border-border',
        success: 'bg-success-bg text-success-fg',
        warning: 'bg-warning-bg text-warning-fg',
        danger:  'bg-danger-bg text-danger-fg',
        info:    'bg-info-bg text-info-fg',
        brand:   'bg-brand-50 text-brand-700',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
)
Badge.displayName = 'Badge'

// ---- Order state helper ----

export type EstadoPedido =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'EN_PREP'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'CANCELADO'

interface EstadoBadgeConfig {
  variant: NonNullable<BadgeProps['variant']>
  label: string
}

const ESTADO_BADGE_MAP: Record<EstadoPedido, EstadoBadgeConfig> = {
  PENDIENTE:  { variant: 'warning', label: 'Pendiente' },
  CONFIRMADO: { variant: 'info',    label: 'Confirmado' },
  EN_PREP:    { variant: 'brand',   label: 'En preparación' },
  EN_CAMINO:  { variant: 'brand',   label: 'En camino' },
  ENTREGADO:  { variant: 'success', label: 'Entregado' },
  CANCELADO:  { variant: 'danger',  label: 'Cancelado' },
}

/**
 * Returns the Badge variant and display label for an order estado.
 *
 * @example
 * const { variant, label } = estadoPedidoBadge('EN_PREP')
 * // variant: 'brand', label: 'En preparación'
 */
export function estadoPedidoBadge(estado: EstadoPedido): EstadoBadgeConfig {
  return ESTADO_BADGE_MAP[estado] ?? { variant: 'neutral', label: estado }
}

export { badgeVariants }
