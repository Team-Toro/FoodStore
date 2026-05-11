// redesigned in us-009 (Phase 3 — Store: catalog, product, cart)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Trash2, X } from 'lucide-react'
import { useCartStore } from '../../../app/store/cartStore'
import { useUiStore } from '../../../app/store/uiStore'
import { usePaymentStore } from '../../../app/store/paymentStore'
import { useCrearPedido } from '../../../hooks/usePedidos'
import { crearPago } from '../api/pagosApi'
import type { CartItem } from '../../../types/cart'
import { mapCartToCrearPedidoRequest } from '../../../shared/helpers/mapCartToPedido'
import { DireccionSelector } from '../../direcciones/components/DireccionSelector'
import { apiClient } from '../../../api/axiosClient'
import { Drawer, DrawerHeader, DrawerTitle, DrawerBody, DrawerFooter } from '../../../shared/ui/Drawer'
import { Button } from '../../../shared/ui/Button'
import { Badge } from '../../../shared/ui/Badge'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { Dialog } from '../../../shared/ui/Dialog'

interface PriceChange {
  productoId: number
  nombre: string
  precioAnterior: number
  precioActual: number
}

// ---------------------------------------------------------------------------
// CartItemRow
// ---------------------------------------------------------------------------
interface CartItemRowProps {
  item: CartItem
}

