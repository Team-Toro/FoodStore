import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
  describedBy?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid = false, describedBy, 'aria-describedby': ariaDescribedby, children, ...props }, ref) => {
    const describedByValue = describedBy ?? ariaDescribedby

    return (
      <select
        ref={ref}
        className={cn(
          'block w-full rounded-input border bg-bg px-3 py-2 text-sm text-fg',
          'border-border',
          // Chevron via background-image — use bg-[url] only if needed; relying on browser default
          'appearance-none',
          // Arrow icon via pseudo — we use a wrapper approach or just keep browser default
          // For premium feel use a wrapper with ChevronDown icon overlaid
          'pr-8',
          'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23475569\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")]',
          'bg-no-repeat bg-[right_0.75rem_center]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0 focus-visible:border-brand-500',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-subtle',
          invalid && 'border-danger focus-visible:ring-danger',
          'transition-colors duration-base',
          className
        )}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedByValue}
        {...props}
      >
        {children}
      </select>
    )
  }
)

Select.displayName = 'Select'
