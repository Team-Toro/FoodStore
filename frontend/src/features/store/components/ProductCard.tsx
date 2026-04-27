import type { Producto } from '../../../types/producto'
import { useCartStore } from '../../../app/store/cartStore'

interface ProductCardProps {
  producto: Producto
  onOpenModal: (productoId: number) => void
}

export function ProductCard({ producto, onOpenModal }: ProductCardProps): JSX.Element {
  const addItem = useCartStore((s) => s.addItem)
  const sinStock = producto.stock === 0

  function handleAddDirect(e: React.MouseEvent) {
    e.stopPropagation()
    if (sinStock) return
    addItem({
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
      imagenUrl: producto.imagen_url ?? '',
      exclusiones: [],
    })
  }

  return (
    <div
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col"
      onClick={() => onOpenModal(producto.id)}
      data-testid="product-card"
    >
      <div className="relative">
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400 text-sm">Sin imagen</span>
          </div>
        )}
        {sinStock && (
          <span
            className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded"
            data-testid="sin-stock-badge"
          >
            Sin stock
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-gray-900 line-clamp-2">{producto.nombre}</h3>

        {(producto.categorias ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(producto.categorias ?? []).map((cat) => (
              <span
                key={cat.id}
                className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
              >
                {cat.nombre}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-indigo-600">
            ${producto.precio.toFixed(2)}
          </span>
          <button
            onClick={handleAddDirect}
            disabled={sinStock}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}
