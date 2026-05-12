import {
  forwardRef,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'

export interface DialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when the dialog should close */
  onClose: () => void
  /** Children rendered inside the dialog panel */
  children: ReactNode
  /** Extra class names for the dialog panel */
  className?: string
  /**
   * Whether the dialog can be dismissed by pressing Escape or clicking
   * the backdrop. Defaults to `true`.
   */
  dismissable?: boolean
  /** aria-label for the dialog element */
  'aria-label'?: string
  /** aria-labelledby for the dialog element */
  'aria-labelledby'?: string
  /** aria-describedby for the dialog element */
  'aria-describedby'?: string
}

/**
 * Modal dialog built on the native `<dialog>` element.
 *
 * - Managed via `dialog.showModal()` / `dialog.close()` so the browser
 *   provides built-in focus trapping, top-layer rendering, and Escape
 *   handling natively.
 * - `dismissable` (default `true`) controls whether Escape and backdrop
 *   clicks trigger `onClose`.
 * - Rendered via a portal to `document.body` so the `<dialog>` element is
 *   never mounted inside invalid container elements (e.g., `<tbody>`),
 *   eliminating `validateDOMNesting` warnings regardless of where Dialog is used.
 */
export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(
  (
    {
      open,
      onClose,
      children,
      className,
      dismissable = true,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLDialogElement>(null)
    // Support both forwarded and internal ref
    const ref = (forwardedRef as React.RefObject<HTMLDialogElement>) ?? internalRef

    // Sync open state → native dialog API
    useEffect(() => {
      const el = ref.current
      if (!el) return

      if (open) {
        if (!el.open) el.showModal()
      } else {
        if (el.open) el.close()
      }
    }, [open, ref])

    // Handle native 'cancel' event (Escape key)
    const handleCancel = useCallback(
      (e: Event) => {
        e.preventDefault()
        if (dismissable) onClose()
      },
      [dismissable, onClose]
    )

    useEffect(() => {
      const el = ref.current
      if (!el) return
      el.addEventListener('cancel', handleCancel)
      return () => el.removeEventListener('cancel', handleCancel)
    }, [handleCancel, ref])

    // Handle backdrop click (click on <dialog> outside the panel)
    const handleBackdropClick = useCallback(
      (e: React.MouseEvent<HTMLDialogElement>) => {
        if (!dismissable) return
        // The dialog element itself is the backdrop; the panel is the first child
        const rect = e.currentTarget.getBoundingClientRect()
        const clickedOutside =
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        if (clickedOutside) onClose()
      },
      [dismissable, onClose]
    )

    const dialogElement = (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
      <dialog
        ref={ref}
        className={cn(
          // Reset default dialog styles
          'p-0 m-auto bg-transparent backdrop:bg-bg-overlay backdrop:backdrop-blur-sm',
          // Ensure it sits on top
          'max-w-[min(90vw,32rem)] w-full',
          // Open/closed animation
          'open:animate-in',
          className
        )}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        aria-modal="true"
        onClick={handleBackdropClick}
      >
        {/* Inner panel — stops click propagation so backdrop click works */}
        <div
          className={cn(
            'relative rounded-dialog bg-bg shadow-modal',
            'ring-1 ring-border/50',
            'max-h-[85vh] overflow-y-auto',
            'p-6',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </dialog>
    )

    // Render via portal to document.body so <dialog> is never a descendant
    // of invalid container elements (e.g., <tbody>), eliminating
    // validateDOMNesting warnings regardless of where Dialog is used.
    // This project uses Vite (client-side only) — no SSR, so no mounted guard needed.
    return createPortal(dialogElement, document.body)
  }
)

Dialog.displayName = 'Dialog'

// ---- Convenience sub-components ----

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props} />
  )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold leading-tight text-fg', className)}
      {...props}
    />
  )
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-1 text-sm text-fg-muted', className)} {...props} />
  )
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-6 flex items-center justify-end gap-3', className)}
      {...props}
    />
  )
}
