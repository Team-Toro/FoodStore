// redesigned in us-009 (Phase 3 — Store: catalog, product, cart)
import type { Producto } from '../../../types/producto'
import { useCartStore } from '../../../app/store/cartStore'
import { Card, CardBody, CardFooter } from '../../../shared/ui/Card'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'

interface ProductCardProps {
  producto: Producto
  onOpenModal: (productoId: number) => void
}

export function ProductCard({ producto, onOpenModal }: ProductCardProps): JSX.Element {
  const addItem = useCartStore((s) => s.addItem)
  const sinStock = producto.stock === 0
  const pocoStock = !sinStock && producto.stock < 5

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
    <Card
      variant="elevated"
      className="group cursor-pointer flex flex-col hover:-translate-y-1 transition-transform duration-200 hover:shadow-elevated"
      onClick={() => onOpenModal(producto.id)}
      data-testid="product-card"
    >
      {/* Image — 4:3 aspect ratio */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-bg-subtle">
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-fg-muted text-sm">Sin imagen</span>
          </div>
        )}

        {/* Stock badges — overlaid on image */}
        {sinStock && (
          <div className="absolute top-2 left-2">
            <Badge variant="danger" data-testid="sin-stock-badge">Sin stock</Badge>
          </div>
        )}
        {pocoStock && (
          <div className="absolute top-2 left-2">
            <Badge variant="warning" data-testid="poco-stock-badge">Poco stock</Badge>
          </div>
        )}
      </div>

      <CardBody className="flex flex-col gap-2 flex-1 px-4 pt-3 pb-2">
        <h3 className="font-semibold text-fg leading-snug line-clamp-2">{producto.nombre}</h3>

        {/* Category badges */}
        {(producto.categorias ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(producto.categorias ?? []).map((cat) => (
              <Badge key={cat.id} variant="brand">
                {cat.nombre}
              </Badge>
            ))}
          </div>
        )}

        {/* Price */}
        <p className="text-brand-600 font-bold text-lg mt-auto">
          ${producto.precio.toFixed(2)}
        </p>
      </CardBody>

      {/* Add button — full width at card bottom */}
      <CardFooter className="px-4 pb-4 pt-0">
        <Button
          variant="primary"
          size="md"
          disabled={sinStock}
          onClick={handleAddDirect}
          className="w-full"
        >
          Agregar
        </Button>
      </CardFooter>
    </Card>
  )
}
