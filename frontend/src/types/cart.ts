export interface CartItem {
  productoId: number
  nombre: string
  precio: number
  cantidad: number
  imagenUrl: string
  exclusiones: number[]
}

export interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productoId: number) => void
  updateCantidad: (productoId: number, cantidad: number) => void
  updatePrecio: (productoId: number, precio: number) => void
  clearCart: () => void
  subtotal: () => number
  costoEnvio: () => number
  total: () => number
  itemCount: () => number
}
