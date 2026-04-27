## ADDED Requirements

### Requirement: Crear pago con MercadoPago
El sistema SHALL crear una preferencia de pago en MercadoPago para un pedido en estado `PENDIENTE`. La respuesta SHALL incluir el `init_point` (URL de redirección al checkout de MP). El backend SHALL generar un `idempotency_key` UUID único por intento de pago y almacenar un registro `Pago` con `mp_status = "pending"` antes de retornar. Solo el cliente propietario del pedido puede iniciar el pago.

#### Scenario: Cliente inicia pago de su pedido pendiente
- **WHEN** un cliente autenticado hace `POST /api/v1/pagos/crear` con `{ "pedido_id": 42 }`
- **THEN** el sistema retorna HTTP 201 con `{ "pago_id": ..., "init_point": "https://www.mercadopago.com.ar/...", "mp_status": "pending" }`

#### Scenario: Pedido no pertenece al cliente
- **WHEN** un cliente hace `POST /api/v1/pagos/crear` con el `pedido_id` de otro cliente
- **THEN** el sistema retorna HTTP 403 Forbidden

#### Scenario: Pedido no está en estado PENDIENTE
- **WHEN** un cliente intenta pagar un pedido que ya está en `CONFIRMADO`, `EN_PREP`, `EN_CAMINO`, `ENTREGADO` o `CANCELADO`
- **THEN** el sistema retorna HTTP 409 Conflict con `code: "PEDIDO_NO_PENDIENTE"`

#### Scenario: Pedido no existe
- **WHEN** el `pedido_id` no corresponde a ningún pedido
- **THEN** el sistema retorna HTTP 404 Not Found

---

### Requirement: Procesar webhook IPN de MercadoPago
El sistema SHALL exponer `POST /api/v1/pagos/webhook` como endpoint público. El endpoint SHALL responder HTTP 200 inmediatamente sin esperar el resultado del procesamiento. El procesamiento SHALL ocurrir de forma asíncrona (BackgroundTasks). Antes de aplicar cualquier cambio de estado, el sistema SHALL verificar el estado real del pago consultando la API de MercadoPago con el `mp_payment_id` recibido en la notificación.

#### Scenario: Webhook con pago aprobado
- **WHEN** MercadoPago envía `POST /api/v1/pagos/webhook` con `{ "topic": "payment", "id": "<mp_payment_id>" }` y el estado real consultado en la API de MP es `"approved"`
- **THEN** el sistema responde HTTP 200 inmediatamente
- **THEN** en background, el `Pago` correspondiente se actualiza con `mp_status = "approved"` y el pedido transiciona de `PENDIENTE` → `CONFIRMADO` con decremento de stock atómico

#### Scenario: Webhook con pago rechazado
- **WHEN** el estado real consultado en la API de MP es `"rejected"`
- **THEN** el `Pago` se actualiza con `mp_status = "rejected"` y el pedido permanece en `PENDIENTE`

#### Scenario: Webhook con pago en proceso
- **WHEN** el estado real consultado en la API de MP es `"pending"` o `"in_process"`
- **THEN** el `Pago` se actualiza con `mp_status` correspondiente y el pedido permanece en `PENDIENTE`

#### Scenario: Webhook duplicado (idempotencia)
- **WHEN** MercadoPago reenvía un webhook con el mismo `mp_payment_id` que ya fue procesado como `"approved"`
- **THEN** el sistema responde HTTP 200, y en background detecta que `idempotency_key` ya existe para ese `mp_payment_id` y no aplica ninguna transición de pedido

#### Scenario: Webhook con topic diferente a payment
- **WHEN** el body del webhook tiene `"topic"` distinto de `"payment"` (e.g., `"merchant_order"`)
- **THEN** el sistema responde HTTP 200 y no realiza ninguna acción adicional

---

### Requirement: Consultar estado de pago de un pedido
El sistema SHALL retornar el último registro de pago asociado a un pedido. Solo el cliente propietario del pedido o un usuario con rol `ADMIN` pueden consultar el estado de pago.

