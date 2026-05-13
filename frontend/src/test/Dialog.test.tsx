import { render, screen, fireEvent, act } from '@testing-library/react'
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
    // Dialog renders via portal to document.body — query there, not in container.
    render(
      <Dialog open={false} onClose={() => {}}>
        <p>Hidden content</p>
      </Dialog>
    )
    const dialog = document.body.querySelector('dialog')
    expect(dialog).not.toHaveAttribute('open')
  })

  it('calls onClose when Escape key fires the cancel event', async () => {
    const onClose = vi.fn()
    await act(async () => {
      render(
        <Dialog open onClose={onClose}>
          <p>Content</p>
        </Dialog>
      )
    })
    // Dialog renders via portal to document.body
    const dialog = document.body.querySelector('dialog')!
    // Fire 'cancel' event (native Escape)
    await act(async () => {
      fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }))
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does NOT call onClose on Escape when dismissable=false', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} dismissable={false}>
        <p>Content</p>
      </Dialog>
    )
    // Dialog renders via portal to document.body
    const dialog = document.body.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('has aria-modal attribute', () => {
    render(
      <Dialog open onClose={() => {}}>
        <p>Content</p>
      </Dialog>
    )
    // Dialog renders via portal to document.body
    const dialog = document.body.querySelector('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
