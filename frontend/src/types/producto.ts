export interface Categoria {
  id: number
  nombre: string
  descripcion?: string | null
  parent_id?: number | null
}

export interface Ingrediente {
  id: number
  nombre: string
  es_alergeno: boolean
}

export interface Producto {
  id: number
  nombre: string
  descripcion?: string | null
  precio: number
  stock: number
  disponible: boolean
  imagen_url?: string | null
  categorias: Categoria[]
  creado_en: string
}

export interface ProductoDetail extends Producto {
  ingredientes: Ingrediente[]
}

export interface PaginatedProductos {
  items: Producto[]
  total: number
  page: number
  size: number
  pages: number
}
