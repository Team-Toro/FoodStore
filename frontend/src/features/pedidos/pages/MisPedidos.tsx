// redesigned in us-009
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Package } from 'lucide-react'
import { useListarPedidos } from '../../../hooks/usePedidos'
import {
  Badge,
  estadoPedidoBadge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  EmptyState,
  Skeleton,
} from '../../../shared/ui'
// Note: Button is used in the pagination section
import { cn } from '../../../shared/lib/cn'
import type { EstadoPedido } from '../../../types/pedido'
import { ESTADO_LABELS } from '../../../types/pedido'

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

const ESTADOS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EN_PREP', label: 'En preparación' },
  { value: 'EN_CAMINO', label: 'En camino' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

// Accent bar color per estado (left border stripe on the card)
const ACCENT_BAR: Record<EstadoPedido, string> = {
  PENDIENTE:  'bg-warning-bg border-l-4 border-l-warning-fg',
  CONFIRMADO: 'bg-info-bg border-l-4 border-l-info-fg',
  EN_PREP:    'bg-brand-50 border-l-4 border-l-brand-500',
  EN_CAMINO:  'bg-brand-50 border-l-4 border-l-brand-700',
  ENTREGADO:  'bg-success-bg border-l-4 border-l-success-fg',
  CANCELADO:  'bg-danger-bg border-l-4 border-l-danger-fg',
}

// ---------------------------------------------------------------------------
// Skeleton placeholder for loading state
// ---------------------------------------------------------------------------

function OrderCardSkeleton(): JSX.Element {
  return (
    <div className="rounded-card overflow-hidden shadow-card border border-border/50 bg-bg">
      <div className="px-5 pt-5 pb-0">
        <Skeleton height="h-5" width="w-2/5" />
        <Skeleton height="h-3" width="w-1/3" className="mt-2" />
      </div>
      <div className="px-5 py-4">
        <Skeleton height="h-4" width="w-1/2" />
      </div>
      <div className="flex items-center gap-3 px-5 pb-5 pt-0">
        <Skeleton height="h-6" width="w-24" />
        <Skeleton height="h-4" width="w-16" className="ml-auto" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MisPedidos page
// ---------------------------------------------------------------------------

export function MisPedidos(): JSX.Element {
  const [estado, setEstado] = useState<string>('')
  const [page, setPage] = useState(1)
  const size = 10

  const { data, isLoading, isError } = useListarPedidos({
    estado: estado || undefined,
    page,
    size,
  })

  const label = estado ? ESTADO_LABELS[estado as EstadoPedido] ?? estado : ''

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* ---- Page heading ---- */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">Mis Pedidos</h1>
        <p className="text-sm text-fg-muted mt-1">Historial y estado de tus compras</p>
      </div>

      {/* ---- Filter chips ---- */}
      <div className="mb-6 flex gap-2 flex-wrap" role="group" aria-label="Filtrar por estado">
        {ESTADOS.map((e) => (
          <button
            key={e.value}
            onClick={() => { setEstado(e.value); setPage(1) }}
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium border transition-colors duration-base',
              estado === e.value
                ? 'bg-brand-500 text-fg-on-brand border-brand-500'
                : 'bg-bg text-fg border-border hover:bg-bg-subtle',
            )}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* ---- Loading state ---- */}
      {isLoading && (
        <ul className="space-y-4" aria-label="Cargando pedidos">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}><OrderCardSkeleton /></li>
          ))}
        </ul>
      )}

      {/* ---- Error state ---- */}
      {isError && (
        <p className="text-danger-fg text-center py-8">
          Error al cargar los pedidos. Por favor, intentá de nuevo.
        </p>
      )}

      {/* ---- Empty state ---- */}
      {!isLoading && data && data.items.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title={estado ? `No tenés pedidos en estado "${label}"` : 'Todavía no hiciste ningún pedido'}
          description={estado ? 'Probá filtrando por otro estado.' : 'Explorá el catálogo y armá tu primer pedido.'}
          action={
            !estado ? (
              <Link
                to="/catalogo"
                className="inline-flex items-center justify-center gap-2 font-medium rounded-btn h-10 px-4 text-sm bg-brand-500 text-fg-on-brand hover:bg-brand-600 active:bg-brand-700 shadow-sm hover:shadow-brand transition-all duration-base"
              >
                Ir al catálogo
              </Link>
            ) : (
              <button
                className="text-sm text-brand-600 hover:underline"
                onClick={() => setEstado('')}
              >
                Ver todos los pedidos
              </button>
            )
          }
        />
      )}

      {/* ---- Order cards list ---- */}
      {!isLoading && data && data.items.length > 0 && (
        <>
          <ul className="space-y-4">
            {data.items.map((pedido) => {
              const badgeCfg   = estadoPedidoBadge(pedido.estado_codigo as EstadoPedido)
              const accentClass = ACCENT_BAR[pedido.estado_codigo as EstadoPedido] ?? ''

              return (
                <li key={pedido.id}>
                  <Card
                    variant="elevated"
                    className={cn('overflow-hidden', accentClass)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle>Pedido #{pedido.id}</CardTitle>
                          <p className="text-xs text-fg-muted mt-0.5">
                            {new Date(pedido.creado_en).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <Badge variant={badgeCfg.variant}>{badgeCfg.label}</Badge>
                      </div>
                    </CardHeader>

                    <CardBody className="py-3">
                      <div className="flex items-center gap-4 text-sm text-fg-muted">
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" aria-hidden="true" />
                          {/* items count not available in PedidoRead list, show total only */}
                          <span className="font-semibold text-fg text-base">
                            ${pedido.total.toLocaleString('es-AR')}
                          </span>
                        </span>
                        <span className="text-xs text-fg-muted">
                          Envío: ${pedido.costo_envio.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </CardBody>

                    <CardFooter className="justify-end">
                      <Link
                        to={`/pedidos/${pedido.id}`}
                        className="text-sm font-medium text-brand-600 hover:underline hover:text-brand-700 active:text-brand-800"
                      >
                        Ver detalle →
                      </Link>
                    </CardFooter>
                  </Card>
                </li>
              )
            })}
          </ul>

          {/* ---- Pagination ---- */}
          {data.pages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-fg-muted">
                {page} / {data.pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
