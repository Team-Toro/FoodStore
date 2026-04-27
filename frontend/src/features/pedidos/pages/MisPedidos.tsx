import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useListarPedidos } from '../../../hooks/usePedidos'
import {
  ESTADO_COLORS,
  ESTADO_LABELS,
  type EstadoPedido,
} from '../../../types/pedido'

const ESTADOS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EN_PREP', label: 'En preparación' },
  { value: 'EN_CAMINO', label: 'En camino' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

export function MisPedidos(): JSX.Element {
  const [estado, setEstado] = useState<string>('')
  const [page, setPage] = useState(1)
  const size = 10

  const { data, isLoading, isError } = useListarPedidos({
    estado: estado || undefined,
    page,
    size,
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis Pedidos</h1>

      {/* Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {ESTADOS.map((e) => (
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
        <p className="text-red-600 text-center py-8">
          Error al cargar los pedidos. Por favor, intentá de nuevo.
        </p>
      )}

      {data && data.items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No tenés pedidos{estado ? ` en estado "${ESTADO_LABELS[estado as EstadoPedido]}"` : ''}.</p>
          <Link to="/catalogo" className="mt-2 text-indigo-600 hover:underline inline-block">
            ¡Explorá el catálogo!
          </Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <ul className="space-y-4">
            {data.items.map((pedido) => (
              <li key={pedido.id}>
                <Link
                  to={`/pedidos/${pedido.id}`}
                  className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">Pedido #{pedido.id}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(pedido.creado_en).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[pedido.estado_codigo as EstadoPedido] ?? 'bg-gray-100 text-gray-800'}`}
                      >
                        {ESTADO_LABELS[pedido.estado_codigo as EstadoPedido] ?? pedido.estado_codigo}
                      </span>
                      <p className="text-sm font-bold text-gray-900">
                        ${pedido.total.toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
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
