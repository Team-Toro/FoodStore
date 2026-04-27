## MODIFIED Requirements

### Requirement: Transición PENDIENTE → CONFIRMADO exclusivamente por pago aprobado
La transición del estado `PENDIENTE` al estado `CONFIRMADO` SHALL ocurrir única y exclusivamente de forma automática cuando el sistema recibe y procesa un webhook de MercadoPago con estado `"approved"`. Ningún usuario (incluido ADMIN) SHALL poder ejecutar esta transición manualmente. El sistema SHALL delegar esta transición al FSM de pedidos (`cambiar_estado`) con `actor_rol = "SISTEMA"`.

#### Scenario: Transición automática por pago aprobado
- **WHEN** el webhook IPN de MP confirma un pago con `status = "approved"` para el `pedido_id` correspondiente
- **THEN** `cambiar_estado(uow, pedido_id, "CONFIRMADO", actor_rol="SISTEMA")` se ejecuta dentro de una transacción UoW
- **THEN** se registra en `HistorialEstadoPedido` con `estado_hasta = "CONFIRMADO"` y `actor_rol = "SISTEMA"`
- **THEN** el stock de cada `DetallePedido` se decrementa atómicamente

#### Scenario: Intento manual de transición PENDIENTE → CONFIRMADO rechazado
- **WHEN** cualquier usuario (CLIENT, PEDIDOS, ADMIN) intenta hacer `PATCH /api/v1/pedidos/{id}/estado` con `nuevo_estado = "CONFIRMADO"`
- **THEN** el sistema retorna HTTP 403 Forbidden con `code: "TRANSICION_NO_AUTORIZADA"`

#### Scenario: Decremento de stock atómico al confirmar
- **WHEN** el pedido transiciona a `CONFIRMADO`
- **THEN** el stock de cada producto en `DetallePedido` se decrementa por la cantidad correspondiente dentro de la misma transacción UoW (SELECT FOR UPDATE)
- **THEN** si algún producto no tiene stock suficiente en el momento de confirmar, la transacción se revierte y el pago queda en estado inconsistente (registrar como error y notificar)
