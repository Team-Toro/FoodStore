## 1. Tipos y Contratos

- [x] 1.1 Crear `frontend/src/types/cart.ts` con interfaz `CartItem { productoId: number; nombre: string; precio: number; cantidad: number; imagenUrl: string; exclusiones: number[] }` y tipo `CartState`
- [x] 1.2 Verificar/actualizar `frontend/src/types/producto.ts` con campos `ingredientes: Ingrediente[]` en `ProductoDetail` (usado por el modal de personalización)

## 2. Zustand cartStore

- [x] 2.1 Crear/completar `frontend/src/app/store/cartStore.ts` con estado `items: CartItem[]` e implementar acción `addItem(item: CartItem)` — si el producto ya existe, incrementa cantidad (no duplica)
- [x] 2.2 Implementar acción `removeItem(productoId: number)` — elimina el ítem del array
- [x] 2.3 Implementar acción `updateCantidad(productoId: number, cantidad: number)` — si cantidad <= 0, llama `removeItem`
- [x] 2.4 Implementar acción `clearCart()` — vacía el array completo
- [x] 2.5 Implementar selector `subtotal(): number` — suma de `item.precio * item.cantidad`
- [x] 2.6 Implementar selector `costoEnvio(): number` — constante `SHIPPING_COST = 500` (0 si subtotal === 0)
- [x] 2.7 Implementar selector `total(): number` — `subtotal() + costoEnvio()`
- [x] 2.8 Implementar selector `itemCount(): number` — suma de todas las cantidades
- [x] 2.9 Configurar middleware `persist` con `name: 'cart-storage'` y `version: 1` (persiste `items` completo en localStorage)

## 3. Zustand uiStore — acciones de carrito

- [x] 3.1 Verificar/agregar en `frontend/src/app/store/uiStore.ts` las acciones `openCart()` y `closeCart()` con estado booleano `cartOpen`

## 4. Hooks TanStack Query

- [x] 4.1 Crear `frontend/src/hooks/useProductos.ts` — `useQuery` sobre `GET /api/v1/productos` con params `{ page, size, nombre?, categoria_id? }`, staleTime 60s
- [x] 4.2 Crear `frontend/src/hooks/useProductoDetalle.ts` — `useQuery` sobre `GET /api/v1/productos/{id}`, habilitado solo cuando `id` es definido, staleTime 60s
- [x] 4.3 Crear `frontend/src/hooks/useCategorias.ts` — `useQuery` sobre `GET /api/v1/categorias` para poblar el selector de filtro (si no existe ya)

## 5. Componentes del Catálogo

- [x] 5.1 Crear `frontend/src/features/store/components/ProductCard.tsx` — muestra nombre, imagen, precio, categorías, badge "Sin stock" si `stock === 0`, botón "Agregar" (deshabilitado si sin stock)
- [x] 5.2 Crear `frontend/src/features/store/components/ProductGrid.tsx` — grid CSS con `ProductCard[]` + skeleton loaders (estado `isLoading`) + mensaje de error con botón "Reintentar"
- [x] 5.3 Crear `frontend/src/features/store/components/CatalogoFilters.tsx` — input de búsqueda con debounce 300ms + selector de categoría, controlado por estado local que pasa params a `useProductos`
- [x] 5.4 Crear `frontend/src/features/store/components/PaginationControls.tsx` — botones prev/next con total de páginas calculado desde respuesta paginada
- [x] 5.5 Crear `frontend/src/features/store/pages/CatalogoPage.tsx` — ensambla `CatalogoFilters` + `ProductGrid` + `PaginationControls`, maneja estado de `page` y filtros

## 6. Modal de Detalle y Personalización

- [x] 6.1 Crear `frontend/src/features/store/components/ProductDetailModal.tsx` — modal que recibe `productoId`, carga detalle con `useProductoDetalle`, muestra imagen, descripción, ingredientes con checkboxes, input de cantidad y botón "Agregar al carrito"
- [x] 6.2 Implementar lógica de exclusiones en `ProductDetailModal`: checkboxes sobre `producto.ingredientes`, ícono de alérgeno para `es_alergeno=true`, estado local `exclusiones: number[]`
- [x] 6.3 Al confirmar en el modal, llamar `cartStore.addItem({ productoId, nombre, precio, cantidad, imagenUrl, exclusiones })` y cerrar el modal
- [x] 6.4 Conectar apertura del modal desde `ProductCard` (clic en la tarjeta abre el modal; el botón "Agregar" con cantidad 1 agrega directo sin modal)

## 7. CartDrawer

- [x] 7.1 Crear `frontend/src/features/store/components/CartDrawer.tsx` — drawer lateral controlado por `uiStore.cartOpen`, se cierra con overlay o botón X
- [x] 7.2 Implementar `CartItemRow` dentro del drawer: muestra nombre, exclusiones (nombres de ingredientes), stepper de cantidad (+/-), precio unitario, subtotal, botón eliminar
- [x] 7.3 Implementar estado vacío del drawer: mensaje "Tu carrito está vacío" con botón que cierra el drawer y navega al catálogo
- [x] 7.4 Implementar footer del drawer: desglose subtotal / costo de envío / total (2 decimales), botón "Vaciar carrito" (abre modal de confirmación), botón "Ir al checkout" (deshabilitado si carrito vacío — activo en us-005)
- [x] 7.5 Implementar modal de confirmación de vaciado: al confirmar llama `cartStore.clearCart()`

## 8. Navbar — Badge del carrito

- [x] 8.1 Agregar ícono de carrito en `frontend/src/components/Navbar.tsx` (o componente equivalente) con badge que muestra `useCartStore(s => s.itemCount())` cuando > 0
- [x] 8.2 Al hacer clic en el ícono del carrito, llamar `uiStore.openCart()` para abrir el `CartDrawer`

## 9. Routing

- [x] 9.1 Registrar ruta `/catalogo` (o `/`) en el router de la app que renderiza `CatalogoPage`
- [x] 9.2 Incluir `CartDrawer` en el layout global (fuera del router de páginas) para que esté disponible en todas las rutas

## 10. Tests

- [x] 10.1 Escribir tests unitarios con Vitest para `cartStore`: `addItem`, `removeItem`, `updateCantidad`, `clearCart`, `total()`
- [x] 10.2 Escribir test de `addItem` con producto duplicado — verificar que incrementa cantidad y no duplica
- [x] 10.3 Escribir test de `updateCantidad` con cantidad = 0 — verificar que elimina el ítem
- [x] 10.4 Escribir test de componente `ProductCard` con Testing Library: renderiza nombre, precio y badge "Sin stock" cuando `stock = 0`
- [x] 10.5 Escribir test de componente `CartDrawer` en estado vacío: muestra mensaje correcto
