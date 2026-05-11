import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  type AdminCategoriasParams,
  type CategoriaCreateBody,
  type CategoriaUpdateBody,
} from '../../../api/admin'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const adminCategoriasKeys = {
  all: ['admin', 'categorias'] as const,
  list: (params?: AdminCategoriasParams) =>
    [...adminCategoriasKeys.all, 'list', params] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAdminCategorias(params?: AdminCategoriasParams) {
  return useQuery({
    queryKey: adminCategoriasKeys.list(params),
    queryFn: () => listCategorias(params),
    staleTime: 1000 * 60, // 1 minute — categories are stable
  })
}

export function useCreateCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CategoriaCreateBody) => createCategoria(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCategoriasKeys.all })
      // Also invalidate catalogo categorias used in product forms
      void queryClient.invalidateQueries({ queryKey: ['catalogo', 'categorias'] })
    },
  })
}

export function useUpdateCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CategoriaUpdateBody }) =>
      updateCategoria(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCategoriasKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['catalogo', 'categorias'] })
    },
  })
}

export function useDeleteCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCategoria(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCategoriasKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['catalogo', 'categorias'] })
    },
  })
}
