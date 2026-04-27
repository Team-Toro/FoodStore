/**
 * ResultadoPagoPage — shown when MercadoPago redirects back after checkout.
 *
 * URL pattern: /pedidos/:id/resultado?status=<approved|rejected|pending>&payment_id=<id>
 *
 * Behaviour:
 * - approved: shows success message + polls GET /api/v1/pagos/:id every 3s
 *             until mp_status === "approved" or 30s timeout, then navigates
 *             to the order detail page.
 * - rejected: shows error message + "Reintentar pago" button that calls
 *             crearPago and redirects to the new init_point.
 * - pending:  shows "Pago pendiente" message.
 */
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { usePaymentStore } from '../../../app/store/paymentStore'
import { crearPago, obtenerPago } from '../api/pagosApi'

export function ResultadoPagoPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const pedidoId = Number(id)
  const status = searchParams.get('status') ?? 'pending'
  const paymentId = searchParams.get('payment_id') ?? null

  const setPagoResult = usePaymentStore((s) => s.setPagoResult)

  // Set store on mount
  useEffect(() => {
    setPagoResult(status, paymentId)
  }, [status, paymentId, setPagoResult])

  // Poll for approved status (only when status === "approved")
  const [pollingTimeout, setPollingTimeout] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const MAX_POLLS = 10 // 10 × 3s = 30s

  const { data: pagoData } = useQuery({
    queryKey: ['pago', pedidoId],
    queryFn: () => obtenerPago(pedidoId),
    enabled: status === 'approved' && !pollingTimeout && pollCount < MAX_POLLS,
    refetchInterval: (query) => {
      if (query.state.data?.mp_status === 'approved') return false
      return 3000
    },
  })

  // Track poll count and timeout
  useEffect(() => {
    if (status !== 'approved') return
    if (pagoData?.mp_status === 'approved') {
      // Navigate to order detail after short delay
      const timer = setTimeout(() => {
        void navigate(`/pedidos/${pedidoId}`)
      }, 2000)
      return () => clearTimeout(timer)
    }
    setPollCount((c) => c + 1)
    if (pollCount >= MAX_POLLS) {
      setPollingTimeout(true)
    }
  }, [pagoData, status, pedidoId, navigate, pollCount])

  // Retry payment handler
  const [retryLoading, setRetryLoading] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  async function handleRetry(): Promise<void> {
    setRetryLoading(true)
    setRetryError(null)
    try {
      const pago = await crearPago(pedidoId)
      window.location.href = pago.init_point
    } catch {
      setRetryLoading(false)
      setRetryError('No se pudo iniciar el pago. Intentá de nuevo.')
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (status === 'approved') {
    const confirmed = pagoData?.mp_status === 'approved'
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        {confirmed ? (
          <>
            <div className="text-green-500 text-5xl">&#10003;</div>
            <h1 className="text-2xl font-bold text-gray-900">Pago aprobado</h1>
            <p className="text-gray-600">Tu pedido está siendo preparado.</p>
            <p className="text-sm text-gray-400">Redirigiendo a tu pedido...</p>
          </>
        ) : pollingTimeout ? (
          <>
            <div className="text-yellow-500 text-5xl">&#9888;</div>
            <h1 className="text-2xl font-bold text-gray-900">Pago en proceso</h1>
            <p className="text-gray-600">
              Tu pago fue aprobado pero la confirmación del pedido está demorando.
              Revisá el estado en Mis Pedidos.
            </p>
            <Link
              to={`/pedidos/${pedidoId}`}
              className="inline-block mt-2 text-indigo-600 hover:underline"
            >
              Ver pedido #{pedidoId}
            </Link>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Pago aprobado</h1>
            <p className="text-gray-600">Confirmando tu pedido...</p>
          </>
        )}
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-red-500 text-5xl">&#10007;</div>
        <h1 className="text-2xl font-bold text-gray-900">Pago rechazado</h1>
        <p className="text-gray-600">
          El pago no pudo procesarse. Podés intentarlo con otra tarjeta.
        </p>
        {retryError && (
          <p className="text-sm text-red-600">{retryError}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <button
            onClick={() => void handleRetry()}
            disabled={retryLoading}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {retryLoading ? 'Cargando...' : 'Reintentar pago'}
          </button>
          <Link
            to="/pedidos"
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Mis Pedidos
          </Link>
        </div>
      </div>
    )
  }

  // pending / in_process / default
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
      <div className="text-yellow-500 text-5xl">&#9679;</div>
      <h1 className="text-2xl font-bold text-gray-900">Pago pendiente</h1>
      <p className="text-gray-600">
        Tu pago está siendo procesado. Te notificaremos cuando se acredite.
      </p>
      <Link
        to={`/pedidos/${pedidoId}`}
        className="inline-block mt-2 text-indigo-600 hover:underline"
      >
        Ver estado del pedido
      </Link>
    </div>
  )
}
