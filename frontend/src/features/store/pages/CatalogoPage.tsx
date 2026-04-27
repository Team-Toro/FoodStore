import { useState, useCallback } from 'react'
import { useProductos, type UseProductosParams } from '../../../hooks/useProductos'
import { CatalogoFilters } from '../components/CatalogoFilters'
import { ProductGrid } from '../components/ProductGrid'
import { PaginationControls } from '../components/PaginationControls'
import { ProductDetailModal } from '../components/ProductDetailModal'

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

  const totalPages = data?.pages ?? 1

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Catálogo</h1>

      <div className="mb-6">
        <CatalogoFilters onFilterChange={handleFilterChange} />
      </div>

      <ProductGrid
        productos={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onOpenModal={setSelectedProductId}
        searchTerm={filters.nombre}
      />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />

      {selectedProductId != null && (
        <ProductDetailModal
          productoId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  )
}
