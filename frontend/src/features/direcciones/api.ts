import apiClient from '../../api/axiosClient'
import type { DireccionCreate, DireccionRead, DireccionUpdate } from './types'

const BASE = '/api/v1/direcciones'

export async function getDirecciones(): Promise<DireccionRead[]> {
  const res = await apiClient.get<DireccionRead[]>(BASE)
  return res.data
}

export async function createDireccion(data: DireccionCreate): Promise<DireccionRead> {
  const res = await apiClient.post<DireccionRead>(BASE, data)
  return res.data
}

export async function updateDireccion(id: number, data: DireccionUpdate): Promise<DireccionRead> {
  const res = await apiClient.put<DireccionRead>(`${BASE}/${id}`, data)
  return res.data
}

export async function deleteDireccion(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`)
}

export async function setDireccionPredeterminada(id: number): Promise<DireccionRead> {
  const res = await apiClient.patch<DireccionRead>(`${BASE}/${id}/predeterminada`)
  return res.data
}
