import { cn } from '../lib/cn'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Override height (e.g. 'h-4', 'h-20'). Default: 'h-4' */
  height?: string
  /** Override width. Default: 'w-full' */
  width?: string
  /** Circle variant for avatar skeletons */
  circle?: boolean
}

/**
 * Shimmer skeleton placeholder for loading states.
 * Uses Tailwind `animate-pulse` for the shimmer effect.
 */
export function Skeleton({
  className,
  height = 'h-4',
  width = 'w-full',
  circle = false,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-border rounded-md',
        height,
        width,
        circle && 'rounded-full',
        className
      )}
      aria-hidden="true"
      {...props}
    />
  )
}

/** Convenience: a block of stacked skeleton lines */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          // Last line shorter for realistic paragraph look
          width={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  )
}
