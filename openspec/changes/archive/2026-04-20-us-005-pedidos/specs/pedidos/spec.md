## ADDED Requirements

### Requirement: Crear pedido desde carrito
El sistema SHALL crear un pedido atómico desde los ítems enviados por el cliente autenticado (rol CLIENT), capturando snapshots de precio y nombre de cada producto, validando stock suficiente con SELECT FOR UPDATE, y registrando el estado inicial PENDIENTE en el historial de estados.

#### Scenario: Creación exitosa con stock disponible
- **WHEN** un CLIENT autenticado envía `POST /api/v1/pedidos` con ítems válidos y stock disponible
- **THEN** el sistema crea `Pedido` en estado PENDIENTE, `DetallePedido[]` con `nombre_snapshot` y `precio_snapshot`, y el primer `HistorialEstadoPedido` con `estado_desde = NULL`, todo en una sola transacción UoW, y retorna HTTP 201 con `PedidoRead`

#### Scenario: Rechazo por stock insuficiente
- **WHEN** uno o más productos del pedido no tienen stock suficiente al momento de la creación
- **THEN** el sistema retorna HTTP 422 con código `STOCK_INSUFICIENTE` y ningún registro se persiste (rollback completo)

#### Scenario: Rechazo por carrito vacío
- **WHEN** el cliente envía `POST /api/v1/pedidos` con lista de ítems vacía
- **THEN** el sistema retorna HTTP 422 con código `PEDIDO_SIN_ITEMS`

#### Scenario: Rechazo por producto inexistente
- **WHEN** el payload incluye un `producto_id` que no existe o está eliminado (soft-deleted)
- **THEN** el sistema retorna HTTP 404 con código `PRODUCTO_NO_ENCONTRADO` y no se crea el pedido

#### Scenario: Personalización almacenada como INTEGER[]
- **WHEN** un ítem incluye `personalizacion: [3, 7]` (IDs de ingredientes a excluir)
- **THEN** `DetallePedido.personalizacion` almacena `[3, 7]` como array nativo PostgreSQL

---

### Requirement: Listar pedidos con filtro por rol
El sistema SHALL listar pedidos de forma paginada. Un CLIENT SHALL ver únicamente sus propios pedidos. Los roles PEDIDOS y ADMIN SHALL ver todos los pedidos del sistema. Ambos soportan filtro opcional por `estado`.

#### Scenario: Cliente ve solo sus pedidos
- **WHEN** un CLIENT autenticado hace `GET /api/v1/pedidos`
- **THEN** el sistema retorna únicamente los pedidos cuyo `usuario_id` coincide con el del token JWT, paginados con `page`, `size`, `total`, `pages`

#### Scenario: Gestor ve todos los pedidos
- **WHEN** un usuario con rol PEDIDOS o ADMIN hace `GET /api/v1/pedidos`
- **THEN** el sistema retorna todos los pedidos del sistema, paginados

#### Scenario: Filtro por estado
- **WHEN** se incluye el query param `?estado=CONFIRMADO`
- **THEN** el sistema retorna solo pedidos en ese estado (independientemente del rol)

#### Scenario: Paginación estándar
- **WHEN** se hace `GET /api/v1/pedidos?page=2&size=5`
- **THEN** la respuesta incluye `{ items, total, page: 2, size: 5, pages }`

---

### Requirement: Ver detalle completo de un pedido
El sistema SHALL retornar el detalle completo de un pedido incluyendo todos sus `DetallePedido` con snapshots, el historial de estados ordenado cronológicamente y el estado de pago asociado.

#### Scenario: Cliente ve su propio pedido
- **WHEN** un CLIENT hace `GET /api/v1/pedidos/{id}` siendo propietario del pedido
- **THEN** el sistema retorna `PedidoDetail` con ítems (nombre_snapshot, precio_snapshot, cantidad, personalizacion), historial de estados y pago si existe

#### Scenario: Cliente no puede ver pedido ajeno
- **WHEN** un CLIENT hace `GET /api/v1/pedidos/{id}` de un pedido que no le pertenece
- **THEN** el sistema retorna HTTP 403

#### Scenario: Gestor ve cualquier pedido
- **WHEN** un usuario con rol PEDIDOS o ADMIN hace `GET /api/v1/pedidos/{id}`
- **THEN** el sistema retorna el detalle completo sin restricción de propietario

#### Scenario: Pedido no encontrado
- **WHEN** se solicita un `id` que no existe
- **THEN** el sistema retorna HTTP 404 con código `PEDIDO_NO_ENCONTRADO`

---

### Requirement: Transiciones de estado según FSM
El sistema SHALL validar toda transición de estado contra el mapa FSM definido y los roles permitidos por transición antes de persistir el cambio. La transición SHALL ser atómica (UoW) incluyendo los efectos de stock cuando aplique.

