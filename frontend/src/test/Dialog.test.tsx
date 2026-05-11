import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { Dialog, DialogTitle } from '../shared/ui/Dialog'

// jsdom does not implement HTMLDialogElement.showModal / close.
// We polyfill the minimum required behaviour.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
    }
  }
})

describe('Dialog', () => {
  it('renders children when open', () => {
    render(
      <Dialog open onClose={() => {}}>
        <DialogTitle>Confirmar acción</DialogTitle>
        <p>¿Estás seguro?</p>
      </Dialog>
    )
    expect(screen.getByText('Confirmar acción')).toBeInTheDocument()
    expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument()
  })

  it('does not render content when closed (open=false)', () => {
    // When open=false dialog.close() is called; content is still mounted but dialog not open.
    // We verify the dialog element is NOT marked open.
    const { container } = render(
      <Dialog open={false} onClose={() => {}}>
        <p>Hidden content</p>
      </Dialog>
    )
    const dialog = container.querySelector('dialog')
    expect(dialog).not.toHaveAttribute('open')
  })

  it('calls onClose when Escape key fires the cancel event', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Dialog open onClose={onClose}>
        <p>Content</p>
      </Dialog>
    )
    const dialog = container.querySelector('dialog')!
    // Fire 'cancel' event (native Escape)
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does NOT call onClose on Escape when dismissable=false', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Dialog open onClose={onClose} dismissable={false}>
        <p>Content</p>
      </Dialog>
    )
    const dialog = container.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('has aria-modal attribute', () => {
    const { container } = render(
      <Dialog open onClose={() => {}}>
        <p>Content</p>
      </Dialog>
    )
    const dialog = container.querySelector('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
