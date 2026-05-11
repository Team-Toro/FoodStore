import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import { cn } from '../lib/cn'

export interface DrawerProps {
  /** Whether the drawer is open */
  open: boolean
  /** Called when the drawer should close */
  onClose: () => void
  /** Which side the drawer slides in from */
  side?: 'left' | 'right'
  /** Content rendered inside the drawer panel */
  children: ReactNode
  /** Extra class names for the panel */
  className?: string
  /** Width of the drawer panel (default: 'w-80') */
  panelWidth?: string
  /** aria-label for the drawer */
  'aria-label'?: string
  /** aria-labelledby for the drawer */
  'aria-labelledby'?: string
}

/**
 * Slide-in Drawer panel.
 *
 * - Uses a portal-like rendering inside a fixed backdrop.
 * - Locks body scroll while open (`document.body.style.overflow = 'hidden'`).
 * - Traps focus inside the panel by delegating to the panel div with
 *   `tabIndex={-1}` and calling `.focus()` on open.
 * - Closes on Escape key and backdrop click.
 */
export function Drawer({
  open,
  onClose,
  side = 'right',
  children,
  className,
  panelWidth = 'w-80',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<Element | null>(null)

  // Lock body scroll
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement
      document.body.style.overflow = 'hidden'
      // Focus the panel so keyboard trap works immediately
      requestAnimationFrame(() => {
        panelRef.current?.focus()
      })
    } else {
      document.body.style.overflow = ''
      // Restore focus
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus()
      }
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        onClose()
      }
    },
    [open, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-overlay backdrop-blur-sm transition-opacity duration-slow"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex flex-col bg-bg shadow-modal',
          'h-full max-h-screen overflow-y-auto',
          'transition-transform duration-slow ease-out',
          // Side positioning
          side === 'right'
            ? 'ml-auto translate-x-0 border-l border-border'
            : 'mr-auto -translate-x-0 border-r border-border',
          panelWidth,
          // Focus outline suppressed for mouse users, visible for keyboard
          'outline-none',
          className
        )}
        // Prevent backdrop click from propagating through panel
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ---- Convenience sub-components ----

export function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-4 border-b border-border shrink-0',
        className
      )}
      {...props}
    />
  )
}

export function DrawerTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-base font-semibold text-fg', className)} {...props} />
  )
}

export function DrawerBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-5 py-4', className)} {...props} />
  )
}

export function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'shrink-0 px-5 pt-4 border-t border-border',
        'pb-[max(theme(spacing.4),env(safe-area-inset-bottom))]',
        className
      )}
      {...props}
    />
  )
}
