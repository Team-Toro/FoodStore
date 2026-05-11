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
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { usePaymentStore } from '../../../app/store/paymentStore'
import { Button } from '../../../shared/ui/Button'
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
            <CheckCircle2 className="h-16 w-16 text-success-fg mx-auto" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-fg">Pago aprobado</h1>
            <p className="text-fg-muted">Tu pedido está siendo preparado.</p>
            <p className="text-sm text-fg-muted/60">Redirigiendo a tu pedido...</p>
          </>
        ) : pollingTimeout ? (
          <>
            <Clock className="h-16 w-16 text-warning-fg mx-auto" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-fg">Pago en proceso</h1>
            <p className="text-fg-muted">
              Tu pago fue aprobado pero la confirmación del pedido está demorando.
              Revisá el estado en Mis Pedidos.
            </p>
            <Link
              to={`/pedidos/${pedidoId}`}
              className="inline-block mt-2 text-brand-600 hover:underline focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none rounded"
            >
              Ver pedido #{pedidoId}
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 text-success-fg mx-auto animate-spin" aria-label="Confirmando pago..." />
            <h1 className="text-2xl font-bold text-fg">Pago aprobado</h1>
            <p className="text-fg-muted">Confirmando tu pedido...</p>
          </>
        )}
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <XCircle className="h-16 w-16 text-danger-fg mx-auto" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-fg">Pago rechazado</h1>
        <p className="text-fg-muted">
          El pago no pudo procesarse. Podés intentarlo con otra tarjeta.
        </p>
        {retryError && (
          <p className="text-sm text-danger-fg">{retryError}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <Button
            variant="primary"
            onClick={() => void handleRetry()}
            disabled={retryLoading}
            loading={retryLoading}
          >
            Reintentar pago
          </Button>
          <Link
            to="/pedidos"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-btn bg-bg-subtle text-fg border border-border hover:bg-bg-elevated shadow-sm transition-all duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
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
      <Clock className="h-16 w-16 text-warning-fg mx-auto" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-fg">Pago pendiente</h1>
      <p className="text-fg-muted">
        Tu pago está siendo procesado. Te notificaremos cuando se acredite.
      </p>
      <Link
        to={`/pedidos/${pedidoId}`}
        className="inline-block mt-2 text-brand-600 hover:underline focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none rounded"
      >
        Ver estado del pedido
      </Link>
    </div>
  )
}
