import { apiClient } from './axiosClient'

const BASE = '/api/v1/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsuarioAdminRead {
  id: number
  nombre: string
  apellido: string
  email: string
  activo: boolean
  created_at: string
  roles: string[]
  deleted_at: string | null
}

export interface PaginatedUsuariosAdmin {
  items: UsuarioAdminRead[]
  total: number
  page: number
  size: number
  pages: number
}

export interface ResumenMetricas {
  ventas_totales: number
  pedidos_totales: number
  usuarios_activos: number
  productos_activos: number
}

export interface VentasPorPeriodo {
  periodo: string
  total: number
  cantidad: number
}

export interface TopProducto {
  producto_id: number
  nombre: string
  cantidad_vendida: number
  total_vendido: number
}

export interface PedidosPorEstado {
  estado: string
  cantidad: number
}

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export interface MetricasParams {
  desde?: string
  hasta?: string
}

export interface VentasParams extends MetricasParams {
  granularidad?: 'day' | 'week' | 'month'
}

export interface TopProductosParams extends MetricasParams {
  top?: number
}

export interface AdminUsuariosParams {
  q?: string
  rol?: string
  page?: number
  size?: number
}

export interface ProductoAdminRead {
  id: number
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  precio_base: number
  stock_cantidad: number
  disponible: boolean
  creado_en: string
  eliminado_en: string | null
}

export interface PaginatedProductosAdmin {
  items: ProductoAdminRead[]
  total: number
  page: number
  size: number
  pages: number
}

export interface AdminProductosParams {
  nombre?: string
  disponible?: boolean
  incluir_eliminados?: boolean
  page?: number
  size?: number
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getMetricasResumen(params?: MetricasParams): Promise<ResumenMetricas> {
  const resp = await apiClient.get<ResumenMetricas>(`${BASE}/metricas/resumen`, { params })
  return resp.data
}

export async function getVentas(params?: VentasParams): Promise<VentasPorPeriodo[]> {
  const resp = await apiClient.get<VentasPorPeriodo[]>(`${BASE}/metricas/ventas`, { params })
  return resp.data
}

export async function getTopProductos(params?: TopProductosParams): Promise<TopProducto[]> {
  const resp = await apiClient.get<TopProducto[]>(`${BASE}/metricas/productos-top`, { params })
  return resp.data
}

export async function getPedidosPorEstado(params?: MetricasParams): Promise<PedidosPorEstado[]> {
  const resp = await apiClient.get<PedidosPorEstado[]>(`${BASE}/metricas/pedidos-por-estado`, { params })
  return resp.data
}

export async function getAdminUsuarios(params?: AdminUsuariosParams): Promise<PaginatedUsuariosAdmin> {
  const resp = await apiClient.get<PaginatedUsuariosAdmin>(`${BASE}/usuarios`, { params })
  return resp.data
}

export async function patchUsuarioRoles(id: number, roles: string[]): Promise<UsuarioAdminRead> {
  const resp = await apiClient.patch<UsuarioAdminRead>(`${BASE}/usuarios/${id}/roles`, { roles })
  return resp.data
}

export async function patchUsuarioEstado(id: number, activo: boolean): Promise<UsuarioAdminRead> {
  const resp = await apiClient.patch<UsuarioAdminRead>(`${BASE}/usuarios/${id}/estado`, { activo })
  return resp.data
}

export async function getAdminProductos(
  params?: AdminProductosParams,
): Promise<PaginatedProductosAdmin> {
  const resp = await apiClient.get<PaginatedProductosAdmin>(`${BASE}/productos`, { params })
  return resp.data
}

export async function patchProductoDisponible(
  id: number,
  disponible: boolean,
): Promise<ProductoAdminRead> {
  const resp = await apiClient.patch<ProductoAdminRead>(`/api/v1/productos/${id}/disponibilidad`, {
    disponible,
  })
  return resp.data
}
