import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CartDrawer } from '../features/store/components/CartDrawer'
import { useCartStore } from '../app/store/cartStore'
import { useUiStore } from '../app/store/uiStore'

describe('CartDrawer — empty state', () => {
  beforeEach(() => {
    // Reset stores
    useCartStore.setState({ items: [] })
    useUiStore.setState({ cartOpen: true, sidebarOpen: false })
    localStorage.clear()
  })

  function renderDrawer() {
    return render(
      <MemoryRouter>
        <CartDrawer />
      </MemoryRouter>,
    )
  }

  it('shows "Tu carrito está vacío" when cart is empty', () => {
    renderDrawer()
    expect(screen.getByTestId('cart-empty')).toBeInTheDocument()
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()
  })

  it('shows a link/button to go to catálogo when empty', () => {
    renderDrawer()
    expect(screen.getByRole('button', { name: /ver catálogo/i })).toBeInTheDocument()
  })

  it('does NOT render the footer (total/checkout) when cart is empty', () => {
    renderDrawer()
    expect(screen.queryByText(/vaciar carrito/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ir al checkout/i)).not.toBeInTheDocument()
  })

  it('renders nothing when cartOpen is false', () => {
    useUiStore.setState({ cartOpen: false, sidebarOpen: false })
    const { container } = renderDrawer()
    expect(container.firstChild).toBeNull()
  })

  it('shows the drawer header when cartOpen is true', () => {
    renderDrawer()
    expect(screen.getByText('Tu carrito')).toBeInTheDocument()
  })
})
