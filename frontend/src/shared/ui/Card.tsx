import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

// ---- Card root ----
const cardVariants = cva(
  'rounded-card bg-bg overflow-hidden',
  {
    variants: {
      variant: {
        flat: 'border border-border',
        elevated: 'shadow-card border border-border/50',
        outline: 'border-2 border-border',
      },
    },
    defaultVariants: {
      variant: 'elevated',
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
  )
)
Card.displayName = 'Card'

// ---- CardHeader ----
export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1 px-5 pt-5 pb-0', className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

// ---- CardTitle ----
export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-base font-semibold leading-tight text-fg', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

// ---- CardBody ----
export const CardBody = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-5 py-4', className)} {...props} />
  )
)
CardBody.displayName = 'CardBody'

// ---- CardFooter ----
export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 px-5 pb-5 pt-0',
        className
      )}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { cardVariants }
