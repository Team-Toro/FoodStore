import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Drawer, DrawerHeader, DrawerTitle, DrawerBody } from '../shared/ui/Drawer'

describe('Drawer', () => {
  beforeEach(() => {
    // Reset body overflow before each test
    document.body.style.overflow = ''
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('renders children when open', () => {
    render(
      <Drawer open onClose={() => {}}>
        <DrawerHeader>
          <DrawerTitle>Carrito</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <p>Artículos del carrito</p>
        </DrawerBody>
      </Drawer>
    )
    expect(screen.getByText('Carrito')).toBeInTheDocument()
    expect(screen.getByText('Artículos del carrito')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    const { queryByRole } = render(
      <Drawer open={false} onClose={() => {}}>
        <p>Hidden</p>
      </Drawer>
    )
    expect(queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('locks body scroll when open', () => {
    render(
      <Drawer open onClose={() => {}}>
        <p>Content</p>
      </Drawer>
    )
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('unlocks body scroll when closed (open transitions to false)', () => {
    const { rerender } = render(
      <Drawer open onClose={() => {}}>
        <p>Content</p>
      </Drawer>
    )
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Drawer open={false} onClose={() => {}}>
        <p>Content</p>
      </Drawer>
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <p>Content</p>
      </Drawer>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} aria-label="Carrito de compras">
        <p>Content</p>
      </Drawer>
    )
    // The backdrop is the first child of the dialog container (absolute inset div)
    const backdrop = screen.getByRole('dialog').querySelector('[aria-hidden="true"]')
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders from the right by default', () => {
    render(
      <Drawer open onClose={() => {}} aria-label="Right drawer">
        <p>Content</p>
      </Drawer>
    )
    // The panel has ml-auto for right side
    const dialog = screen.getByRole('dialog')
    const panel = dialog.querySelector('[tabindex="-1"]')
    expect(panel?.className).toMatch(/ml-auto/)
  })

  it('renders from the left when side="left"', () => {
    render(
      <Drawer open onClose={() => {}} side="left" aria-label="Left drawer">
        <p>Content</p>
      </Drawer>
    )
    const dialog = screen.getByRole('dialog')
    const panel = dialog.querySelector('[tabindex="-1"]')
    expect(panel?.className).toMatch(/mr-auto/)
  })
})
