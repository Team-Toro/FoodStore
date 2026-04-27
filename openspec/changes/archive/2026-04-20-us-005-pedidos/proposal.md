## Why

Food Store necesita un sistema de pedidos completo para que los clientes puedan confirmar su carrito y recibir sus productos. Sin este módulo, el flujo de compra queda interrumpido entre el carrito (ya implementado) y el pago con MercadoPago (us-006), ya que el pedido es la entidad central que conecta ambos dominios.

## What Changes

- **Nuevo endpoint** `POST /api/v1/pedidos`: crea un pedido desde el carrito activo del cliente autenticado, con snapshot de precios y dirección, en una única transacción UoW.
- **Nuevo endpoint** `GET /api/v1/pedidos`: listado paginado de pedidos — el CLIENT ve solo los suyos; PEDIDOS y ADMIN ven todos. Soporta filtro por estado.
- **Nuevo endpoint** `GET /api/v1/pedidos/{id}`: detalle completo con líneas (snapshots), historial de estados y estado de pago.
- **Nuevo endpoint** `PATCH /api/v1/pedidos/{id}/estado`: avanza el estado del pedido según la FSM definida, validado en la capa de servicio. Incluye restauración de stock atómica al cancelar desde CONFIRMADO.
- **Nuevo endpoint** `GET /api/v1/pedidos/{id}/historial`: historial append-only de transiciones, ordenado por `created_at ASC`.
- **FSM de 6 estados** implementada en `service.py`: PENDIENTE → CONFIRMADO → EN_PREP → EN_CAMINO → ENTREGADO, con ramificación a CANCELADO según el rol del actor.
- **Snapshot Pattern**: `DetallePedido.nombre_snapshot` y `precio_snapshot` capturan nombre y precio del producto al momento de creación. Inmutables.
- **Audit trail append-only**: toda transición de estado genera un `INSERT` en `HistorialEstadoPedido`. Nunca `UPDATE` ni `DELETE`.
- **Stock atómico**: decremento al confirmar (PENDIENTE → CONFIRMADO); restauración al cancelar desde CONFIRMADO.
- **Frontend**: páginas `MisPedidos`, `DetallePedido`, vista de gestión para rol PEDIDOS, integración con `cartStore` (vaciar carrito post-creación).

## Capabilities

### New Capabilities

- `pedidos`: Sistema completo de pedidos con FSM de 6 estados, snapshot pattern, audit trail append-only, control de stock atómico y RBAC por rol. Cubre creación, listado, detalle, transiciones de estado e historial.

### Modified Capabilities

- `productos`: El stock se decrementa y restaura desde el módulo de pedidos. No cambia el contrato del spec existente, pero el servicio de pedidos interactúa directamente con `ProductoRepository` dentro del mismo UoW.

## Impact

- **Backend nuevo**: `app/modules/pedidos/model.py`, `schemas.py`, `repository.py`, `service.py`, `router.py` — implementación completa.
- **Backend modificado**: `app/main.py` para incluir el router de pedidos; `app/core/uow.py` para exponer `uow.pedidos`.
- **Base de datos**: tablas `Pedido`, `DetallePedido`, `HistorialEstadoPedido` ya en ERD v5 (Alembic migration nueva).
- **Frontend nuevo**: páginas `MisPedidos`, `DetallePedido`; feature `pedidos` con hooks `usePedidos`, `usePedidoDetail`, `useCambiarEstado`; componente `HistorialTimeline`.
- **Frontend modificado**: `cartStore` — acción `clearCart()` ejecutada post-creación de pedido; `CheckoutForm` para conectar carrito → pedido.
- **Dependencias**: `us-004-carrito` (prerequisito), `us-006-pagos-mercadopago` (depende de este módulo para avanzar PENDIENTE → CONFIRMADO vía webhook).
