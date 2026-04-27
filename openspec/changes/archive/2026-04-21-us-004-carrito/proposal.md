## Why

El cliente necesita poder explorar el catálogo de productos, armar su pedido seleccionando cantidades y personalizaciones (exclusión de ingredientes), y revisar el resumen del carrito antes de confirmar. Sin esta capa de interacción, no hay forma de avanzar al checkout ni crear pedidos. Esta es la cuarta entrega del orden de implementación establecido, y sus stores/componentes son prerequisito directo de `us-005-pedidos`.

## What Changes

- **Nuevo**: `cartStore.ts` — store Zustand completo con acciones `addItem`, `removeItem`, `updateCantidad`, `clearCart`, selectores derivados `subtotal()`, `costoEnvio()`, `total()`, `itemCount()`. Persiste `items[]` completos en localStorage via middleware `persist` (v1).
- **Nuevo**: Tipos TypeScript `CartItem` en `types/cart.ts` — `{ productoId, nombre, precio, cantidad, imagenUrl, exclusiones: number[] }`.
- **Nuevo**: `features/store/` — página de catálogo con grid de productos (`ProductGrid`, `ProductCard`), barra de búsqueda y filtro por categoría, `CartDrawer` lateral.
- **Nuevo**: `ProductDetailModal` — modal que muestra detalle del producto y permite seleccionar ingredientes a excluir (checkboxes) antes de agregar al carrito.
- **Nuevo**: hooks `useProductos` y `useProductoDetalle` — encapsulan `GET /api/v1/productos` y `GET /api/v1/productos/{id}` via TanStack Query.
- **Nuevo**: `CartSummary` — resumen de items con subtotales, exclusiones visibles y total general. Estado vacío con link al catálogo.
- **Nuevo**: Badge de cantidad flotante en el ícono de carrito (integrado en Navbar).
- **Modificado**: `uiStore.ts` — agregar acciones `openCart()` / `closeCart()` si no existen aún.

No hay cambios de backend — el carrito es 100% client-side (RN-CR01).

## Capabilities

### New Capabilities

- `catalogo-productos`: Visualización paginada del catálogo público (`disponible=true`), búsqueda por nombre, filtro por categoría, vista de detalle de producto con lista de ingredientes.
- `carrito-cliente`: Estado global del carrito (Zustand + localStorage), acciones CRUD sobre ítems, personalización por ingredientes excluidos, cálculo reactivo de totales.

### Modified Capabilities

- `authz`: Sin cambios de requisitos. El carrito es accesible para usuarios no autenticados (se valida autenticación sólo al hacer checkout).

## Impact

- **Frontend**: nuevos archivos en `frontend/src/features/store/`, `frontend/src/app/store/cartStore.ts`, `frontend/src/types/cart.ts`, hooks en `frontend/src/hooks/`.
- **Backend**: ninguno — endpoints `GET /api/v1/productos` y `GET /api/v1/productos/{id}` ya implementados en `us-003-productos`.
- **Dependencias npm**: ninguna nueva — Zustand, TanStack Query y Tailwind ya instalados.
- **Siguiente change**: `us-005-pedidos` depende directamente del `cartStore` (lee `items` al crear el pedido) y de `useProductos` para la validación pre-checkout.
