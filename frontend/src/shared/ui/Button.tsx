import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'
import { Spinner } from './Spinner'

const buttonVariants = cva(
  // Base styles — applied to every button variant
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-btn',
    'transition-all duration-base',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-brand-500 text-fg-on-brand',
          'hover:bg-brand-600 active:bg-brand-700',
          'shadow-sm hover:shadow-brand',
        ],
        secondary: [
          'bg-bg-subtle text-fg border border-border',
          'hover:bg-bg-elevated hover:border-border-strong',
          'active:bg-bg-subtle',
          'shadow-sm',
        ],
        ghost: [
          'text-fg-muted bg-transparent',
          'hover:bg-bg-subtle hover:text-fg',
          'active:bg-bg-elevated',
        ],
        danger: [
          'bg-danger text-white',
          'hover:bg-danger/90 active:bg-danger/80',
          'shadow-sm',
        ],
        link: [
          'text-brand-600 bg-transparent underline-offset-4',
          'hover:underline hover:text-brand-700',
          'active:text-brand-800',
          'p-0 h-auto',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  /** Render as a different element (e.g. pass asChild pattern via className override) */
  loadingLabel?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      loadingLabel = 'Cargando…',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-busy={loading ? 'true' : undefined}
        aria-label={loading ? loadingLabel : undefined}
        {...props}
      >
        {loading && (
          <Spinner
            size={size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm'}
            className="shrink-0"
          />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { buttonVariants }
