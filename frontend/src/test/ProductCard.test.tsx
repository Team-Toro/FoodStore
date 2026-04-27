import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductCard } from '../features/store/components/ProductCard'
import type { Producto } from '../types/producto'

// Mock cartStore to avoid Zustand persist side-effects in tests
vi.mock('../app/store/cartStore', () => ({
  useCartStore: (selector: (s: { addItem: () => void }) => unknown) =>
    selector({ addItem: vi.fn() }),
}))

const makeProducto = (override: Partial<Produto> = {}): Producto => ({
  id: 1,
  nombre: 'Empanada de carne',
  descripcion: 'Deliciosa empanada',
  precio: 350,
  stock: 10,
  disponible: true,
  imagen_url: null,
  categorias: [],
  creado_en: '2024-01-01T00:00:00Z',
  ...override,
})

// TypeScript alias for the override type — avoids the typo guard above
type Produto = Producto

describe('ProductCard', () => {
  const onOpenModal = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the product name', () => {
    render(<ProductCard producto={makeProducto()} onOpenModal={onOpenModal} />)
    expect(screen.getByText('Empanada de carne')).toBeInTheDocument()
  })

  it('renders the product price', () => {
    render(<ProductCard producto={makeProducto({ precio: 350 })} onOpenModal={onOpenModal} />)
    expect(screen.getByText('$350.00')).toBeInTheDocument()
  })

  it('does NOT show sin-stock badge when stock > 0', () => {
    render(<ProductCard producto={makeProducto({ stock: 5 })} onOpenModal={onOpenModal} />)
    expect(screen.queryByTestId('sin-stock-badge')).not.toBeInTheDocument()
  })

  it('shows "Sin stock" badge when stock = 0', () => {
    render(<ProductCard producto={makeProducto({ stock: 0 })} onOpenModal={onOpenModal} />)
    expect(screen.getByTestId('sin-stock-badge')).toBeInTheDocument()
    expect(screen.getByTestId('sin-stock-badge')).toHaveTextContent('Sin stock')
  })

  it('disables the Agregar button when stock = 0', () => {
    render(<ProductCard producto={makeProducto({ stock: 0 })} onOpenModal={onOpenModal} />)
    const btn = screen.getByRole('button', { name: /agregar/i })
    expect(btn).toBeDisabled()
  })

  it('enables the Agregar button when stock > 0', () => {
    render(<ProductCard producto={makeProducto({ stock: 3 })} onOpenModal={onOpenModal} />)
    const btn = screen.getByRole('button', { name: /agregar/i })
    expect(btn).toBeEnabled()
  })

  it('renders category badges', () => {
    const categorias = [{ id: 1, nombre: 'Pizzas', descripcion: null, parent_id: null }]
    render(
      <ProductCard producto={makeProducto({ categorias })} onOpenModal={onOpenModal} />,
    )
    expect(screen.getByText('Pizzas')).toBeInTheDocument()
  })
})
