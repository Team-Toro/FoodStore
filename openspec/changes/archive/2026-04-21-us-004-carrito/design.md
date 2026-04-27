## Context

`us-003-productos` ya implementó los endpoints `GET /api/v1/productos` (listado paginado con filtros) y `GET /api/v1/productos/{id}` (detalle con ingredientes). Esta entrega construye exclusivamente sobre el frontend: el catálogo visual, el store del carrito y la UI de personalización.

El carrito no tiene backend: es estado cliente puro (RN-CR01). Los pedidos se crean en `us-005-pedidos` a partir de los datos que este store expone. El contrato entre ambos cambios es el tipo `CartItem` y las acciones del store.

## Goals / Non-Goals

**Goals:**

- Implementar `cartStore.ts` completo con todas las acciones y selectores derivados especificados en `Integrador.txt`.
- Construir el catálogo de productos (`features/store/`) con grid paginado, búsqueda y filtro por categoría.
- Implementar el `CartDrawer` con resumen de ítems, exclusiones visibles y total.
- Implementar `ProductDetailModal` con selección de ingredientes a excluir.
- Crear hooks `useProductos` y `useProductoDetalle` (TanStack Query).
- Respetar la separación estricta: Zustand ↔ estado cliente, TanStack Query ↔ estado servidor.

**Non-Goals:**

- Checkout y creación de pedidos (→ `us-005-pedidos`).
- Validación de stock en tiempo real al agregar al carrito (validación definitiva ocurre en `POST /api/v1/pedidos`).
- Autenticación requerida para navegar el catálogo o armar el carrito.
- Tests E2E (se cubren en el change de testing dedicado).

## Decisions

### D-01: Carrito completamente client-side sin sincronización backend

**Decisión**: el carrito vive únicamente en Zustand + localStorage. No existe endpoint de carrito.

**Alternativas consideradas**:
- _Carrito en DB_: requeriría auth obligatoria, sesiones servidor, y endpoints adicionales. Complejidad innecesaria para el scope del proyecto.
- _sessionStorage_: no persiste entre pestañas ni recargas.

**Rationale**: RN-CR01 es explícita. La persistencia en localStorage cubre el caso de uso (RN-CR02). El snapshot de precios al crear el pedido (RN-PE02) garantiza consistencia aunque el precio haya cambiado en DB.

---

### D-02: Clave de ítem en el carrito es `productoId` (sin exclusiones en la clave)

**Decisión**: un mismo producto ocupa un único slot en el carrito; agregar el mismo producto de nuevo incrementa la cantidad (RN-CR03). Las exclusiones se sobreescriben con las del último `addItem` para ese producto.

**Alternativas consideradas**:
- _Clave compuesta `productoId + hash(exclusiones)`_: permitiría el mismo producto con diferentes exclusiones como ítems separados. Más flexible pero confuso para el usuario y más complejo de manejar al crear el pedido.

**Rationale**: la spec US-029 y RN-CR03 son explícitas: "si el producto ya está en el carrito, se incrementa la cantidad". La personalización se edita vía el `ProductDetailModal` antes de agregar.

---

### D-03: `costoEnvio` fijo en el store (no calculado por backend)

**Decisión**: `costoEnvio()` retorna un valor fijo (ej. 500 ARS) o cero si el subtotal supera cierto umbral. Lógica en el store.

**Alternativas consideradas**:
- _Calculado por backend al crear el pedido_: más preciso pero requiere un endpoint adicional y consulta adicional.

**Rationale**: la spec del proyecto no define reglas de envío dinámicas. El total final authoritative es el que calcula el backend al crear el pedido (RN-PE08).

---

### D-04: TanStack Query para datos de productos; nunca en Zustand

**Decisión**: `useProductos` y `useProductoDetalle` usan `useQuery` de TanStack Query. El `cartStore` guarda snapshots de precio y nombre al momento de `addItem` — no consulta el store de servidor.

**Alternativas consideradas**:
- _Guardar productos en Zustand también_: causaría duplicación de estado y violación de la separación Zustand/TanStack Query.

**Rationale**: el `CLAUDE.md` y `Integrador.txt` son explícitos: Zustand = estado cliente, TanStack Query = estado servidor. El snapshot en el ítem del carrito (`precio`, `nombre`) es intencional: si el precio cambia en DB, el carrito muestra el precio al que el usuario lo agregó (y al crear el pedido se hace la validación de cambio de precio US-070).

---

### D-05: `CartDrawer` como sidebar deslizable (no página separada)

**Decisión**: el carrito es un `<Drawer>` lateral controlado por `uiStore.cartOpen`. No existe ruta `/carrito`.

**Rationale**: UX estándar de e-commerce. Permite al usuario ver el carrito sin perder el contexto del catálogo. `uiStore.openCart()` / `closeCart()` controlan la visibilidad.

## Risks / Trade-offs

- **[Riesgo] Precio stale en carrito** → Al crear el pedido, `us-005-pedidos` debe comparar `CartItem.precio` vs `producto.precio` actual (US-070) y notificar al usuario si hay diferencia. El backend siempre usa el precio actual al generar el snapshot, por lo que el riesgo de cobro incorrecto es nulo.
- **[Riesgo] Stock no validado al agregar al carrito** → El usuario puede agregar items sin stock. La validación ocurre en el backend al `POST /api/v1/pedidos` (RN-PE04). En el frontend se puede mostrar un badge "Sin stock" consultando `product.stock` pero no bloquear el carrito.
- **[Trade-off] Exclusiones sobreescritas al re-agregar** → Si el usuario agrega el mismo producto con diferentes exclusiones en dos momentos, las exclusiones del segundo llamado reemplazan las del primero. Esto simplifica la UX y el modelo de datos a costa de algo de flexibilidad.
- **[Riesgo] localStorage lleno** → Improbable con pocos items, pero ante error de escritura Zustand `persist` falla silenciosamente. No requiere mitigación ahora.

## Migration Plan

No hay migraciones de base de datos. El despliegue es incremental:

1. Mergear `us-004-carrito` → la feature de catálogo y carrito queda disponible.
2. `us-005-pedidos` puede comenzar en paralelo dado que el contrato `CartItem` está definido por este change.
3. Si `cartStore.ts` ya existe con implementación parcial, extenderlo sin romper las suscripciones existentes (las acciones nuevas son aditivas).

## Open Questions

- ¿El costo de envío tiene una regla de negocio definida (monto mínimo para envío gratis)? Por ahora se implementa como constante configurable (`SHIPPING_COST = 500`).
- ¿El catálogo debe mostrar productos sin stock con badge "Agotado" o simplemente ocultarlos? El backend filtra por `disponible=true` pero el stock puede ser 0. Se implementa con badge visible para mejor UX.
