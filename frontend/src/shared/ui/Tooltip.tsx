import {
  useRef,
  useState,
  useId,
  type ReactNode,
} from 'react'
import { cn } from '../lib/cn'

export interface TooltipProps {
  /** The element that triggers the tooltip */
  children: ReactNode
  /** Tooltip content */
  content: ReactNode
  /** Placement relative to the trigger */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Delay before showing (ms). Default: 300 */
  delay?: number
  className?: string
}

/**
 * Lightweight CSS-driven tooltip using aria-describedby.
 *
 * Uses a controlled show/hide state with optional delay.
 * For complex cases (auto-placement, portals) prefer a library like Floating UI.
 */
export function Tooltip({
  children,
  content,
  placement = 'top',
  delay = 300,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function show() {
    timer.current = setTimeout(() => setVisible(true), delay)
  }

  function hide() {
    if (timer.current) clearTimeout(timer.current)
    setVisible(false)
  }

  const placementClasses: Record<NonNullable<TooltipProps['placement']>, string> = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {/* Trigger — inject aria-describedby */}
      {typeof children === 'object' && children !== null
        ? // Clone with aria-describedby if it's a React element
          (children as React.ReactElement<{ 'aria-describedby'?: string }>)
        : children}

      {/* Hidden, but aria-linked trigger wrapper */}
      <span className="contents" aria-describedby={visible ? id : undefined}>
        {children}
      </span>

      {visible && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'absolute z-50 whitespace-nowrap rounded-md',
            'bg-fg text-bg-subtle text-xs font-medium px-2.5 py-1.5',
            'shadow-popover pointer-events-none',
            placementClasses[placement],
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
