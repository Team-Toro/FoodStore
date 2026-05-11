// redesigned in us-009 (Phase 3 — Store: catalog, product, cart)
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useProductoDetalle } from '../../../hooks/useProductoDetalle'
import { useCartStore } from '../../../app/store/cartStore'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../../shared/ui/Dialog'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { cn } from '../../../shared/lib/cn'

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

  const totalPrice = producto ? producto.precio * cantidad : 0

  return (
    <Dialog
      open
      onClose={onClose}
      aria-label={producto?.nombre ?? 'Detalle del producto'}
      className="max-w-[min(95vw,48rem)] w-full"
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton height="h-56" className="rounded-lg" />
          <Skeleton height="h-6" width="w-3/4" />
          <Skeleton height="h-4" width="w-full" />
          <Skeleton height="h-4" width="w-5/6" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="text-center py-8">
          <p className="text-danger font-medium">Error al cargar el producto. Intentá nuevamente.</p>
          <Button variant="ghost" size="sm" className="mt-4" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      )}

      {/* Product content */}
      {producto && (
        <>
          {/* Two-column at md+ */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left — large image area */}
            <div className="md:w-5/12 shrink-0">
              {producto.imagen_url ? (
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className="w-full aspect-[4/3] object-cover rounded-card"
                />
              ) : (
                <div className="w-full aspect-[4/3] rounded-card bg-bg-subtle flex items-center justify-center">
                  <span className="text-fg-muted text-sm">Sin imagen</span>
                </div>
              )}
            </div>

            {/* Right — details */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <DialogHeader className="mb-0">
                <DialogTitle className="text-xl">{producto.nombre}</DialogTitle>
              </DialogHeader>

              {/* Price */}
              <p className="text-2xl font-bold text-brand-600">
                ${producto.precio.toFixed(2)}
              </p>

              {/* Description */}
              {producto.descripcion && (
                <p className="text-fg-muted text-sm leading-relaxed">{producto.descripcion}</p>
              )}

              {/* Categories */}
              {producto.categorias.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {producto.categorias.map((cat) => (
                    <Badge key={cat.id} variant="brand">
                      {cat.nombre}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Ingredient exclusion — pill-style Badge toggles */}
              {producto.ingredientes.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-fg mb-2">
                    Personalización — tocá para excluir:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {producto.ingredientes.map((ing) => {
                      const excluded = exclusiones.includes(ing.id)
                      return (
                        <button
                          key={ing.id}
                          type="button"
                          onClick={() => toggleExclusion(ing.id)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-badge px-3 py-1 text-xs font-medium border transition-all duration-150',
                            excluded
                              ? 'bg-danger-bg text-danger-fg border-danger/30 line-through opacity-70'
                              : 'bg-bg-subtle text-fg-muted border-border hover:border-brand-400 hover:text-fg',
                          )}
                          aria-pressed={excluded}
                        >
                          {ing.nombre}
                          {ing.es_alergeno && (
                            <AlertTriangle
                              className="h-3 w-3 text-warning-fg shrink-0"
                              aria-label="alérgeno"
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Quantity stepper */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-fg">Cantidad:</span>
                <div className="inline-flex items-center border border-border rounded-btn overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                    className="px-3 py-2 bg-bg-subtle hover:bg-bg-elevated text-fg font-medium transition-colors"
                    aria-label="Disminuir cantidad"
                  >
                    −
                  </button>
                  <span className="px-4 py-2 text-fg font-semibold min-w-[2.5rem] text-center text-sm">
                    {cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCantidad((c) => c + 1)}
                    className="px-3 py-2 bg-bg-subtle hover:bg-bg-elevated text-fg font-medium transition-colors"
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer — price total + CTA */}
          <DialogFooter className="mt-6 flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="text-sm text-fg-muted">
              Total:{' '}
              <span className="text-lg font-bold text-fg">${totalPrice.toFixed(2)}</span>
            </div>
            <Button
              variant="primary"
              size="lg"
              disabled={producto.stock === 0}
              onClick={handleAddToCart}
              className="sm:ml-auto"
            >
              {producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  )
}
