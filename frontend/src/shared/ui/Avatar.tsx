import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium select-none',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-[0.625rem]',
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

export interface AvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  /** Image URL — if provided, renders an <img> */
  src?: string
  /** Alt text for the image */
  alt?: string
  /** Name used to generate initials fallback */
  name?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function hashColor(name: string): string {
  // Deterministic hue from name string
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 45%)`
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size, src, alt, name, ...props }, ref) => {
    const initials = name ? getInitials(name) : '?'
    const bgColor = name ? hashColor(name) : 'var(--brand-500)'

    return (
      <span
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        aria-label={alt ?? name ?? 'Avatar'}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt ?? name ?? 'Avatar'}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Hide broken image to show initials fallback
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-white font-semibold"
            style={{ backgroundColor: bgColor }}
            aria-hidden="true"
          >
            {initials}
          </span>
        )}
      </span>
    )
  }
)

Avatar.displayName = 'Avatar'
