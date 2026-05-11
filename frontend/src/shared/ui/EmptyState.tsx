import { type LucideIcon } from 'lucide-react'
import { cn } from '../lib/cn'

export interface EmptyStateProps {
  /** Lucide icon component to render at the top */
  icon?: LucideIcon
  /** Primary heading */
  title: string
  /** Secondary description text */
  description?: string
  /** Optional action (e.g. a Button or link) */
  action?: React.ReactNode
  /** Extra class names for the root element */
  className?: string
}

/**
 * Empty state illustration with icon, title, description, and action slot.
 *
 * @example
 * <EmptyState
 *   icon={ShoppingBag}
 *   title="Tu carrito está vacío"
 *   description="Agrega productos del catálogo para comenzar."
 *   action={<Button onClick={() => navigate('/catalogo')}>Ver catálogo</Button>}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-4 py-16 px-6',
        className
      )}
    >
      {Icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
          <Icon className="h-8 w-8 text-brand-500" aria-hidden="true" />
        </div>
      )}

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-fg">{title}</h3>
        {description && (
          <p className="text-sm text-fg-muted max-w-sm">{description}</p>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  )
}
