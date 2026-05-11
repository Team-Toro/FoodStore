import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  id?: string
}

export const FieldError = forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, children, id, ...props }, ref) => {
    if (!children) return null

    return (
      <p
        ref={ref}
        id={id}
        role="alert"
        className={cn('mt-1 text-xs font-medium text-danger', className)}
        {...props}
      >
        {children}
      </p>
    )
  }
)

FieldError.displayName = 'FieldError'
