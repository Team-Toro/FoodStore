import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  describedBy?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid = false, describedBy, 'aria-describedby': ariaDescribedby, ...props }, ref) => {
    const describedByValue = describedBy ?? ariaDescribedby

    return (
      <textarea
        ref={ref}
        className={cn(
          'block w-full rounded-input border bg-bg px-3 py-2 text-sm text-fg',
          'placeholder:text-fg-subtle',
          'border-border',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0 focus-visible:border-brand-500',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-subtle',
          'resize-y min-h-[80px]',
          invalid && 'border-danger focus-visible:ring-danger',
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

Textarea.displayName = 'Textarea'
