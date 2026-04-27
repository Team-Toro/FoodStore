import apiClient from '../../../api/axiosClient'
import type { LoginRequest, RegisterRequest, TokenResponse, User } from '../types'

const AUTH_BASE = '/api/v1/auth'

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>(`${AUTH_BASE}/register`, data)
  return res.data
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>(`${AUTH_BASE}/login`, data)
  return res.data
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>(`${AUTH_BASE}/refresh`, {
    refresh_token: refreshToken,
  })
  return res.data
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post(`${AUTH_BASE}/logout`, { refresh_token: refreshToken })
}

export async function me(): Promise<User> {
  const res = await apiClient.get<User>(`${AUTH_BASE}/me`)
  return res.data
}

export async function updatePerfil(data: {
  nombre?: string
  apellido?: string
  telefono?: string
}): Promise<User> {
  const res = await apiClient.put<User>(`${AUTH_BASE}/perfil`, data)
  return res.data
}

export async function changePassword(data: {
  password_actual: string
  password_nuevo: string
}): Promise<void> {
  await apiClient.put(`${AUTH_BASE}/perfil/password`, data)
}
