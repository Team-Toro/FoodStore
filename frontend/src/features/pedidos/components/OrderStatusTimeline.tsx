import { CheckCircle, Clock, ChefHat, Truck, Package, XCircle } from 'lucide-react'
import { cn } from '../../../shared/lib/cn'
import { Badge, type EstadoPedido } from '../../../shared/ui'

// ---------------------------------------------------------------------------
// Config — the 5 main FSM steps in order
// ---------------------------------------------------------------------------

interface StepConfig {
  estado: EstadoPedido
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const STEPS: StepConfig[] = [
  { estado: 'PENDIENTE',  label: 'Pendiente',       Icon: Clock        },
  { estado: 'CONFIRMADO', label: 'Confirmado',       Icon: CheckCircle  },
  { estado: 'EN_PREP',    label: 'En preparación',   Icon: ChefHat      },
  { estado: 'EN_CAMINO',  label: 'En camino',        Icon: Truck        },
  { estado: 'ENTREGADO',  label: 'Entregado',        Icon: Package      },
]

// FSM order index for "reached" calculation
const STEP_ORDER: Record<EstadoPedido, number> = {
  PENDIENTE:  0,
  CONFIRMADO: 1,
  EN_PREP:    2,
  EN_CAMINO:  3,
  ENTREGADO:  4,
  CANCELADO:  -1, // terminal off-path
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OrderStatusTimelineProps {
  estadoActual: string
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrderStatusTimeline({ estadoActual, className }: OrderStatusTimelineProps): JSX.Element {
  const currentIndex = STEP_ORDER[estadoActual as EstadoPedido] ?? -1
  const isCancelled  = estadoActual === 'CANCELADO'

  return (
    <div className={cn('w-full', className)}>
      {/* ---- Main step track ---- */}
      {/*
          Desktop (md+): horizontal — steps in a row, connecting lines between them
          Mobile: vertical — steps in a column, connecting lines on the left
      */}
      <div
        className={cn(
          // Mobile: vertical flex
          'flex flex-col gap-0',
          // Desktop: horizontal flex
          'md:flex-row md:items-start md:gap-0',
        )}
        role="list"
        aria-label="Estado del pedido"
      >
        {STEPS.map((step, idx) => {
          const reached  = !isCancelled && currentIndex >= idx
          const isCurrent = !isCancelled && currentIndex === idx
          const isLast    = idx === STEPS.length - 1

          return (
            <div
              key={step.estado}
              role="listitem"
              className={cn(
                'flex items-start',
                // Mobile: row layout (icon + line left, content right)
                'flex-row gap-3',
                // Desktop: column layout (icon + line top, label below)
                'md:flex-col md:items-center md:gap-2 md:flex-1',
              )}
            >
              {/* ---- Icon + connecting line wrapper ---- */}
              <div
                className={cn(
                  // Mobile: vertical column (icon on top, line below)
                  'flex flex-col items-center',
                  // Desktop: horizontal row (icon left, line right)
                  'md:flex-row md:items-center md:w-full',
                )}
              >
                {/* Circle icon */}
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
                    reached && !isCurrent && 'bg-success border-success text-white',
                    isCurrent               && 'bg-brand-500 border-brand-500 text-white',
                    !reached && !isCurrent  && 'bg-bg-subtle border-border text-fg-muted',
                  )}
                  aria-hidden="true"
                >
                  <step.Icon className="h-4 w-4" />
                </div>

                {/* Connecting line — hidden for last step */}
                {!isLast && (
                  <div
                    className={cn(
                      // Mobile: vertical line below icon
                      'w-0.5 flex-1 min-h-[2rem] mt-0',
                      'md:w-full md:h-0.5 md:min-h-0 md:mt-0 md:flex-1 md:mx-1',
                      reached && !isCurrent
                        ? 'bg-success'
                        : isCurrent
                          ? 'bg-brand-200'
                          : 'bg-border',
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* ---- Label (beside on mobile, below on desktop) ---- */}
              <div
                className={cn(
                  'pb-6 md:pb-0 md:text-center',
                )}
              >
                <span
                  className={cn(
                    'block text-xs font-medium leading-tight',
                    isCurrent  && 'text-brand-600 font-semibold',
                    reached && !isCurrent && 'text-success-fg',
                    !reached && !isCurrent && 'text-fg-muted',
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ---- CANCELADO terminal branch ---- */}
      {isCancelled && (
        <div
          className="mt-4 flex items-center gap-2 rounded-lg bg-danger-bg px-4 py-3 border border-danger-fg/20"
          role="status"
          aria-label="Pedido cancelado"
        >
          <XCircle className="h-4 w-4 text-danger-fg shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-danger-fg">Este pedido fue cancelado</span>
          <Badge
            variant="danger"
            className="ml-auto"
          >
            Cancelado
          </Badge>
        </div>
      )}
    </div>
  )
}
