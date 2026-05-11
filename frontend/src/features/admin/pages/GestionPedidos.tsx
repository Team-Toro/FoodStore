// redesigned in us-009
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Package, XCircle } from 'lucide-react'
import { useListarPedidos, useCambiarEstado } from '../../../hooks/usePedidos'
import {
  Badge,
  estadoPedidoBadge,
  Button,
  Card,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Skeleton,
  Textarea,
  EmptyState,
  PageHeader,
  PaginationBar,
} from '../../../shared/ui'
import { cn } from '../../../shared/lib/cn'
import {
  ESTADO_LABELS,
  TRANSICIONES_SIGUIENTES,
  type EstadoPedido,
  type PedidoRead,
} from '../../../types/pedido'

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const ESTADOS_FILTER: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EN_PREP', label: 'En preparación' },
  { value: 'EN_CAMINO', label: 'En camino' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

// ---- Label map for action buttons ----
const AVANCE_LABEL: Partial<Record<EstadoPedido, string>> = {
  CONFIRMADO: 'Confirmar',
  EN_PREP:    'En preparación',
  EN_CAMINO:  'En camino',
  ENTREGADO:  'Entregado',
}

// ---------------------------------------------------------------------------
// CancelDialog
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
    <Dialog open={open} onClose={handleClose} aria-labelledby="admin-cancel-dialog-title">
      <DialogHeader>
        <DialogTitle id="admin-cancel-dialog-title">Cancelar pedido #{pedidoId}</DialogTitle>
        <DialogDescription>
          Esta acción no se puede deshacer. Indicá el motivo para continuar.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 space-y-2">
        <label
          htmlFor="admin-motivo-cancelacion"
          className="block text-sm font-medium text-fg"
        >
          Motivo de cancelación
        </label>
        <Textarea
          id="admin-motivo-cancelacion"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Stock insuficiente, cliente solicitó cancelación..."
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
// PedidoAdminRow
// ---------------------------------------------------------------------------

interface PedidoAdminRowProps {
  pedido: PedidoRead
}

function PedidoAdminRow({ pedido }: PedidoAdminRowProps): JSX.Element {
  const mutation = useCambiarEstado(pedido.id)
  const [cancelOpen, setCancelOpen] = useState(false)

  const badgeCfg         = estadoPedidoBadge(pedido.estado_codigo as EstadoPedido)
  const siguientes       = (TRANSICIONES_SIGUIENTES[pedido.estado_codigo as EstadoPedido] ?? []) as EstadoPedido[]
  const siguientesAvance = siguientes.filter((s) => s !== 'CANCELADO')
  const puedeCancel      = siguientes.includes('CANCELADO' as EstadoPedido)

  function handleAvanzar(nuevoEstado: EstadoPedido) {
    mutation.mutate(
      { nuevo_estado: nuevoEstado },
      {
        onSuccess: () => toast.success(`Pedido #${pedido.id} → ${ESTADO_LABELS[nuevoEstado]}`),
        onError:   (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            'No se pudo cambiar el estado.'
          toast.error(msg)
        },
      },
    )
  }

  function handleCancelConfirm(motivo: string) {
    mutation.mutate(
      { nuevo_estado: 'CANCELADO', motivo },
      {
        onSuccess: () => {
          setCancelOpen(false)
          toast.success(`Pedido #${pedido.id} cancelado.`)
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

  return (
    <>
      <tr className={cn('border-b border-border transition-colors hover:bg-bg-subtle/50')}>
        {/* ID */}
        <td className="px-4 py-3 text-sm font-medium">
          <Link
            to={`/pedidos/${pedido.id}`}
            className="text-brand-600 hover:underline font-semibold"
          >
            #{pedido.id}
          </Link>
        </td>

        {/* Fecha */}
        <td className="px-4 py-3 text-sm text-fg-muted whitespace-nowrap">
          {new Date(pedido.creado_en).toLocaleDateString('es-AR', {
            day:   '2-digit',
            month: '2-digit',
            year:  'numeric',
          })}
        </td>

        {/* Estado */}
        <td className="px-4 py-3">
          <Badge variant={badgeCfg.variant}>{badgeCfg.label}</Badge>
        </td>

        {/* Total */}
        <td className="px-4 py-3 text-sm font-semibold text-fg whitespace-nowrap">
          ${pedido.total.toLocaleString('es-AR')}
        </td>

        {/* Acciones */}
        <td className="px-4 py-3">
          <div className="flex gap-2 flex-wrap items-center">
            {siguientesAvance.map((estado) => (
              <Button
                key={estado}
                size="sm"
                variant="secondary"
                disabled={mutation.isPending}
                loading={mutation.isPending && mutation.variables?.nuevo_estado === estado}
                onClick={() => handleAvanzar(estado)}
                className="text-xs"
              >
                {AVANCE_LABEL[estado] ?? ESTADO_LABELS[estado]}
              </Button>
            ))}

            {puedeCancel && (
              <Button
                size="sm"
                variant="danger"
                disabled={mutation.isPending}
                onClick={() => setCancelOpen(true)}
                className="text-xs"
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Cancelar
              </Button>
            )}
          </div>
        </td>
      </tr>

      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelConfirm}
        isPending={mutation.isPending}
        pedidoId={pedido.id}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Table skeleton
// ---------------------------------------------------------------------------

function TableSkeleton(): JSX.Element {
  return (
    <div className="space-y-2 px-4 py-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton height="h-10" width="w-12" />
          <Skeleton height="h-10" width="w-24" />
          <Skeleton height="h-10" width="w-24" />
          <Skeleton height="h-10" width="w-20" />
          <Skeleton height="h-10" className="flex-1" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// GestionPedidos page
// ---------------------------------------------------------------------------

export function GestionPedidos(): JSX.Element {
  const [estado, setEstado] = useState('')
  const [page, setPage]     = useState(1)
  const size = 20

  const { data, isLoading, isError } = useListarPedidos({
    estado: estado || undefined,
    page,
    size,
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Gestión de Pedidos"
        description="Administrá el ciclo de vida de los pedidos."
        breadcrumb={[{ label: 'Admin' }, { label: 'Pedidos' }]}
      />

      {/* ---- Filter chips ---- */}
      <div className="mb-4 flex gap-2 flex-wrap" role="group" aria-label="Filtrar por estado">
        {ESTADOS_FILTER.map((e) => (
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

      {/* ---- Loading ---- */}
      {isLoading && (
        <Card variant="elevated">
          <TableSkeleton />
        </Card>
      )}

      {/* ---- Error ---- */}
      {isError && (
        <p className="text-danger-fg text-center py-8">Error al cargar los pedidos.</p>
      )}

      {/* ---- Table ---- */}
      {!isLoading && data && (
        <>
          <Card variant="elevated">
            {data.items.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No hay pedidos para mostrar"
                description="Probá con otro filtro de estado."
                action={
                  estado ? (
                    <button
                      className="text-sm text-brand-600 hover:underline"
                      onClick={() => setEstado('')}
                    >
                      Ver todos
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-border bg-bg-subtle">
                      {['ID', 'Fecha', 'Estado', 'Total', 'Acciones'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-bg">
                    {data.items.map((pedido) => (
                      <PedidoAdminRow key={pedido.id} pedido={pedido} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ---- Pagination ---- */}
          <PaginationBar
            page={page}
            pages={data.pages}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
