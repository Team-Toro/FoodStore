export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  nombre: string
  apellido: string
  email: string
  password: string
  telefono?: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface User {
  id: number
  nombre: string
  apellido: string
  email: string
  telefono?: string | null
  roles: string[]
  creado_en: string
}
