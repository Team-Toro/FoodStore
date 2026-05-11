import { type LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '../../../shared/ui/Card'
import { Badge } from '../../../shared/ui/Badge'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { cn } from '../../../shared/lib/cn'

export interface KpiCardProps {
  title: string
  value: string | number | null | undefined
  loading?: boolean
  /** Optional delta percentage (positive = up, negative = down) */
  delta?: number | null
  /** Lucide icon component */
  icon?: LucideIcon
  /** Extra class on the root card */
  className?: string
}

export function KpiCard({
  title,
  value,
  loading = false,
  delta,
  icon: Icon,
  className,
}: KpiCardProps): JSX.Element {
  const hasDelta = delta !== null && delta !== undefined
  const isUp = hasDelta && delta! >= 0

  return (
    <Card
      variant="elevated"
      className={cn(
        'p-5 flex flex-col gap-3 border-l-4 border-l-brand-400',
        className,
      )}
    >
      {/* Top row: title + icon */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-fg-muted leading-tight">{title}</p>
        {Icon && (
          <span className="flex-shrink-0 p-2 rounded-lg bg-brand-50">
            <Icon className="h-4 w-4 text-brand-500" aria-hidden="true" />
          </span>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <Skeleton height="h-9" width="w-28" />
      ) : (
        <p className="text-3xl font-bold text-fg leading-none tabular-nums">
          {value !== null && value !== undefined ? value : '—'}
        </p>
      )}

      {/* Delta badge */}
      {hasDelta && !loading && (
        <div>
          <Badge variant={isUp ? 'success' : 'danger'} className="gap-0.5">
            {isUp ? (
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-3 w-3" aria-hidden="true" />
            )}
            {isUp ? '+' : ''}
            {delta!.toFixed(1)}%
          </Badge>
        </div>
      )}
    </Card>
  )
}
