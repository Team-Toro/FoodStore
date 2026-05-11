// redesigned in us-009 (Phase 3 — Store: catalog, product, cart)
import { useState, useCallback } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { useProductos, type UseProductosParams } from '../../../hooks/useProductos'
import { CatalogoFilters } from '../components/CatalogoFilters'
import { ProductGrid } from '../components/ProductGrid'
import { PaginationControls } from '../components/PaginationControls'
import { ProductDetailModal } from '../components/ProductDetailModal'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { Button } from '../../../shared/ui/Button'
import { Badge } from '../../../shared/ui/Badge'

const PAGE_SIZE = 20

export function CatalogoPage(): JSX.Element {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{
    nombre?: string
    categoria_id?: number
    excluir_alergenos?: number[]
  }>({})
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  const queryParams: UseProductosParams = {
    page,
    size: PAGE_SIZE,
    nombre: filters.nombre,
    categoria_id: filters.categoria_id,
    excluir_alergenos: filters.excluir_alergenos,
  }

  const { data, isLoading, isError, refetch } = useProductos(queryParams)

  const handleFilterChange = useCallback(
    (newFilters: { nombre?: string; categoria_id?: number; excluir_alergenos?: number[] }) => {
      setFilters(newFilters)
      setPage(1)
    },
    [],
  )

  function handleClearFilters() {
    setFilters({})
    setPage(1)
  }

  const totalPages = data?.pages ?? 1
  const totalItems = data?.total ?? 0
  const hasActiveFilters =
    Boolean(filters.nombre) ||
    filters.categoria_id != null ||
    (filters.excluir_alergenos?.length ?? 0) > 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-fg tracking-tight">Nuestro Menú</h1>
          {!isLoading && data && (
            <Badge variant="neutral" className="text-sm">
              {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
            </Badge>
          )}
        </div>
        <p className="text-fg-muted mt-1 text-sm">
          Explorá nuestra selección de productos frescos y deliciosos.
        </p>
      </div>

      {/* Sticky filters */}
      <div className="sticky top-0 z-10 bg-bg py-3 border-b border-border mb-6">
        <CatalogoFilters onFilterChange={handleFilterChange} />
      </div>

      {/* Grid / states */}
      {!isLoading && !isError && data?.items.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No encontramos productos"
          description={
            hasActiveFilters
              ? 'Probá con otros filtros o limpiá los que aplicaste.'
              : 'No hay productos disponibles por el momento.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" onClick={handleClearFilters}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ProductGrid
          productos={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          onOpenModal={setSelectedProductId}
          searchTerm={filters.nombre}
        />
      )}

      {/* Sticky pagination */}
      <div className="sticky bottom-0 bg-bg pt-2 pb-4">
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>

      {selectedProductId != null && (
        <ProductDetailModal
          productoId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  )
}
