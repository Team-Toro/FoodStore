## 1. Backend — Migración y Modelo

- [x] 1.1 Verificar que la tabla `pago` ya existe con todas las columnas del `model.py` scaffoldeado (`mp_payment_id`, `mp_status`, `external_reference`, `idempotency_key`); si faltan columnas, generar `alembic revision --autogenerate -m "complete pago table"` y ejecutar `alembic upgrade head`
- [x] 1.2 Añadir variable de entorno `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_NOTIFICATION_URL` al `.env.example` del backend con valores de ejemplo sandbox
- [x] 1.3 Crear `backend/app/core/mp_client.py` — función `get_mp_sdk() -> mercadopago.SDK` que lee `MP_ACCESS_TOKEN` desde `settings` y retorna la instancia del SDK (singleton o factory)

## 2. Backend — Schemas de Pagos

- [x] 2.1 Crear `backend/app/modules/pagos/schemas.py` con:
  - `CrearPagoRequest`: `pedido_id: int`
  - `PagoResponse`: `pago_id: int`, `init_point: str`, `mp_status: str`, `monto: float`, `created_at: datetime`
  - `WebhookPayload`: `topic: str`, `id: str` (campos mínimos del IPN de MP)

## 3. Backend — Repository de Pagos

- [x] 3.1 Crear `backend/app/modules/pagos/repository.py` con clase `PagoRepository(BaseRepository[Pago])` y métodos:
  - `get_by_pedido_id(pedido_id: int) -> Pago | None` — retorna el pago más reciente del pedido
  - `get_by_idempotency_key(key: str) -> Pago | None`
  - `get_by_mp_payment_id(mp_payment_id: str) -> Pago | None`
  - `list_by_pedido_id(pedido_id: int) -> list[Pago]`
- [x] 3.2 Registrar `PagoRepository` en el `UnitOfWork` (`app/core/uow.py`) como atributo `pagos`

## 4. Backend — Service de Pagos

- [x] 4.1 Crear `backend/app/modules/pagos/service.py` con función `crear_pago(uow, pedido_id: int, usuario_id: int) -> PagoResponse`:
  - Verificar que el pedido existe y pertenece al `usuario_id`; si no → `HTTPException 403`
  - Verificar que el pedido está en estado `PENDIENTE`; si no → `HTTPException 409` con `code: PEDIDO_NO_PENDIENTE`
  - Generar `idempotency_key = str(uuid.uuid4())`
  - Crear preferencia en MP con Preferences API (`sdk.preferences().create({...})`) incluyendo `external_reference = str(pedido_id)`, `back_urls`, `auto_return`
  - Insertar registro `Pago` con `mp_status = "pending"`, `idempotency_key`, `external_reference`
  - Retornar `PagoResponse` con `init_point` del response de MP
- [x] 4.2 Crear función `procesar_webhook(mp_payment_id: str, uow_factory) -> None` (usada en BackgroundTask):
  - Buscar `Pago` por `mp_payment_id` — si ya existe con `mp_status = "approved"`, retornar (idempotencia)
  - Consultar la API de MP: `sdk.payment().get(mp_payment_id)` para obtener estado real
  - Extraer `external_reference` (= `pedido_id`) del response de MP
  - Si `status == "approved"`: actualizar `Pago.mp_status`, llamar `pedidos.service.cambiar_estado(uow, pedido_id, "CONFIRMADO", actor_rol="SISTEMA")`
  - Si `status in ("rejected", "pending", "in_process", "cancelled")`: solo actualizar `Pago.mp_status`
- [x] 4.3 Crear función `obtener_pago(uow, pedido_id: int, usuario_id: int, rol: str) -> PagoResponse`:
  - Verificar propiedad del pedido o rol ADMIN; si no → `HTTPException 403`
  - Retornar pago más reciente; si no existe → `HTTPException 404` con `code: PAGO_NO_ENCONTRADO`

## 5. Backend — Router de Pagos

- [x] 5.1 Crear `backend/app/modules/pagos/router.py` con tres endpoints:
  - `POST /api/v1/pagos/crear` — requiere auth CLIENT, llama a `service.crear_pago`, retorna HTTP 201
  - `POST /api/v1/pagos/webhook` — endpoint público (sin auth), responde HTTP 200 inmediatamente, registra `BackgroundTask(procesar_webhook, body.id)`; solo procesa si `body.topic == "payment"`
  - `GET /api/v1/pagos/{pedido_id}` — requiere auth CLIENT o ADMIN, llama a `service.obtener_pago`
- [x] 5.2 Registrar el router de pagos en `backend/app/main.py`: `app.include_router(pagos_router, prefix="/api/v1")`

