import type { Producto } from '../../../types/producto'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  productos: Producto[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onOpenModal: (productoId: number) => void
  searchTerm?: string
}

function SkeletonCard(): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-gray-200" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="flex items-center justify-between mt-2">
          <div className="h-5 bg-gray-200 rounded w-16" />
          <div className="h-8 bg-gray-200 rounded w-20" />
        </div>
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
  searchTerm,
}: ProductGridProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 font-medium mb-4">Error al cargar productos</p>
        <button
          onClick={onRetry}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (productos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        {searchTerm
          ? `No se encontraron productos para "${searchTerm}"`
          : 'No hay productos disponibles'}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {productos.map((p) => (
        <ProductCard key={p.id} producto={p} onOpenModal={onOpenModal} />
      ))}
    </div>
  )
}
