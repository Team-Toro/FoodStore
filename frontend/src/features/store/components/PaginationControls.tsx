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
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ← Anterior
      </button>
      <span className="text-sm text-gray-600">
        Página {page} de {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Siguiente →
      </button>
    </div>
  )
}
