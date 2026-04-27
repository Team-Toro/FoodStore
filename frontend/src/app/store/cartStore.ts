import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, CartState } from '../../types/cart'

const SHIPPING_COST = 500

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(item: CartItem): void {
        set((state) => {
          const existing = state.items.find((i) => i.productoId === item.productoId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productoId === item.productoId
                  ? { ...i, cantidad: i.cantidad + item.cantidad, exclusiones: item.exclusiones }
                  : i,
              ),
            }
          }
          return { items: [...state.items, item] }
        })
      },

      removeItem(productoId: number): void {
        set((state) => ({
          items: state.items.filter((i) => i.productoId !== productoId),
        }))
      },

      updateCantidad(productoId: number, cantidad: number): void {
        if (cantidad <= 0) {
          get().removeItem(productoId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productoId === productoId ? { ...i, cantidad } : i,
          ),
        }))
      },

      updatePrecio(productoId: number, precio: number): void {
        set((state) => ({
          items: state.items.map((i) =>
            i.productoId === productoId ? { ...i, precio } : i,
          ),
        }))
      },

      clearCart(): void {
        set({ items: [] })
      },

      subtotal(): number {
        return get().items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
      },

      costoEnvio(): number {
        const sub = get().subtotal()
        return sub === 0 ? 0 : SHIPPING_COST
      },

      total(): number {
        return get().subtotal() + get().costoEnvio()
      },

      itemCount(): number {
        return get().items.reduce((acc, i) => acc + i.cantidad, 0)
      },
    }),
    {
      name: 'cart-storage',
      version: 1,
    },
  ),
)
