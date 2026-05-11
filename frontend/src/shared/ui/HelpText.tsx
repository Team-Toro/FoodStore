import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface HelpTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  id?: string
}

export const HelpText = forwardRef<HTMLParagraphElement, HelpTextProps>(
  ({ className, children, id, ...props }, ref) => {
    if (!children) return null

    return (
      <p
        ref={ref}
        id={id}
        className={cn('mt-1 text-xs text-fg-muted', className)}
        {...props}
      >
        {children}
      </p>
    )
  }
)

HelpText.displayName = 'HelpText'
