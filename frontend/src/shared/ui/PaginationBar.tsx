import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'
import { cn } from '../lib/cn'

export interface PaginationBarProps {
  page: number
  pages: number
  total?: number
  onPageChange: (page: number) => void
  className?: string
}

/**
 * Pagination bar with previous/next buttons and page indicator.
 * Shows nothing when `pages <= 1`.
 *
 * @example
 * <PaginationBar
 *   page={page}
 *   pages={data.pages}
 *   total={data.total}
 *   onPageChange={setPage}
 * />
 */
export function PaginationBar({
  page,
  pages,
  total,
  onPageChange,
  className,
}: PaginationBarProps) {
  if (pages <= 1) return null

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 mt-4',
        className,
      )}
      aria-label="Paginación"
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Anterior
      </Button>

      <span className="text-sm text-fg-muted tabular-nums">
        {page} / {pages}
        {total !== undefined && (
          <span className="hidden sm:inline"> ({total.toLocaleString('es-AR')} registros)</span>
        )}
      </span>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(Math.min(pages, page + 1))}
        disabled={page === pages}
        aria-label="Página siguiente"
      >
        Siguiente
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
