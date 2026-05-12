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

// ---------------------------------------------------------------------------
// Categorias (admin) — types + API
// ---------------------------------------------------------------------------

export interface CategoriaAdminRead {
  id: number
  nombre: string
  padre_id: number | null
  creado_en: string
}

export interface AdminCategoriasParams {
  nombre?: string
  padre_id?: number | null
  page?: number
  size?: number
}

export interface PaginatedCategoriasAdmin {
  items: CategoriaAdminRead[]
  total: number
  page: number
  size: number
  pages: number
}

export interface CategoriaCreateBody {
  nombre: string
  padre_id?: number | null
}

export interface CategoriaUpdateBody {
  nombre?: string
  padre_id?: number | null
}

/** Flat list of all categories from the tree endpoint (reuses existing catalogo logic) */
export async function listCategorias(
  params?: AdminCategoriasParams,
): Promise<PaginatedCategoriasAdmin> {
  // The backend /categorias endpoint returns a tree; we fetch it and flatten
  interface CategoriaTree {
    id: number
    nombre: string
    padre_id: number | null
    creado_en: string
    hijos: CategoriaTree[]
  }

  function flattenTree(nodes: CategoriaTree[]): CategoriaAdminRead[] {
    const result: CategoriaAdminRead[] = []
    for (const node of nodes) {
      result.push({ id: node.id, nombre: node.nombre, padre_id: node.padre_id, creado_en: node.creado_en })
      if (node.hijos?.length) result.push(...flattenTree(node.hijos))
    }
    return result
  }

  const resp = await apiClient.get<CategoriaTree[]>('/api/v1/categorias')
  let items = flattenTree(resp.data)

  // Client-side filter by nombre
  if (params?.nombre) {
    const q = params.nombre.toLowerCase()
    items = items.filter((c) => c.nombre.toLowerCase().includes(q))
  }
  // Client-side filter by padre_id (null = root only)
  if (params?.padre_id !== undefined) {
    if (params.padre_id === null) {
      items = items.filter((c) => c.padre_id === null)
    } else {
      items = items.filter((c) => c.padre_id === params.padre_id)
    }
  }

  const total = items.length
  const page = params?.page ?? 1
  const size = params?.size ?? 20
  const start = (page - 1) * size
  const paged = items.slice(start, start + size)
  const pages = Math.max(1, Math.ceil(total / size))

  return { items: paged, total, page, size, pages }
}

export async function createCategoria(body: CategoriaCreateBody): Promise<CategoriaAdminRead> {
  const resp = await apiClient.post<CategoriaAdminRead>('/api/v1/categorias', body)
  return resp.data
}

export async function updateCategoria(
  id: number,
  body: CategoriaUpdateBody,
): Promise<CategoriaAdminRead> {
  const resp = await apiClient.put<CategoriaAdminRead>(`/api/v1/categorias/${id}`, body)
  return resp.data
}

export async function deleteCategoria(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/categorias/${id}`)
}

// ---------------------------------------------------------------------------
// Direcciones (admin) — types + API
// ---------------------------------------------------------------------------

export interface DireccionAdminRead {
  id: number
  usuario_id: number
  linea1: string
  linea2: string | null
  ciudad: string
  codigo_postal: string | null
  referencia: string | null
  alias: string | null
  es_principal: boolean
  creado_en: string
  actualizado_en: string
  deleted_at: string | null
  usuario_email?: string
  usuario_nombre?: string
}

export interface AdminDireccionesParams {
  usuario_email?: string
  page?: number
  size?: number
}

export interface PaginatedDireccionesAdmin {
  items: DireccionAdminRead[]
  total: number
  page: number
  size: number
  pages: number
}

export async function listDirecciones(
  params?: AdminDireccionesParams,
): Promise<PaginatedDireccionesAdmin> {
  const resp = await apiClient.get<PaginatedDireccionesAdmin>(`${BASE}/direcciones`, { params })
  return resp.data
}

export async function softDeleteDireccion(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/direcciones/${id}`)
}

// ---------------------------------------------------------------------------
// Ingredientes (admin) — types + API
// ---------------------------------------------------------------------------

export interface IngredienteAdminRead {
  id: number
  nombre: string
  descripcion: string | null
  es_alergeno: boolean
  creado_en: string
}

export interface PaginatedIngredientesAdmin {
  items: IngredienteAdminRead[]
  total: number
  page: number
  size: number
  pages: number
}

export interface AdminIngredientesParams {
  es_alergeno?: boolean
  page?: number
  size?: number
}

export interface IngredienteCreateBody {
  nombre: string
  descripcion?: string | null
  es_alergeno: boolean
}

export interface IngredienteUpdateBody {
  nombre?: string
  descripcion?: string | null
  es_alergeno?: boolean
}

export async function listIngredientes(
  params?: AdminIngredientesParams,
): Promise<PaginatedIngredientesAdmin> {
  const resp = await apiClient.get<PaginatedIngredientesAdmin>('/api/v1/ingredientes', { params })
  return resp.data
}

export async function createIngrediente(body: IngredienteCreateBody): Promise<IngredienteAdminRead> {
  const resp = await apiClient.post<IngredienteAdminRead>('/api/v1/ingredientes', body)
  return resp.data
}

export async function updateIngrediente(
  id: number,
  body: IngredienteUpdateBody,
): Promise<IngredienteAdminRead> {
  const resp = await apiClient.put<IngredienteAdminRead>(`/api/v1/ingredientes/${id}`, body)
  return resp.data
}

export async function deleteIngrediente(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/ingredientes/${id}`)
}
