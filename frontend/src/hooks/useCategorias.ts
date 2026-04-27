import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/axiosClient'
import type { Categoria } from '../types/producto'

async function fetchCategorias(): Promise<Categoria[]> {
  const res = await apiClient.get<Categoria[]>('/api/v1/categorias')
  return res.data
}

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: fetchCategorias,
    staleTime: 1000 * 60 * 5, // 5 minutes — categories don't change often
  })
}
