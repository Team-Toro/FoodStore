import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../shared/ui/Button'

describe('Button', () => {
  it('renders with default (primary) variant', () => {
    render(<Button>Guardar</Button>)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('applies secondary variant class', () => {
    render(<Button variant="secondary">Cancelar</Button>)
    const btn = screen.getByRole('button', { name: 'Cancelar' })
    expect(btn).toBeInTheDocument()
    // Secondary button should have border style (bg-bg-subtle)
    expect(btn.className).toMatch(/bg-bg-subtle/)
  })

  it('applies ghost variant class', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const btn = screen.getByRole('button', { name: 'Ghost' })
    expect(btn.className).toMatch(/bg-transparent/)
  })

  it('applies danger variant class', () => {
    render(<Button variant="danger">Eliminar</Button>)
    const btn = screen.getByRole('button', { name: 'Eliminar' })
    expect(btn.className).toMatch(/bg-danger/)
  })

  it('applies link variant class', () => {
    render(<Button variant="link">Ver más</Button>)
    const btn = screen.getByRole('button', { name: 'Ver más' })
    expect(btn.className).toMatch(/text-brand-600/)
  })

  it('renders sm, md, lg sizes', () => {
    const { rerender } = render(<Button size="sm">Btn</Button>)
    expect(screen.getByRole('button').className).toMatch(/h-8/)

    rerender(<Button size="md">Btn</Button>)
    expect(screen.getByRole('button').className).toMatch(/h-10/)

    rerender(<Button size="lg">Btn</Button>)
    expect(screen.getByRole('button').className).toMatch(/h-12/)
  })

  it('loading state disables the button and sets aria-busy', () => {
    render(<Button loading>Guardando</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })

  it('loading state renders a spinner', () => {
    render(<Button loading>Guardando</Button>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('disabled prop disables button', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('does NOT call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('does NOT call onClick when loading', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button loading onClick={handleClick}>Loading</Button>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })
})
