import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '../app/store/cartStore'
import type { CartItem } from '../types/cart'

const makeItem = (override: Partial<CartItem> = {}): CartItem => ({
  productoId: 1,
  nombre: 'Milanesa napolitana',
  precio: 1200,
  cantidad: 1,
  imagenUrl: '',
  exclusiones: [],
  ...override,
})

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] })
    localStorage.clear()
  })

  // -----------------------------------------------------------------------
  // Task 10.1 — addItem, removeItem, updateCantidad, clearCart, total()
  // -----------------------------------------------------------------------

  describe('addItem', () => {
    it('adds a new item to an empty cart', () => {
      const item = makeItem()
      useCartStore.getState().addItem(item)
      const { items } = useCartStore.getState()
      expect(items).toHaveLength(1)
      expect(items[0]).toEqual(item)
    })

    it('increments cantidad when adding a new item with cantidad > 1', () => {
      useCartStore.getState().addItem(makeItem({ cantidad: 3 }))
      expect(useCartStore.getState().items[0].cantidad).toBe(3)
    })
  })

  describe('removeItem', () => {
    it('removes an item by productoId', () => {
      useCartStore.getState().addItem(makeItem({ productoId: 1 }))
      useCartStore.getState().addItem(makeItem({ productoId: 2, nombre: 'Pollo asado' }))
      useCartStore.getState().removeItem(1)
      const { items } = useCartStore.getState()
      expect(items).toHaveLength(1)
      expect(items[0].productoId).toBe(2)
    })

    it('does nothing if productoId does not exist', () => {
      useCartStore.getState().addItem(makeItem())
      useCartStore.getState().removeItem(999)
      expect(useCartStore.getState().items).toHaveLength(1)
    })
  })

  describe('updateCantidad', () => {
    it('updates the cantidad for an existing item', () => {
      useCartStore.getState().addItem(makeItem({ productoId: 1, cantidad: 1 }))
      useCartStore.getState().updateCantidad(1, 5)
      expect(useCartStore.getState().items[0].cantidad).toBe(5)
    })

    it('removes the item when cantidad > 0 boundary: cantidad = 1 stays', () => {
      useCartStore.getState().addItem(makeItem({ productoId: 1, cantidad: 3 }))
      useCartStore.getState().updateCantidad(1, 1)
      expect(useCartStore.getState().items).toHaveLength(1)
      expect(useCartStore.getState().items[0].cantidad).toBe(1)
    })
  })

  describe('clearCart', () => {
    it('empties the cart', () => {
      useCartStore.getState().addItem(makeItem({ productoId: 1 }))
      useCartStore.getState().addItem(makeItem({ productoId: 2, nombre: 'Tarta' }))
      useCartStore.getState().clearCart()
      expect(useCartStore.getState().items).toHaveLength(0)
    })
  })

  describe('total()', () => {
    it('returns 0 when cart is empty', () => {
      expect(useCartStore.getState().total()).toBe(0)
    })

    it('returns subtotal + costoEnvio when cart has items', () => {
      useCartStore.getState().addItem(makeItem({ precio: 1000, cantidad: 2 }))
      // subtotal = 2000, costoEnvio = 500
      expect(useCartStore.getState().subtotal()).toBe(2000)
      expect(useCartStore.getState().costoEnvio()).toBe(500)
      expect(useCartStore.getState().total()).toBe(2500)
    })

    it('costoEnvio is 0 when cart is empty', () => {
      expect(useCartStore.getState().costoEnvio()).toBe(0)
    })
  })

  describe('itemCount()', () => {
    it('sums all item quantities', () => {
      useCartStore.getState().addItem(makeItem({ productoId: 1, cantidad: 2 }))
      useCartStore.getState().addItem(makeItem({ productoId: 2, nombre: 'Pollo', cantidad: 3 }))
      expect(useCartStore.getState().itemCount()).toBe(5)
    })
  })

  // -----------------------------------------------------------------------
  // Task 10.2 — addItem with duplicate product increments quantity
  // -----------------------------------------------------------------------

  describe('addItem — duplicate product', () => {
    it('increments cantidad instead of duplicating the item', () => {
      useCartStore.getState().addItem(makeItem({ productoId: 1, cantidad: 2 }))
      useCartStore.getState().addItem(makeItem({ productoId: 1, cantidad: 3 }))
      const { items } = useCartStore.getState()
      // Should still be 1 item
      expect(items).toHaveLength(1)
      // cantidad should be 2 + 3 = 5
      expect(items[0].cantidad).toBe(5)
    })

    it('overwrites exclusiones with those from the latest addItem', () => {
      useCartStore.getState().addItem(makeItem({ productoId: 1, exclusiones: [10] }))
      useCartStore.getState().addItem(makeItem({ productoId: 1, exclusiones: [20, 30] }))
      expect(useCartStore.getState().items[0].exclusiones).toEqual([20, 30])
    })
  })

  // -----------------------------------------------------------------------
  // Task 10.3 — updateCantidad(id, 0) removes the item
  // -----------------------------------------------------------------------

  describe('updateCantidad — quantity = 0', () => {
    it('removes the item when cantidad is 0', () => {
      useCartStore.getState().addItem(makeItem({ productoId: 1, cantidad: 2 }))
      useCartStore.getState().updateCantidad(1, 0)
      expect(useCartStore.getState().items).toHaveLength(0)
    })

    it('removes the item when cantidad is negative', () => {
      useCartStore.getState().addItem(makeItem({ productoId: 1, cantidad: 1 }))
      useCartStore.getState().updateCantidad(1, -1)
      expect(useCartStore.getState().items).toHaveLength(0)
    })
  })
})
