import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listDirecciones,
  softDeleteDireccion,
  type AdminDireccionesParams,
} from '../../../api/admin'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const adminDireccionesKeys = {
  all: ['admin', 'direcciones'] as const,
  list: (params?: AdminDireccionesParams) =>
    [...adminDireccionesKeys.all, 'list', params] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAdminDirecciones(params?: AdminDireccionesParams) {
  return useQuery({
    queryKey: adminDireccionesKeys.list(params),
    queryFn: () => listDirecciones(params),
    staleTime: 1000 * 30, // 30s
  })
}

export function useSoftDeleteDireccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => softDeleteDireccion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminDireccionesKeys.all })
    },
  })
}