#### Scenario: Transición válida CONFIRMADO → EN_PREP por rol PEDIDOS
- **WHEN** un usuario con rol PEDIDOS envía `PATCH /api/v1/pedidos/{id}/estado` con `{ "nuevo_estado": "EN_PREP" }` sobre un pedido en CONFIRMADO
- **THEN** el sistema cambia el estado, registra en `HistorialEstadoPedido` con `estado_desde: CONFIRMADO`, `estado_hasta: EN_PREP`, y retorna HTTP 200 con `PedidoRead`

#### Scenario: Transición inválida por FSM
- **WHEN** se intenta avanzar de PENDIENTE a EN_PREP (salto no permitido)
- **THEN** el sistema retorna HTTP 422 con código `TRANSICION_NO_PERMITIDA`

#### Scenario: Transición bloqueada por estado terminal
- **WHEN** se intenta cambiar el estado de un pedido en ENTREGADO o CANCELADO
- **THEN** el sistema retorna HTTP 422 con código `ESTADO_TERMINAL`

#### Scenario: CLIENT cancela su propio pedido en PENDIENTE
- **WHEN** un CLIENT envía `{ "nuevo_estado": "CANCELADO", "motivo": "Cambié de opinión" }` sobre su pedido en PENDIENTE
- **THEN** el sistema cancela el pedido y registra el motivo en `HistorialEstadoPedido`

#### Scenario: Cancelación de pedido CONFIRMADO restaura stock
- **WHEN** un pedido en CONFIRMADO es cancelado (por rol PEDIDOS o ADMIN)
- **THEN** el sistema restaura atómicamente el stock de cada producto del pedido (`stock += cantidad`) dentro del mismo UoW

#### Scenario: Solo ADMIN puede cancelar pedido EN_PREP
- **WHEN** un usuario con rol PEDIDOS intenta cancelar un pedido en EN_PREP
- **THEN** el sistema retorna HTTP 403 con código `ROL_INSUFICIENTE`

#### Scenario: Cancelación requiere motivo
- **WHEN** se envía `{ "nuevo_estado": "CANCELADO" }` sin campo `motivo`
- **THEN** el sistema retorna HTTP 422 con código `MOTIVO_REQUERIDO`

#### Scenario: Decremento de stock al confirmar
- **WHEN** el pedido transiciona a CONFIRMADO (vía webhook en us-006)
- **THEN** el stock de cada producto se decrementa atómicamente por la cantidad del `DetallePedido` dentro del mismo UoW

---

### Requirement: Historial de estados append-only
El sistema SHALL retornar el historial completo de transiciones de un pedido ordenado por `created_at ASC`. El historial SHALL ser de solo lectura; ninguna capa del sistema SHALL emitir UPDATE o DELETE sobre `HistorialEstadoPedido`.

#### Scenario: Retorno del historial cronológico
- **WHEN** se hace `GET /api/v1/pedidos/{id}/historial`
- **THEN** el sistema retorna una lista de `HistorialRead` ordenada por `created_at ASC` con campos: `id`, `estado_desde`, `estado_hasta`, `created_at`, `usuario_id`, `observacion`

#### Scenario: Primer registro con estado_desde NULL
- **WHEN** se consulta el historial de un pedido recién creado
- **THEN** el primer registro tiene `estado_desde: null` y `estado_hasta: PENDIENTE`

#### Scenario: Acceso restringido por propiedad para CLIENT
- **WHEN** un CLIENT hace `GET /api/v1/pedidos/{id}/historial` de un pedido que no es suyo
- **THEN** el sistema retorna HTTP 403

---

### Requirement: Snapshot de precio y nombre en DetallePedido
El sistema SHALL almacenar el precio y nombre del producto al momento de creación del pedido en los campos `precio_snapshot` y `nombre_snapshot` de `DetallePedido`. Estos valores SHALL ser inmutables y no reflejar cambios futuros al producto.

#### Scenario: Snapshot capturado en creación
- **WHEN** se crea un pedido con un producto cuyo precio es $500
- **THEN** `DetallePedido.precio_snapshot = 500.00` y no cambia si el precio del producto se actualiza a $600 posteriormente

#### Scenario: Detalle muestra snapshot no precio actual
- **WHEN** se consulta `GET /api/v1/pedidos/{id}` después de que el precio del producto cambió
- **THEN** `DetallePedidoRead.precio_snapshot` muestra el precio al momento de la compra, no el precio actual

---

### Requirement: Validación de stock al crear pedido
El sistema SHALL verificar disponibilidad de stock de cada producto dentro de la misma transacción usando SELECT FOR UPDATE antes de crear el pedido.

#### Scenario: Stock suficiente para todos los ítems
- **WHEN** todos los productos del pedido tienen `stock >= cantidad` solicitada
- **THEN** el pedido se crea exitosamente y el stock no se decrementa (el decremento ocurre al CONFIRMAR)

#### Scenario: Stock insuficiente para algún ítem
- **WHEN** al menos un producto tiene `stock < cantidad` solicitada
- **THEN** HTTP 422 con `STOCK_INSUFICIENTE` y detalle del producto y stock disponible; ningún registro se persiste
