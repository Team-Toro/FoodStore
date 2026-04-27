import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDireccion,
  deleteDireccion,
  getDirecciones,
  setDireccionPredeterminada,
  updateDireccion,
} from './api'
import type { DireccionCreate, DireccionUpdate } from './types'

const QUERY_KEY = ['direcciones'] as const

export function useDirecciones() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getDirecciones,
  })
}

export function useCreateDireccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: DireccionCreate) => createDireccion(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useUpdateDireccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DireccionUpdate }) =>
      updateDireccion(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useDeleteDireccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDireccion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useSetPredeterminada() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => setDireccionPredeterminada(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
