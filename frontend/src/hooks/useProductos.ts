import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/axiosClient'
import type { PaginatedProductos } from '../types/producto'

export interface UseProductosParams {
  page?: number
  size?: number
  nombre?: string
  categoria_id?: number
  excluir_alergenos?: number[]
}

async function fetchProductos(params: UseProductosParams): Promise<PaginatedProductos> {
  const searchParams = new URLSearchParams()
  searchParams.set('page', String(params.page ?? 1))
  searchParams.set('size', String(params.size ?? 20))
  if (params.nombre) searchParams.set('nombre', params.nombre)
  if (params.categoria_id != null) searchParams.set('categoria_id', String(params.categoria_id))
  if (params.excluir_alergenos && params.excluir_alergenos.length > 0)
    searchParams.set('excluir_alergenos', params.excluir_alergenos.join(','))

  const res = await apiClient.get<PaginatedProductos>(`/api/v1/productos?${searchParams.toString()}`)
  return res.data
}

export function useProductos(params: UseProductosParams = {}) {
  return useQuery({
    queryKey: ['productos', params],
    queryFn: () => fetchProductos(params),
    staleTime: 1000 * 60, // 60s
  })
}