#### Scenario: Cliente consulta pago de su propio pedido
- **WHEN** el cliente autenticado hace `GET /api/v1/pagos/{pedido_id}` con un pedido propio
- **THEN** el sistema retorna HTTP 200 con `{ "pago_id": ..., "mp_status": "approved"|"rejected"|"pending"|"in_process", "monto": ..., "created_at": ... }`

#### Scenario: Cliente intenta consultar pago de otro cliente
- **WHEN** el cliente hace `GET /api/v1/pagos/{pedido_id}` con un pedido que no le pertenece
- **THEN** el sistema retorna HTTP 403 Forbidden

#### Scenario: ADMIN consulta pago de cualquier pedido
- **WHEN** un usuario con rol ADMIN hace `GET /api/v1/pagos/{pedido_id}`
- **THEN** el sistema retorna HTTP 200 con el estado de pago del pedido solicitado

#### Scenario: Pedido sin intentos de pago
- **WHEN** el pedido existe pero no tiene ningún registro de pago
- **THEN** el sistema retorna HTTP 404 con `code: "PAGO_NO_ENCONTRADO"`

---

### Requirement: Reintentar pago rechazado
El sistema SHALL permitir al cliente propietario reintentar el pago de un pedido en estado `PENDIENTE` con un pago previo en estado `"rejected"`. Cada reintento SHALL generar un nuevo `idempotency_key` UUID y un nuevo registro `Pago`, preservando el historial de intentos anteriores.

#### Scenario: Reintento exitoso tras rechazo
- **WHEN** un cliente hace `POST /api/v1/pagos/crear` para un pedido que tiene un pago `"rejected"` previo
- **THEN** el sistema crea un nuevo registro `Pago` con nuevo `idempotency_key` y retorna un nuevo `init_point`

#### Scenario: Múltiples intentos registrados
- **WHEN** un pedido tiene 3 intentos de pago (2 rechazados, 1 aprobado)
- **THEN** `GET /api/v1/pagos/{pedido_id}` retorna el intento más reciente (el aprobado)

---

### Requirement: Idempotencia de pagos
El sistema SHALL garantizar que no se apliquen transiciones de pedido duplicadas. Si se recibe un webhook con un `mp_payment_id` ya registrado en la tabla `Pago` con `mp_status = "approved"`, el sistema SHALL ignorar el procesamiento sin retornar error.

#### Scenario: Doble procesamiento prevenido
- **WHEN** el webhook de MP llega dos veces con el mismo `mp_payment_id` ya procesado como `"approved"`
- **THEN** el pedido solo transiciona a `CONFIRMADO` una vez y el stock solo se decrementa una vez

---

### Requirement: Frontend — Flujo de checkout con redirección a MP
El frontend SHALL redirigir al cliente al `init_point` retornado por `POST /api/v1/pagos/crear` tras crear un pedido exitosamente. Al regresar de MP, el cliente SHALL ser dirigido a `/pedidos/{id}/resultado` con los query params `?status=approved|rejected|pending&payment_id=<id>`.

#### Scenario: Redirección exitosa al checkout MP
- **WHEN** el cliente confirma el pedido y el backend retorna `init_point`
- **THEN** el frontend ejecuta `window.location.href = init_point` redirigiendo al checkout de MercadoPago

#### Scenario: Página de resultado con pago aprobado
- **WHEN** el cliente regresa de MP a `/pedidos/{id}/resultado?status=approved`
- **THEN** la página muestra "Pago aprobado — tu pedido está siendo confirmado" y hace polling a `GET /api/v1/pagos/{id}` hasta que `mp_status === "approved"` o timeout de 30s

#### Scenario: Página de resultado con pago rechazado
- **WHEN** el cliente regresa a `/pedidos/{id}/resultado?status=rejected`
- **THEN** la página muestra "Pago rechazado" con un botón "Reintentar pago" que llama de nuevo a `POST /api/v1/pagos/crear`

#### Scenario: paymentStore actualizado al regresar
- **WHEN** la página de resultado obtiene la respuesta de `GET /api/v1/pagos/{id}`
- **THEN** `paymentStore` se actualiza con `mp_status` y `mp_payment_id` correspondientes
