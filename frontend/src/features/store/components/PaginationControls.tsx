import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'

interface PaginationControlsProps {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export function PaginationControls({
  page,
  totalPages,
  onPrev,
  onNext,
}: PaginationControlsProps): JSX.Element {
  if (totalPages <= 1) return <></>

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrev}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Anterior
      </Button>
      <span className="text-sm text-fg-muted">
        Página {page} de {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={page >= totalPages}
        aria-label="Página siguiente"
      >
        Siguiente
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
