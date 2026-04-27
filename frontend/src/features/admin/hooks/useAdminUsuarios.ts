import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAdminUsuarios,
  patchUsuarioRoles,
  patchUsuarioEstado,
  type AdminUsuariosParams,
} from '../../../api/admin'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const adminUsuariosKeys = {
  all: ['admin', 'usuarios'] as const,
  list: (params?: AdminUsuariosParams) =>
    [...adminUsuariosKeys.all, 'list', params] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
export function useAdminUsuarios(params?: AdminUsuariosParams) {
  return useQuery({
    queryKey: adminUsuariosKeys.list(params),
    queryFn: () => getAdminUsuarios(params),
    staleTime: 1000 * 30, // 30s — users change more frequently
  })
}

export function useUpdateRoles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: string[] }) =>
      patchUsuarioRoles(id, roles),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsuariosKeys.all })
    },
  })
}

export function useUpdateEstado() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      patchUsuarioEstado(id, activo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsuariosKeys.all })
    },
  })
}