function CartItemRow({ item }: CartItemRowProps): JSX.Element {
  const updateCantidad = useCartStore((s) => s.updateCantidad)
  const removeItem = useCartStore((s) => s.removeItem)

  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-b-0">
      {/* Thumbnail */}
      {item.imagenUrl ? (
        <img
          src={item.imagenUrl}
          alt={item.nombre}
          className="w-14 h-14 object-cover rounded-card flex-shrink-0 border border-border/50"
        />
      ) : (
        <div className="w-14 h-14 rounded-card bg-bg-subtle border border-border/50 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium text-fg text-sm leading-snug truncate">{item.nombre}</p>

        {item.exclusiones.length > 0 && (
          <p className="text-xs text-fg-muted mt-0.5 truncate">
            Sin: {item.exclusiones.join(', ')}
          </p>
        )}

        {/* Stepper */}
        <div className="flex items-center gap-2 mt-2">
          <div className="inline-flex items-center border border-border rounded-btn overflow-hidden">
            <button
              onClick={() => updateCantidad(item.productoId, item.cantidad - 1)}
              className="px-2 py-0.5 bg-bg-subtle hover:bg-bg-elevated text-fg text-sm transition-colors"
              aria-label="Disminuir cantidad"
            >
              −
            </button>
            <span className="px-2 text-sm font-medium min-w-[1.5rem] text-center text-fg">
              {item.cantidad}
            </span>
            <button
              onClick={() => updateCantidad(item.productoId, item.cantidad + 1)}
              className="px-2 py-0.5 bg-bg-subtle hover:bg-bg-elevated text-fg text-sm transition-colors"
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>
          <span className="text-xs text-fg-muted">${item.precio.toFixed(2)} c/u</span>
        </div>
      </div>

      {/* Line subtotal + remove */}
      <div className="flex flex-col items-end justify-between flex-shrink-0">
        <button
          onClick={() => removeItem(item.productoId)}
          className="text-fg-muted hover:text-danger transition-colors p-0.5 rounded"
          aria-label={`Eliminar ${item.nombre}`}
        >
          <X className="h-4 w-4" />
        </button>
        <span className="font-semibold text-fg text-sm">
          ${(item.precio * item.cantidad).toFixed(2)}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ClearCartModal
// ---------------------------------------------------------------------------
interface ClearCartModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ClearCartModal({ open, onConfirm, onCancel }: ClearCartModalProps): JSX.Element {
  return (
    <Dialog open={open} onClose={onCancel} aria-label="Vaciar carrito">
      <h3 className="text-lg font-semibold text-fg mb-2">Vaciar carrito</h3>
      <p className="text-fg-muted text-sm mb-6">
        ¿Seguro que querés eliminar todos los productos del carrito?
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" className="flex-1" onClick={onConfirm}>
          Vaciar
        </Button>
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// PriceChangedModal
// ---------------------------------------------------------------------------
interface PriceChangedModalProps {
  open: boolean
  changes: PriceChange[]
  onConfirm: () => void
  onCancel: () => void
}

function PriceChangedModal({ open, changes, onConfirm, onCancel }: PriceChangedModalProps): JSX.Element {
  return (
    <Dialog open={open} onClose={onCancel} aria-label="Precios actualizados">
      <h3 className="text-lg font-semibold text-fg mb-2">Precios actualizados</h3>
      <p className="text-fg-muted text-sm mb-4">
        Los siguientes productos cambiaron de precio desde que los agregaste al carrito:
      </p>
      <ul className="space-y-2 mb-5">
        {changes.map((c) => (
          <li key={c.productoId} className="text-sm flex justify-between items-center">
            <span className="text-fg font-medium truncate max-w-[160px]">{c.nombre}</span>
            <span className="text-fg-muted ml-2 flex-shrink-0">
              <span className="line-through text-danger-fg">${c.precioAnterior.toFixed(2)}</span>
              {' → '}
              <span className="text-success-fg font-semibold">${c.precioActual.toFixed(2)}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" className="flex-1" onClick={onConfirm}>
          Continuar
        </Button>
      </div>
    </Dialog>
  )
}

async function fetchPriceChanges(items: CartItem[]): Promise<PriceChange[]> {
  const results = await Promise.allSettled(
    items.map((item) =>
      apiClient
        .get<{ precio_base: number }>(`/api/v1/productos/${item.productoId}`)
        .then((res) => ({ item, precioActual: res.data.precio_base })),
    ),
  )
  const changes: PriceChange[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { item, precioActual } = result.value
      if (Math.abs(item.precio - precioActual) > 0.001) {
        changes.push({
          productoId: item.productoId,
          nombre: item.nombre,
          precioAnterior: item.precio,
          precioActual,
        })
      }
    }
  }
  return changes
}

// ---------------------------------------------------------------------------
// CartDrawer
// ---------------------------------------------------------------------------
export function CartDrawer(): JSX.Element | null {
  const cartOpen = useUiStore((s) => s.cartOpen)
  const closeCart = useUiStore((s) => s.closeCart)

  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal)
  const clearCart = useCartStore((s) => s.clearCart)
  const updatePrecio = useCartStore((s) => s.updatePrecio)
  // Reactive item count inline selector (avoids non-reactive function selector pattern)
  const itemCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.cantidad, 0))

  const [showClearModal, setShowClearModal] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [validating, setValidating] = useState(false)
  const [priceChanges, setPriceChanges] = useState<PriceChange[] | null>(null)
  const navigate = useNavigate()
  const crearPedido = useCrearPedido()
  const resetPayment = usePaymentStore((s) => s.resetPayment)
  const direccionSeleccionadaId = usePaymentStore((s) => s.direccionSeleccionadaId)

  const SHIPPING_COST = 500
  const conEnvio = typeof direccionSeleccionadaId === 'number'
  const costoEnvio = conEnvio ? SHIPPING_COST : 0
  const total = subtotal() + costoEnvio

  function handleGoToCatalogo() {
    closeCart()
    void navigate('/catalogo')
  }

  function handleConfirmClear() {
    clearCart()
    setShowClearModal(false)
  }

  function proceedCheckout() {
    resetPayment()
    const direccionId = typeof direccionSeleccionadaId === 'number' ? direccionSeleccionadaId : undefined
    const request = mapCartToCrearPedidoRequest(items, undefined, direccionId, costoEnvio)
    crearPedido.mutate(request, {
      onSuccess: async (pedido) => {
        closeCart()
        clearCart()
        try {
          setIsRedirecting(true)
          const pago = await crearPago(pedido.id)
          window.location.href = pago.init_point
        } catch {
          setIsRedirecting(false)
          setCheckoutError('Error al iniciar el pago. Podés intentarlo desde Mis Pedidos.')
          void navigate(`/pedidos/${pedido.id}`)
        }
      },
    })
  }

  async function handleCheckout() {
    setCheckoutError(null)
    setValidating(true)
    try {
      const changes = await fetchPriceChanges(items)
      if (changes.length > 0) {
        setPriceChanges(changes)
        return
      }
    } finally {
      setValidating(false)
    }
    proceedCheckout()
  }

  function handlePriceChangesConfirm() {
    if (priceChanges) {
      priceChanges.forEach((c) => updatePrecio(c.productoId, c.precioActual))
    }
    setPriceChanges(null)
    proceedCheckout()
  }

  if (!cartOpen) return null

  return (
    <>
      <Drawer
        open={cartOpen}
        onClose={closeCart}
        side="right"
        panelWidth="w-full max-w-sm"
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <DrawerHeader>
          <div className="flex items-center gap-2">
            <DrawerTitle>Tu carrito</DrawerTitle>
            {itemCount > 0 && (
              <Badge variant="brand">{itemCount}</Badge>
            )}
          </div>
          <button
            onClick={closeCart}
            className="text-fg-muted hover:text-fg transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Cerrar carrito"
          >
            <X className="h-5 w-5" />
          </button>
        </DrawerHeader>

        {/* Body — items or empty state */}
        <DrawerBody>
          {items.length === 0 ? (
            <div data-testid="cart-empty">
              <EmptyState
                icon={ShoppingBag}
                title="Tu carrito está vacío"
                description="Agregá productos del menú para comenzar tu pedido."
                action={
                  <Button variant="secondary" onClick={handleGoToCatalogo}>
                    Ver catálogo
                  </Button>
                }
              />
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <CartItemRow key={item.productoId} item={item} />
              ))}
            </div>
          )}
        </DrawerBody>

        {/* Sticky footer — only shown when cart has items */}
        {items.length > 0 && (
          <DrawerFooter className="space-y-4">
            {/* Delivery address selector */}
            <DireccionSelector />

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-fg-muted">
                <span>Subtotal</span>
                <span>${subtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-fg-muted">
                <span>Envío</span>
                <span>{costoEnvio === 0 ? 'Gratis' : `$${costoEnvio.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between font-bold text-fg text-base pt-2 border-t border-border">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={() => setShowClearModal(true)}
            >
              <Trash2 className="h-4 w-4" />
              Vaciar carrito
            </Button>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => void handleCheckout()}
              disabled={crearPedido.isPending || isRedirecting || validating}
              loading={crearPedido.isPending || isRedirecting || validating}
            >
              {isRedirecting
                ? 'Redirigiendo al pago...'
                : crearPedido.isPending
                  ? 'Creando pedido...'
                  : validating
                    ? 'Validando precios...'
                    : 'Confirmar y Pagar'}
            </Button>

            {(crearPedido.isError || checkoutError) && (
              <p className="text-xs text-danger-fg text-center">
                {checkoutError ?? 'Error al crear el pedido. Verificá el stock e intentá de nuevo.'}
              </p>
            )}
          </DrawerFooter>
        )}
      </Drawer>

      {/* Clear confirmation modal — only mounted when triggered */}
      {showClearModal && (
        <ClearCartModal
          open={showClearModal}
          onConfirm={handleConfirmClear}
          onCancel={() => setShowClearModal(false)}
        />
      )}

      {/* Price changed modal — only mounted when triggered */}
      {priceChanges && priceChanges.length > 0 && (
        <PriceChangedModal
          open
          changes={priceChanges}
          onConfirm={handlePriceChangesConfirm}
          onCancel={() => setPriceChanges(null)}
        />
      )}
    </>
  )
}
