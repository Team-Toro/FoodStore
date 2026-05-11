import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OrderStatusTimeline } from '../features/pedidos/components/OrderStatusTimeline'

// The 5 main FSM step labels rendered in the timeline
const STEP_LABELS = ['Pendiente', 'Confirmado', 'En preparación', 'En camino', 'Entregado']

describe('OrderStatusTimeline', () => {
  it('renders all 5 main step labels', () => {
    render(<OrderStatusTimeline estadoActual="PENDIENTE" />)
    for (const label of STEP_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('does NOT show the cancelled branch when estado is PENDIENTE', () => {
    render(<OrderStatusTimeline estadoActual="PENDIENTE" />)
    expect(screen.queryByText(/cancelado/i)).not.toBeInTheDocument()
  })

  it('renders CANCELADO terminal branch when estado is CANCELADO', () => {
    render(<OrderStatusTimeline estadoActual="CANCELADO" />)
    // The terminal section shows a status with the aria-label
    expect(screen.getByRole('status', { name: /pedido cancelado/i })).toBeInTheDocument()
    // Multiple elements match "cancelado" (text + badge) — use getAllByText
    const cancelTexts = screen.getAllByText(/cancelado/i)
    expect(cancelTexts.length).toBeGreaterThanOrEqual(1)
  })

  it('still renders all step labels even when CANCELADO', () => {
    render(<OrderStatusTimeline estadoActual="CANCELADO" />)
    for (const label of STEP_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('renders the list with accessible role', () => {
    render(<OrderStatusTimeline estadoActual="EN_PREP" />)
    expect(screen.getByRole('list', { name: /estado del pedido/i })).toBeInTheDocument()
  })

  it('renders 5 list items for every estado in the main path', () => {
    const estadosMains = ['PENDIENTE', 'CONFIRMADO', 'EN_PREP', 'EN_CAMINO', 'ENTREGADO']
    for (const estado of estadosMains) {
      const { unmount } = render(<OrderStatusTimeline estadoActual={estado} />)
      const items = screen.getAllByRole('listitem')
      expect(items).toHaveLength(5)
      unmount()
    }
  })

  it('renders 5 list items when CANCELADO (main path still shown)', () => {
    render(<OrderStatusTimeline estadoActual="CANCELADO" />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(5)
  })

  it('applies brand circle class to current step (CONFIRMADO)', () => {
    const { container } = render(<OrderStatusTimeline estadoActual="CONFIRMADO" />)
    // The current step circle has bg-brand-500
    const brandCircles = container.querySelectorAll('.bg-brand-500')
    expect(brandCircles.length).toBeGreaterThan(0)
  })

  it('applies success circle class to completed steps', () => {
    const { container } = render(<OrderStatusTimeline estadoActual="EN_CAMINO" />)
    // Completed steps (PENDIENTE, CONFIRMADO, EN_PREP) have bg-success
    const successCircles = container.querySelectorAll('.bg-success')
    // At least 3 completed steps
    expect(successCircles.length).toBeGreaterThanOrEqual(3)
  })
})
