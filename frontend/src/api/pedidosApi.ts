import { apiClient } from './axiosClient'
import type {
  CambiarEstadoRequest,
  CrearPedidoRequest,
  HistorialRead,
  PaginatedPedidos,
  PedidoDetail,
  PedidoRead,
} from '../types/pedido'

const BASE = '/api/v1/pedidos'

export async function crearPedido(data: CrearPedidoRequest): Promise<PedidoRead> {
  const resp = await apiClient.post<PedidoRead>(BASE, data)
  return resp.data
}

export async function listarPedidos(params?: {
  estado?: string
  page?: number
  size?: number
}): Promise<PaginatedPedidos> {
  const resp = await apiClient.get<PaginatedPedidos>(BASE, { params })
  return resp.data
}

export async function obtenerPedido(id: number): Promise<PedidoDetail> {
  const resp = await apiClient.get<PedidoDetail>(`${BASE}/${id}`)
  return resp.data
}

export async function cambiarEstado(
  id: number,
  data: CambiarEstadoRequest,
): Promise<PedidoRead> {
  const resp = await apiClient.patch<PedidoRead>(`${BASE}/${id}/estado`, data)
  return resp.data
}

export async function obtenerHistorial(id: number): Promise<HistorialRead[]> {
  const resp = await apiClient.get<HistorialRead[]>(`${BASE}/${id}/historial`)
  return resp.data
}