## 6. Backend — Pedidos: exponer transición por SISTEMA

- [x] 6.1 Verificar que `pedidos.service.cambiar_estado` acepta `actor_rol = "SISTEMA"` para la transición `PENDIENTE → CONFIRMADO` (la tabla `TRANSITION_ACTORS` debe incluir `("PENDIENTE", "CONFIRMADO"): ["SISTEMA", "ADMIN"]`); agregar `"SISTEMA"` si no está presente
- [x] 6.2 Verificar que el endpoint `PATCH /api/v1/pedidos/{id}/estado` rechaza `nuevo_estado = "CONFIRMADO"` para todos los usuarios (solo SISTEMA puede usarlo — no está expuesto via HTTP)

## 7. Frontend — Variables de Entorno y Tipos

- [x] 7.1 Agregar `VITE_MP_PUBLIC_KEY=TEST-xxxx` al `frontend/.env.example`
- [x] 7.2 Crear `frontend/src/features/store/api/pagosApi.ts` con:
  - `crearPago(pedidoId: number): Promise<PagoResponse>`
  - `obtenerPago(pedidoId: number): Promise<PagoResponse>`
- [x] 7.3 Agregar tipos en `frontend/src/features/store/types/pago.ts`: `PagoResponse { pago_id, init_point, mp_status, monto, created_at }`

## 8. Frontend — paymentStore

- [x] 8.1 Actualizar `frontend/src/app/store/paymentStore.ts` para agregar campos `mp_status: string | null`, `mp_payment_id: string | null` y acción `setPagoResult(mp_status: string, mp_payment_id: string | null): void`
- [x] 8.2 Agregar acción `resetPayment(): void` para limpiar el estado al iniciar un nuevo flujo de checkout

## 9. Frontend — Flujo de Checkout

- [x] 9.1 Actualizar `frontend/src/features/store/pages/CheckoutPage.tsx` (o el componente que maneja la confirmación del pedido): tras recibir el `pedido_id` creado, llamar a `crearPago(pedidoId)` y ejecutar `window.location.href = response.init_point` para redirigir al checkout de MercadoPago
- [x] 9.2 Configurar `back_urls` en el backend (`MP_NOTIFICATION_URL`) para que MP redirija a `/pedidos/{id}/resultado?status={status}&payment_id={payment_id}` al completar el pago

## 10. Frontend — Página de Resultado de Pago

- [x] 10.1 Crear `frontend/src/features/store/pages/ResultadoPagoPage.tsx`:
  - Leer query params `status` y `payment_id` de la URL
  - Actualizar `paymentStore` con `setPagoResult(status, payment_id)`
  - Si `status === "approved"`: mostrar "Pago aprobado — tu pedido está siendo confirmado", hacer polling con TanStack Query a `GET /api/v1/pagos/{id}` cada 3s hasta que `mp_status === "approved"` o timeout de 30s
  - Si `status === "rejected"`: mostrar "Pago rechazado" + botón "Reintentar pago" que llama a `crearPago(pedidoId)` y redirige de nuevo
  - Si `status === "pending"`: mostrar "Pago pendiente — te notificaremos cuando se acredite"
- [x] 10.2 Registrar la ruta `/pedidos/:id/resultado` en el router de React (`frontend/src/app/router.tsx` o equivalente)

## 11. Tests

- [x] 11.1 Crear `backend/tests/test_pagos.py` con tests:
  - `test_crear_pago_pedido_pendiente` — mock del SDK de MP, verifica que se inserta `Pago` y retorna `init_point`
  - `test_crear_pago_pedido_no_pendiente` — espera HTTP 409
  - `test_webhook_approved_confirma_pedido` — mock de `sdk.payment().get()` retornando `approved`, verifica transición FSM
  - `test_webhook_rejected_pedido_sigue_pendiente` — mock retorna `rejected`, verifica que el pedido permanece en `PENDIENTE`
  - `test_webhook_idempotencia` — segundo webhook con mismo `mp_payment_id` no dispara segunda transición
- [x] 11.2 Verificar que los tests existentes de pedidos (`test_pedidos.py`) siguen pasando después de los cambios al service de pedidos

## 12. Verificación End-to-End

- [x] 12.1 Con sandbox de MP activo (ngrok o dominio público), crear un pedido, iniciar pago, completar con tarjeta `4509 9535 6623 3704`, verificar que el pedido transiciona a `CONFIRMADO` y el stock se decrementa
- [x] 12.2 Probar tarjeta rechazada `4000 0000 0000 0002` y verificar que el pedido permanece en `PENDIENTE` y se muestra la página de resultado con opción de reintento
