import { apiClient } from './axiosClient'

const BASE_PRODUCTOS = '/api/v1/productos'
const BASE_CATEGORIAS = '/api/v1/categorias'
const BASE_INGREDIENTES = '/api/v1/ingredientes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoriaFlat {
  id: number
  nombre: string
  padre_id: number | null
}

export interface IngredienteRead {
  id: number
  nombre: string
  descripcion: string | null
  es_alergeno: boolean
}

export interface IngredienteConRemovible extends IngredienteRead {
  es_removible: boolean
}

export interface ProductoDetail {
  id: number
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  precio_base: number
  stock_cantidad: number
  disponible: boolean
  creado_en: string
  categorias: CategoriaFlat[]
  ingredientes: IngredienteConRemovible[]
}

export interface ProductoCreate {
  nombre: string
  descripcion?: string | null
  imagen_url?: string | null
  precio_base: number
  stock_cantidad: number
  disponible: boolean
}

export interface ProductoUpdate {
  nombre?: string
  descripcion?: string | null
  imagen_url?: string | null
  precio_base?: number
  stock_cantidad?: number
  disponible?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CategoriaTree {
  id: number
  nombre: string
  padre_id: number | null
  hijos: CategoriaTree[]
}

function flattenTree(nodes: CategoriaTree[]): CategoriaFlat[] {
  const result: CategoriaFlat[] = []
  for (const node of nodes) {
    result.push({ id: node.id, nombre: node.nombre, padre_id: node.padre_id })
    if (node.hijos?.length) result.push(...flattenTree(node.hijos))
  }
  return result
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export async function getCategorias(): Promise<CategoriaFlat[]> {
  const resp = await apiClient.get<CategoriaTree[]>(BASE_CATEGORIAS)
  return flattenTree(resp.data)
}

export async function getIngredientes(): Promise<IngredienteRead[]> {
  const resp = await apiClient.get<{ items: IngredienteRead[] }>(BASE_INGREDIENTES, {
    params: { size: 200 },
  })
  return resp.data.items
}

export async function getProductoDetail(id: number): Promise<ProductoDetail> {
  const resp = await apiClient.get<ProductoDetail>(`${BASE_PRODUCTOS}/${id}`)
  return resp.data
}

export async function createProducto(data: ProductoCreate): Promise<ProductoDetail> {
  const resp = await apiClient.post<ProductoDetail>(BASE_PRODUCTOS, data)
  return resp.data
}

export async function updateProducto(id: number, data: ProductoUpdate): Promise<ProductoDetail> {
  const resp = await apiClient.put<ProductoDetail>(`${BASE_PRODUCTOS}/${id}`, data)
  return resp.data
}

export async function deleteProducto(id: number): Promise<void> {
  await apiClient.delete(`${BASE_PRODUCTOS}/${id}`)
}

export async function syncCategorias(id: number, categoria_ids: number[]): Promise<void> {
  await apiClient.put(`${BASE_PRODUCTOS}/${id}/categorias`, { categoria_ids })
}

export async function syncIngredientes(
  id: number,
  ingredientes: { ingrediente_id: number; es_removible: boolean }[],
): Promise<void> {
  await apiClient.put(`${BASE_PRODUCTOS}/${id}/ingredientes`, { ingredientes })
}
