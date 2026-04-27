import { useState } from 'react'
import { useProductoDetalle } from '../../../hooks/useProductoDetalle'
import { useCartStore } from '../../../app/store/cartStore'

interface ProductDetailModalProps {
  productoId: number
  onClose: () => void
}

export function ProductDetailModal({ productoId, onClose }: ProductDetailModalProps): JSX.Element {
  const { data: producto, isLoading, isError } = useProductoDetalle(productoId)
  const addItem = useCartStore((s) => s.addItem)

  const [cantidad, setCantidad] = useState(1)
  const [exclusiones, setExclusiones] = useState<number[]>([])

  function toggleExclusion(ingredienteId: number) {
    setExclusiones((prev) =>
      prev.includes(ingredienteId)
        ? prev.filter((id) => id !== ingredienteId)
        : [...prev, ingredienteId],
    )
  }

  function handleAddToCart() {
    if (!producto) return
    addItem({
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad,
      imagenUrl: producto.imagen_url ?? '',
      exclusiones,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isLoading ? 'Cargando...' : (producto?.nombre ?? 'Detalle del producto')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading && (
            <div className="space-y-3 animate-pulse">
              <div className="w-full h-48 bg-gray-200 rounded-lg" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          )}

          {isError && (
            <p className="text-red-600 text-center py-8">
              Error al cargar el producto. Intenta nuevamente.
            </p>
          )}

          {producto && (
            <div className="space-y-4">
              {/* Image */}
              {producto.imagen_url ? (
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">Sin imagen</span>
                </div>
              )}

              {/* Price */}
              <p className="text-2xl font-bold text-indigo-600">
                ${producto.precio.toFixed(2)}
              </p>

              {/* Description */}
              {producto.descripcion && (
                <p className="text-gray-600 text-sm">{producto.descripcion}</p>
              )}

              {/* Categories */}
              {producto.categorias.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {producto.categorias.map((cat) => (
                    <span
                      key={cat.id}
                      className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
                    >
                      {cat.nombre}
                    </span>
                  ))}
                </div>
              )}

              {/* Ingredients */}
              {producto.ingredientes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Ingredientes — seleccioná los que querés excluir:
                  </h3>
                  <ul className="space-y-2">
                    {producto.ingredientes.map((ing) => (
                      <li key={ing.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`ing-${ing.id}`}
                          checked={exclusiones.includes(ing.id)}
                          onChange={() => toggleExclusion(ing.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                        />
                        <label
                          htmlFor={`ing-${ing.id}`}
                          className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer"
                        >
                          {ing.nombre}
                          {ing.es_alergeno && (
                            <span
                              title="Alérgeno"
                              className="text-orange-500 font-bold text-xs"
                              aria-label="alérgeno"
                            >
                              ⚠
                            </span>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Cantidad:</span>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
                  >
                    −
                  </button>
                  <span className="px-4 py-1.5 text-gray-900 font-semibold min-w-[2.5rem] text-center">
                    {cantidad}
                  </span>
                  <button
                    onClick={() => setCantidad((c) => c + 1)}
                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {producto && (
          <div className="p-4 border-t">
            <button
              onClick={handleAddToCart}
              disabled={producto.stock === 0}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
