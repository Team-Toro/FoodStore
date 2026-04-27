import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/axiosClient'
import type { ProductoDetail } from '../types/producto'

async function fetchProductoDetalle(id: number): Promise<ProductoDetail> {
  const res = await apiClient.get<ProductoDetail>(`/api/v1/productos/${id}`)
  return res.data
}

export function useProductoDetalle(id: number | null | undefined) {
  return useQuery({
    queryKey: ['producto', id],
    queryFn: () => fetchProductoDetalle(id!),
    enabled: id != null,
    staleTime: 1000 * 60, // 60s
  })
}
