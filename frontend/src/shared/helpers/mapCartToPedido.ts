import type { CartItem } from '../../types/cart'
import type { CrearPedidoRequest } from '../../types/pedido'

/**
 * Maps the cartStore items to a CrearPedidoRequest DTO for the API.
 *
 * @param items    - Items from cartStore
 * @param formaPago - Optional payment method code (e.g. "MERCADOPAGO")
 * @param direccionId - Optional delivery address ID
 */
export function mapCartToCrearPedidoRequest(
  items: CartItem[],
  formaPago?: string,
  direccionId?: number,
  costoEnvio: number = 0,
): CrearPedidoRequest {
  return {
    items: items.map((item) => ({
      producto_id: item.productoId,
      cantidad: item.cantidad,
      personalizacion: item.exclusiones.length > 0 ? item.exclusiones : undefined,
    })),
    forma_pago_codigo: formaPago,
    direccion_id: direccionId,
    costo_envio: costoEnvio,
  }
}
