import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useListarPedidos, useCambiarEstado } from '../../../hooks/usePedidos'
import {
  ESTADO_COLORS,
  ESTADO_LABELS,
  TRANSICIONES_SIGUIENTES,
  type EstadoPedido,
  type PedidoRead,
} from '../../../types/pedido'

const ESTADOS_FILTER: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EN_PREP', label: 'En preparación' },
  { value: 'EN_CAMINO', label: 'En camino' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

// ---------------------------------------------------------------------------
// PedidoAdminRow — each row is its own component so it can call useCambiarEstado
// ---------------------------------------------------------------------------
interface PedidoAdminRowProps {
  pedido: PedidoRead
  onMutated: () => void
}

function PedidoAdminRow({ pedido, onMutated }: PedidoAdminRowProps): JSX.Element {
  const mutation = useCambiarEstado(pedido.id)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')

  const siguientes = (TRANSICIONES_SIGUIENTES[pedido.estado_codigo as EstadoPedido] ?? []) as EstadoPedido[]
  const siguientesNoCancel = siguientes.filter((s) => s !== 'CANCELADO')
  const puedeCancel = siguientes.includes('CANCELADO' as EstadoPedido)

  function handleAvanzar(nuevoEstado: string) {
    mutation.mutate({ nuevo_estado: nuevoEstado }, { onSuccess: onMutated })
  }

  function handleCancelar() {
    if (!motivoCancelacion.trim()) return
    mutation.mutate(
      { nuevo_estado: 'CANCELADO', motivo: motivoCancelacion },
      {
        onSuccess: () => {
          setShowCancelModal(false)
          setMotivoCancelacion('')
          onMutated()
        },
      },
    )
  }

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        <Link to={`/pedidos/${pedido.id}`} className="text-indigo-600 hover:underline">
          #{pedido.id}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {new Date(pedido.creado_en).toLocaleDateString('es-AR')}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            ESTADO_COLORS[pedido.estado_codigo as EstadoPedido] ?? 'bg-gray-100 text-gray-800'
          }`}
        >
          {ESTADO_LABELS[pedido.estado_codigo as EstadoPedido] ?? pedido.estado_codigo}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
        ${pedido.total.toLocaleString('es-AR')}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 flex-wrap">
          {siguientesNoCancel.map((estado) => (
            <button
              key={estado}
              disabled={mutation.isPending}
              onClick={() => handleAvanzar(estado)}
              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              → {ESTADO_LABELS[estado] ?? estado}
            </button>
          ))}
          {puedeCancel && (
            <button
              disabled={mutation.isPending}
              onClick={() => setShowCancelModal(true)}
              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
        </div>

        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-sm mx-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Cancelar pedido #{pedido.id}
              </h3>
              <p className="text-sm text-gray-600 mb-3">Indicá el motivo:</p>
              <textarea
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none h-20"
                placeholder="Motivo de cancelación..."
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm"
                >
                  Volver
                </button>
                <button
                  disabled={!motivoCancelacion.trim() || mutation.isPending}
                  onClick={handleCancelar}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// GestionPedidos page
// ---------------------------------------------------------------------------
export function GestionPedidos(): JSX.Element {
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)
  const size = 20

  const { data, isLoading, isError, refetch } = useListarPedidos({
    estado: estado || undefined,
    page,
    size,
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestión de Pedidos</h1>

      {/* Filter by estado */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {ESTADOS_FILTER.map((e) => (
          <button
            key={e.value}
            onClick={() => {
              setEstado(e.value)
              setPage(1)
            }}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
              estado === e.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      )}

      {isError && (
        <p className="text-red-600 text-center py-8">Error al cargar los pedidos.</p>
      )}

      {data && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['ID', 'Fecha', 'Estado', 'Total', 'Acciones'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((pedido) => (
                  <PedidoAdminRow
                    key={pedido.id}
                    pedido={pedido}
                    onMutated={() => void refetch()}
                  />
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No hay pedidos para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {data.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
