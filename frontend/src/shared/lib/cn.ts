import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes safely, resolving conflicts intelligently.
 *
 * Uses `clsx` for conditional class construction and `tailwind-merge`
 * to deduplicate conflicting Tailwind utilities (e.g. `px-2 px-4` → `px-4`).
 *
 * @example
 * cn('px-2 py-1', condition && 'bg-brand-500', 'text-fg')
 * cn({ 'opacity-50': isDisabled }, 'rounded-card')
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
