export interface DetallePedidoRead {
  id: number
  producto_id: number | null
  nombre_snapshot: string
  precio_snapshot: number
  cantidad: number
  subtotal: number
  personalizacion: number[] | null
}

export interface HistorialRead {
  id: number
  pedido_id: number
  estado_desde: string | null
  estado_hasta: string
  usuario_id: number | null
  observacion: string | null
  creado_en: string
}

export interface PedidoRead {
  id: number
  usuario_id: number
  estado_codigo: string
  forma_pago_codigo: string | null
  direccion_id: number | null
  total: number
  costo_envio: number
  direccion_snapshot: string | null
  creado_en: string
  actualizado_en: string
}

export interface PedidoDetail extends PedidoRead {
  items: DetallePedidoRead[]
  historial: HistorialRead[]
}

export interface PaginatedPedidos {
  items: PedidoRead[]
  total: number
  page: number
  size: number
  pages: number
}

export interface ItemPedidoRequest {
  producto_id: number
  cantidad: number
  personalizacion?: number[]
}

export interface CrearPedidoRequest {
  items: ItemPedidoRequest[]
  forma_pago_codigo?: string
  direccion_id?: number
  costo_envio?: number
}

export interface CambiarEstadoRequest {
  nuevo_estado: string
  motivo?: string
}

export type EstadoPedido =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'EN_PREP'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'CANCELADO'

export const ESTADO_LABELS: Record<EstadoPedido, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  EN_PREP: 'En preparación',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

/** FSM: for each state, which states can PEDIDOS/ADMIN transition to? */
export const TRANSICIONES_SIGUIENTES: Partial<Record<EstadoPedido, EstadoPedido[]>> = {
  PENDIENTE:  ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['EN_PREP', 'CANCELADO'],
  EN_PREP:    ['EN_CAMINO', 'CANCELADO'],
  EN_CAMINO:  ['ENTREGADO'],
  ENTREGADO:  [],
  CANCELADO:  [],
}

export const ESTADO_COLORS: Record<EstadoPedido, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  CONFIRMADO: 'bg-blue-100 text-blue-800',
  EN_PREP: 'bg-orange-100 text-orange-800',
  EN_CAMINO: 'bg-purple-100 text-purple-800',
  ENTREGADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
}
