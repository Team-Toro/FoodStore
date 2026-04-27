import { useParams, Link } from 'react-router-dom'
import { useObtenerPedido } from '../../../hooks/usePedidos'
import { HistorialTimeline } from '../components/HistorialTimeline'
import {
  ESTADO_COLORS,
  ESTADO_LABELS,
  type EstadoPedido,
} from '../../../types/pedido'

export function DetallePedidoPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const pedidoId = Number(id)

  const { data: pedido, isLoading, isError } = useObtenerPedido(pedidoId)

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (isError || !pedido) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 text-lg">No se pudo cargar el pedido.</p>
        <Link to="/pedidos" className="mt-2 text-indigo-600 hover:underline inline-block">
          Volver a mis pedidos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/pedidos" className="text-sm text-indigo-600 hover:underline">
            ← Mis Pedidos
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Pedido #{pedido.id}</h1>
          <p className="text-sm text-gray-500">
            {new Date(pedido.creado_en).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${ESTADO_COLORS[pedido.estado_codigo as EstadoPedido] ?? 'bg-gray-100 text-gray-800'}`}
        >
          {ESTADO_LABELS[pedido.estado_codigo as EstadoPedido] ?? pedido.estado_codigo}
        </span>
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="font-semibold text-gray-700">Ítems del pedido</h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {pedido.items.map((item) => (
            <li key={item.id} className="px-4 py-3 flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">{item.nombre_snapshot}</p>
                <p className="text-sm text-gray-500">
                  ${item.precio_snapshot.toLocaleString('es-AR')} × {item.cantidad}
                </p>
                {item.personalizacion && item.personalizacion.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Sin ingredientes: {item.personalizacion.join(', ')}
                  </p>
                )}
              </div>
              <p className="font-semibold text-gray-900">
                ${item.subtotal.toLocaleString('es-AR')}
              </p>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 bg-gray-50 border-t space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>${(pedido.total - pedido.costo_envio).toLocaleString('es-AR')}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Envío</span>
            <span>${pedido.costo_envio.toLocaleString('es-AR')}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-1">
            <span>Total</span>
            <span>${pedido.total.toLocaleString('es-AR')}</span>
          </div>
        </div>
      </div>

      {/* Dirección */}
      {pedido.direccion_snapshot && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-700 mb-1">Dirección de entrega</h2>
          <p className="text-sm text-gray-600">{pedido.direccion_snapshot}</p>
        </div>
      )}

      {/* Historial */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-700 mb-4">Historial de estados</h2>
        <HistorialTimeline historial={pedido.historial} />
      </div>
    </div>
  )
}
