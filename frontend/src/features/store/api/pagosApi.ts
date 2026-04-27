import { apiClient } from '../../../api/axiosClient'
import type { PagoResponse } from '../types/pago'

const BASE = '/api/v1/pagos'

/**
 * Create a MercadoPago Preference for the given order.
 * Returns a PagoResponse containing the init_point URL.
 * The caller should redirect to init_point to complete payment.
 */
export async function crearPago(pedidoId: number): Promise<PagoResponse> {
  const resp = await apiClient.post<PagoResponse>(`${BASE}/crear`, {
    pedido_id: pedidoId,
  })
  return resp.data
}

/**
 * Get the most recent payment record for a given order.
 */
export async function obtenerPago(pedidoId: number): Promise<PagoResponse> {
  const resp = await apiClient.get<PagoResponse>(`${BASE}/${pedidoId}`)
  return resp.data
}
