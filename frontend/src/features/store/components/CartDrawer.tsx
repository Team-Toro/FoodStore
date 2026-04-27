import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../../../app/store/cartStore'
import { useUiStore } from '../../../app/store/uiStore'
import { usePaymentStore } from '../../../app/store/paymentStore'
import { useCrearPedido } from '../../../hooks/usePedidos'
import { crearPago } from '../api/pagosApi'
import type { CartItem } from '../../../types/cart'
import { mapCartToCrearPedidoRequest } from '../../../shared/helpers/mapCartToPedido'
import { DireccionSelector } from '../../direcciones/components/DireccionSelector'
import { apiClient } from '../../../api/axiosClient'

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
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      {item.imagenUrl && (
        <img
          src={item.imagenUrl}
          alt={item.nombre}
          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{item.nombre}</p>

        {item.exclusiones.length > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">
            Sin: {item.exclusiones.join(', ')}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2">
          {/* Stepper */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <button
              onClick={() => updateCantidad(item.productoId, item.cantidad - 1)}
              className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm"
              aria-label="Disminuir cantidad"
            >
              −
            </button>
            <span className="px-2 text-sm font-medium min-w-[1.5rem] text-center">
              {item.cantidad}
            </span>
            <button
              onClick={() => updateCantidad(item.productoId, item.cantidad + 1)}
              className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm"
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>

          <span className="text-sm text-gray-500">
            ${item.precio.toFixed(2)} c/u
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end justify-between flex-shrink-0">
        <button
          onClick={() => removeItem(item.productoId)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Eliminar ítem"
        >
          ✕
        </button>
        <span className="font-semibold text-gray-900 text-sm">
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
  onConfirm: () => void
  onCancel: () => void
}

function ClearCartModal({ onConfirm, onCancel }: ClearCartModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Vaciar carrito</h3>
        <p className="text-gray-600 text-sm mb-6">
          ¿Seguro que querés eliminar todos los productos del carrito?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Vaciar
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PriceChangedModal
// ---------------------------------------------------------------------------
interface PriceChangedModalProps {
  changes: PriceChange[]
  onConfirm: () => void
  onCancel: () => void
}

function PriceChangedModal({ changes, onConfirm, onCancel }: PriceChangedModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Precios actualizados</h3>
        <p className="text-gray-600 text-sm mb-4">
          Los siguientes productos cambiaron de precio desde que los agregaste al carrito:
        </p>
        <ul className="space-y-2 mb-5">
          {changes.map((c) => (
            <li key={c.productoId} className="text-sm flex justify-between items-center">
              <span className="text-gray-800 font-medium truncate max-w-[160px]">{c.nombre}</span>
              <span className="text-gray-500 ml-2 flex-shrink-0">
                <span className="line-through text-red-400">${c.precioAnterior.toFixed(2)}</span>
                {' → '}
                <span className="text-green-600 font-semibold">${c.precioActual.toFixed(2)}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
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
export function CartDrawer(): JSX.Element {
  const cartOpen = useUiStore((s) => s.cartOpen)
  const closeCart = useUiStore((s) => s.closeCart)

  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal)
  const clearCart = useCartStore((s) => s.clearCart)
  const updatePrecio = useCartStore((s) => s.updatePrecio)

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

  if (!cartOpen) return <></>

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Tu carrito</h2>
          <button
            onClick={closeCart}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Cerrar carrito"
          >
            ×
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-full text-center gap-4"
              data-testid="cart-empty"
            >
              <p className="text-gray-500 text-lg">Tu carrito está vacío</p>
              <button
                onClick={handleGoToCatalogo}
                className="text-indigo-600 hover:underline text-sm font-medium"
              >
                Ver catálogo
              </button>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <CartItemRow key={item.productoId} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer — only shown when cart has items */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            {/* Delivery address selector */}
            <DireccionSelector />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Envío</span>
                <span>{costoEnvio === 0 ? 'Gratis' : `$${costoEnvio.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowClearModal(true)}
              className="w-full border border-red-300 text-red-600 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors"
            >
              Vaciar carrito
            </button>

            <button
              onClick={() => void handleCheckout()}
              disabled={crearPedido.isPending || isRedirecting || validating}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRedirecting
                ? 'Redirigiendo al pago...'
                : crearPedido.isPending
                  ? 'Creando pedido...'
                  : validating
                    ? 'Validando precios...'
                    : 'Confirmar y Pagar'}
            </button>
            {(crearPedido.isError || checkoutError) && (
              <p className="text-xs text-red-600 text-center">
                {checkoutError ?? 'Error al crear el pedido. Verificá el stock e intentá de nuevo.'}
              </p>
            )}
          </div>
        )}
      </aside>

      {/* Clear confirmation modal */}
      {showClearModal && (
        <ClearCartModal
          onConfirm={handleConfirmClear}
          onCancel={() => setShowClearModal(false)}
        />
      )}

      {/* Price changed modal */}
      {priceChanges && priceChanges.length > 0 && (
        <PriceChangedModal
          changes={priceChanges}
          onConfirm={handlePriceChangesConfirm}
          onCancel={() => setPriceChanges(null)}
        />
      )}
    </>
  )
}
