import { useQuery } from '@tanstack/react-query'
import {
  getMetricasResumen,
  getVentas,
  getTopProductos,
  getPedidosPorEstado,
  type MetricasParams,
  type VentasParams,
  type TopProductosParams,
} from '../../../api/admin'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const metricasKeys = {
  all: ['admin', 'metricas'] as const,
  resumen: (params?: MetricasParams) => [...metricasKeys.all, 'resumen', params] as const,
  ventas: (params?: VentasParams) => [...metricasKeys.all, 'ventas', params] as const,
  topProductos: (params?: TopProductosParams) =>
    [...metricasKeys.all, 'top-productos', params] as const,
  pedidosPorEstado: (params?: MetricasParams) =>
    [...metricasKeys.all, 'pedidos-por-estado', params] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
export function useResumen(params?: MetricasParams) {
  return useQuery({
    queryKey: metricasKeys.resumen(params),
    queryFn: () => getMetricasResumen(params),
    staleTime: 1000 * 60 * 5, // 5 min
  })
}

export function useVentas(params?: VentasParams) {
  return useQuery({
    queryKey: metricasKeys.ventas(params),
    queryFn: () => getVentas(params),
    staleTime: 1000 * 60 * 5,
  })
}

export function useTopProductos(params?: TopProductosParams) {
  return useQuery({
    queryKey: metricasKeys.topProductos(params),
    queryFn: () => getTopProductos(params),
    staleTime: 1000 * 60 * 5,
  })
}

export function usePedidosPorEstado(params?: MetricasParams) {
  return useQuery({
    queryKey: metricasKeys.pedidosPorEstado(params),
    queryFn: () => getPedidosPorEstado(params),
    staleTime: 1000 * 60 * 5,
  })
}
