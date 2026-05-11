// redesigned in us-009 (Phase 3 — Store: catalog, product, cart)
import type { Producto } from '../../../types/producto'
import { ProductCard } from './ProductCard'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { Button } from '../../../shared/ui/Button'

interface ProductGridProps {
  productos: Producto[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onOpenModal: (productoId: number) => void
  /** Used by parent for display — kept in interface for API compatibility */
  searchTerm?: string
}

/** Skeleton card matching ProductCard's elevated layout and 4:3 image aspect ratio */
function SkeletonCard(): JSX.Element {
  return (
    <div className="rounded-card shadow-card border border-border/50 bg-bg overflow-hidden flex flex-col">
      {/* 4:3 image area */}
      <Skeleton className="w-full aspect-[4/3] rounded-none" height="auto" />
      <div className="px-4 pt-3 pb-2 flex flex-col gap-2 flex-1">
        <Skeleton height="h-5" width="w-3/4" />
        <Skeleton height="h-4" width="w-1/2" />
        <Skeleton height="h-6" width="w-24" className="mt-auto" />
      </div>
      <div className="px-4 pb-4 pt-0">
        <Skeleton height="h-10" />
      </div>
    </div>
  )
}

export function ProductGrid({
  productos,
  isLoading,
  isError,
  onRetry,
  onOpenModal,
  searchTerm: _searchTerm,
}: ProductGridProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <p className="text-danger font-medium mb-4">Error al cargar productos</p>
        <Button variant="primary" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (productos.length === 0) {
    // Zero-result EmptyState is handled by CatalogoPage — ProductGrid renders nothing
    return <></>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {productos.map((p) => (
        <ProductCard key={p.id} producto={p} onOpenModal={onOpenModal} />
      ))}
    </div>
  )
}
