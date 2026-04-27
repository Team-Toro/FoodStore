import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  cambiarEstado,
  crearPedido,
  listarPedidos,
  obtenerHistorial,
  obtenerPedido,
} from '../api/pedidosApi'
import { useCartStore } from '../app/store/cartStore'
import type { CambiarEstadoRequest, CrearPedidoRequest } from '../types/pedido'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const pedidosKeys = {
  all: ['pedidos'] as const,
  list: (params?: Record<string, unknown>) => [...pedidosKeys.all, 'list', params] as const,
  detail: (id: number) => [...pedidosKeys.all, 'detail', id] as const,
  historial: (id: number) => [...pedidosKeys.all, 'historial', id] as const,
}

// ---------------------------------------------------------------------------
// 8.1 — Listado paginado
// ---------------------------------------------------------------------------
export function useListarPedidos(params?: { estado?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: pedidosKeys.list(params),
    queryFn: () => listarPedidos(params),
  })
}

// ---------------------------------------------------------------------------
// 8.2 — Detalle de un pedido
// ---------------------------------------------------------------------------
export function useObtenerPedido(id: number) {
  return useQuery({
    queryKey: pedidosKeys.detail(id),
    queryFn: () => obtenerPedido(id),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// 8.3 — Historial de un pedido
// ---------------------------------------------------------------------------
export function useObtenerHistorial(id: number) {
  return useQuery({
    queryKey: pedidosKeys.historial(id),
    queryFn: () => obtenerHistorial(id),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// 8.4 — Crear pedido
// ---------------------------------------------------------------------------
export function useCrearPedido() {
  const navigate = useNavigate()
  const clearCart = useCartStore((s) => s.clearCart)

  return useMutation({
    mutationFn: (data: CrearPedidoRequest) => crearPedido(data),
    onSuccess: (pedido) => {
      clearCart()
      navigate(`/pedidos/${pedido.id}`)
    },
  })
}

// ---------------------------------------------------------------------------
// 8.5 — Cambiar estado
// ---------------------------------------------------------------------------
export function useCambiarEstado(pedidoId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CambiarEstadoRequest) => cambiarEstado(pedidoId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pedidosKeys.detail(pedidoId) })
      void queryClient.invalidateQueries({ queryKey: pedidosKeys.historial(pedidoId) })
      void queryClient.invalidateQueries({ queryKey: pedidosKeys.all })
    },
  })
}
