import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  /** ID of the element describing this field (e.g., FieldError id) */
  describedBy?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid = false, describedBy, 'aria-describedby': ariaDescribedby, ...props }, ref) => {
    const describedByValue = describedBy ?? ariaDescribedby

    return (
      <input
        ref={ref}
        className={cn(
          // Base
          'block w-full rounded-input border bg-bg px-3 py-2 text-sm text-fg',
          'placeholder:text-fg-subtle',
          // Border default
          'border-border',
          // Focus
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0 focus-visible:border-brand-500',
          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-subtle',
          // Invalid state
          invalid && 'border-danger focus-visible:ring-danger',
          // Transitions
          'transition-colors duration-base',
          className
        )}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedByValue}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
