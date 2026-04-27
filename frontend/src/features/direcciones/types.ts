export interface DireccionRead {
  id: number
  usuario_id: number
  linea1: string
  linea2?: string | null
  ciudad: string
  codigo_postal?: string | null
  referencia?: string | null
  alias?: string | null
  es_principal: boolean
  creado_en: string
  actualizado_en: string
}

export interface DireccionCreate {
  linea1: string
  linea2?: string | null
  ciudad: string
  codigo_postal?: string | null
  referencia?: string | null
  alias?: string | null
}

export interface DireccionUpdate {
  linea1?: string | null
  linea2?: string | null
  ciudad?: string | null
  codigo_postal?: string | null
  referencia?: string | null
  alias?: string | null
}
