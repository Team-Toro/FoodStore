// redesigned in us-009
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { MapPin, CreditCard, Clock, XCircle } from 'lucide-react'
import { useObtenerPedido, useCambiarEstado } from '../../../hooks/usePedidos'
import { useMe } from '../../auth/hooks/useMe'
import {
  Badge,
  estadoPedidoBadge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Skeleton,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea,
} from '../../../shared/ui'
import { OrderStatusTimeline } from '../components/OrderStatusTimeline'
import type { EstadoPedido } from '../../../types/pedido'

// ---------------------------------------------------------------------------
// FSM helpers — client-facing cancel guard
// ---------------------------------------------------------------------------

/** Returns true if a CLIENT can cancel their own order in the given state */
function clientCanCancel(estado: string): boolean {
  return estado === 'PENDIENTE' || estado === 'CONFIRMADO'
}

// ---------------------------------------------------------------------------
// CancelDialog — captured motivo via Dialog
// ---------------------------------------------------------------------------

interface CancelDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (motivo: string) => void
  isPending: boolean
  pedidoId: number
}

function CancelDialog({ open, onClose, onConfirm, isPending, pedidoId }: CancelDialogProps): JSX.Element {
  const [motivo, setMotivo] = useState('')

  function handleConfirm() {
    if (!motivo.trim()) return
    onConfirm(motivo.trim())
  }

  function handleClose() {
    setMotivo('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} aria-labelledby="cancel-dialog-title">
      <DialogHeader>
        <DialogTitle id="cancel-dialog-title">Cancelar pedido #{pedidoId}</DialogTitle>
        <DialogDescription>
          Esta acción no se puede deshacer. Indicá el motivo para continuar.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 space-y-2">
        <label
          htmlFor="motivo-cancelacion"
          className="block text-sm font-medium text-fg"
        >
          Motivo de cancelación
        </label>
        <Textarea
          id="motivo-cancelacion"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Me equivoqué en el pedido, no lo necesito más..."
          rows={3}
          invalid={motivo.length > 0 && motivo.trim().length === 0}
        />
      </div>

      <DialogFooter>
        <Button variant="secondary" size="sm" onClick={handleClose} disabled={isPending}>
          Volver
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={!motivo.trim() || isPending}
          loading={isPending}
          onClick={handleConfirm}
        >
          Confirmar cancelación
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loading layout
// ---------------------------------------------------------------------------

function DetalleSkeleton(): JSX.Element {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton height="h-4" width="w-20" />
        <Skeleton height="h-8" width="w-48" />
        <Skeleton height="h-4" width="w-36" />
      </div>
      <Card><CardBody className="space-y-3">
        <Skeleton height="h-8" />
      </CardBody></Card>
      <Card><CardBody className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height="h-12" />
        ))}
      </CardBody></Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function DetallePedidoPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const pedidoId = Number(id)

  const { data: pedido, isLoading, isError } = useObtenerPedido(pedidoId)
  const { data: me } = useMe()
  const mutation = useCambiarEstado(pedidoId)

  const [cancelOpen, setCancelOpen] = useState(false)

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const estadoActual = pedido?.estado_codigo ?? ''
  const badgeCfg     = pedido ? estadoPedidoBadge(estadoActual as EstadoPedido) : null

  // Determine if the current user is a CLIENT (no admin/pedidos role)
  const userRoles: string[] = me?.roles ?? []
  const isClient  = !userRoles.some((r) => ['ADMIN', 'PEDIDOS', 'STOCK'].includes(r))
  const canCancel = isClient && clientCanCancel(estadoActual)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleCancelConfirm(motivo: string) {
    mutation.mutate(
      { nuevo_estado: 'CANCELADO', motivo },
      {
        onSuccess: () => {
          setCancelOpen(false)
          toast.success('Pedido cancelado correctamente.')
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            'No se pudo cancelar el pedido.'
          toast.error(msg)
        },
      },
    )
  }

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  if (isLoading) return <DetalleSkeleton />

  if (isError || !pedido) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-danger-fg text-lg font-medium">No se pudo cargar el pedido.</p>
        <Link to="/pedidos" className="mt-3 inline-block text-brand-600 hover:underline text-sm">
          ← Volver a mis pedidos
        </Link>
      </div>
    )
  }

  const subtotal = pedido.total - pedido.costo_envio

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* ---- Breadcrumb + Header ---- */}
      <div>
        <Link to="/pedidos" className="text-sm text-brand-600 hover:underline">
          ← Mis Pedidos
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-fg">Pedido #{pedido.id}</h1>
            <p className="text-sm text-fg-muted mt-0.5 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {new Date(pedido.creado_en).toLocaleDateString('es-AR', {
                day:    '2-digit',
                month:  'long',
                year:   'numeric',
                hour:   '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          {badgeCfg && (
            <Badge variant={badgeCfg.variant} className="self-start sm:self-center text-sm px-3 py-1">
              {badgeCfg.label}
            </Badge>
          )}
        </div>
      </div>

      {/* ---- Order status timeline ---- */}
      <Card variant="flat">
        <CardBody>
          <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wide mb-4">
            Estado del pedido
          </h2>
          <OrderStatusTimeline estadoActual={estadoActual} />
        </CardBody>
      </Card>

      {/* ---- Items table ---- */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Ítems del pedido</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="px-5 py-3 text-left font-medium text-fg-muted">Producto</th>
                <th className="px-5 py-3 text-right font-medium text-fg-muted">Precio unit.</th>
                <th className="px-5 py-3 text-right font-medium text-fg-muted">Cant.</th>
                <th className="px-5 py-3 text-right font-medium text-fg-muted">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pedido.items.map((item) => (
                <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-fg">{item.nombre_snapshot}</p>
                    {item.personalizacion && item.personalizacion.length > 0 && (
                      <p className="text-xs text-fg-muted mt-0.5">
                        Sin ingredientes: {item.personalizacion.join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-fg-muted">
                    ${item.precio_snapshot.toLocaleString('es-AR')}
                  </td>
                  <td className="px-5 py-3 text-right text-fg">{item.cantidad}</td>
                  <td className="px-5 py-3 text-right font-semibold text-fg">
                    ${item.subtotal.toLocaleString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---- Totals ---- */}
        <div className="border-t border-border px-5 py-4 space-y-2 bg-bg-subtle/50">
          <div className="flex justify-between text-sm text-fg-muted">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString('es-AR')}</span>
          </div>
          <div className="flex justify-between text-sm text-fg-muted">
            <span>Costo de envío</span>
            <span>${pedido.costo_envio.toLocaleString('es-AR')}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-fg border-t border-border pt-2">
            <span>Total</span>
            <span>${pedido.total.toLocaleString('es-AR')}</span>
          </div>
        </div>
      </Card>

      {/* ---- Address card ---- */}
      {pedido.direccion_snapshot && (
        <Card variant="flat">
          <CardBody>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-muted uppercase tracking-wide mb-2">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Dirección de entrega
            </h2>
            <p className="text-sm text-fg">{pedido.direccion_snapshot}</p>
          </CardBody>
        </Card>
      )}

      {/* ---- Payment card ---- */}
      {pedido.forma_pago_codigo && (
        <Card variant="flat">
          <CardBody>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-muted uppercase tracking-wide mb-2">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Forma de pago
            </h2>
            <p className="text-sm text-fg capitalize">
              {pedido.forma_pago_codigo.replace(/_/g, ' ').toLowerCase()}
            </p>
          </CardBody>
        </Card>
      )}

      {/* ---- Cancel button (CLIENT only, FSM-guarded) ---- */}
      {canCancel && (
        <div className="flex justify-end pt-2">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setCancelOpen(true)}
            disabled={mutation.isPending}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Cancelar pedido
          </Button>
        </div>
      )}

      {/* ---- Cancel dialog ---- */}
      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelConfirm}
        isPending={mutation.isPending}
        pedidoId={pedidoId}
      />
    </div>
  )
}
