## Context

Food Store tiene pedidos que se crean en estado `PENDIENTE` pero no tienen integración de cobro. El modelo `Pago` y `FormaPago` ya están scaffoldeados en `backend/app/modules/pagos/model.py`. La FSM de pedidos en `pedidos/service.py` ya implementa `cambiar_estado(uow, pedido_id, nuevo_estado, actor_rol, ...)` y reconoce el rol `"SISTEMA"` para la transición `PENDIENTE → CONFIRMADO`. El SDK de MercadoPago Python `mercadopago==2.4.0` está instalado.

La integración debe ser PCI SAQ-A compliant: los datos de tarjeta se tokenizan en el browser vía `@mercadopago/sdk-react`; el backend solo recibe el `card_token` y lo pasa al SDK de MP, que devuelve `mp_payment_id` y `mp_status`.

## Goals / Non-Goals

**Goals:**

- Backend: tres endpoints (`POST /pagos/crear`, `POST /pagos/webhook`, `GET /pagos/{pedido_id}`) con módulo completo (schemas, repo, service, router).
- Webhook IPN que responde 200 inmediatamente y procesa asíncronamente; verifica el estado real contra la API de MP antes de actuar.
- Idempotencia garantizada por `idempotency_key UUID` (unique constraint en la tabla) — reintentos del webhook con la misma key son ignorados.
- Transición `PENDIENTE → CONFIRMADO` y decremento de stock delegados a `pedidos.service.cambiar_estado(..., rol="SISTEMA")`.
- Frontend: componente `CheckoutPago` con `CardPayment` de `@mercadopago/sdk-react` y página de resultado `/pedidos/{id}/resultado`.

**Non-Goals:**

- Pagos por Rapipago / Pago Fácil / transferencia (solo tarjeta en este change).
- Verificación de firma HMAC del webhook de MP (requiere configuración de clave secreta en MP Dashboard; se deja como hardening futuro).
- Reembolsos / chargebacks (fuera de scope de las historias de usuario).
- Tests de integración contra sandbox de MP (requieren credenciales reales en CI).

## Decisions

### Decisión 1: Respuesta inmediata en webhook + procesamiento async con BackgroundTasks

**Elección**: usar `BackgroundTasks` de FastAPI para procesar el webhook.

**Alternativas consideradas**:
- Celery + Redis: overhead operacional alto para este scope (un solo proceso).
- `asyncio.create_task`: no garantiza ejecución si la respuesta ya salió antes de que el event loop corra la tarea en un test.

**Razón**: `BackgroundTasks` de FastAPI está disponible sin infraestructura adicional, respeta el contrato de `responder 200 inmediatamente` (RN-PA03), y es suficiente para el volumen esperado en un proyecto académico / prototipo. Se puede migrar a Celery sin cambiar el contrato del endpoint.

---

### Decisión 2: Verificar estado real en MP antes de actuar (nunca confiar en el payload del webhook)

**Elección**: en la tarea de background, llamar a `sdk.payment().get(payment_id)` antes de aplicar cualquier transición de pedido.

**Alternativas consideradas**:
- Confiar en el campo `status` del body del webhook: MP documenta explícitamente que el payload del IPN solo contiene el ID; se debe consultar la API para obtener el estado real.

**Razón**: RN-PA04. El body del webhook IPN de MP solo entrega el `id` y el `topic`; el `status` no está garantizado.

---

### Decisión 3: Idempotencia con unique constraint en `idempotency_key`

**Elección**: la tabla `Pago` tiene `UNIQUE(idempotency_key)`. El service de pagos, antes de insertar, hace `SELECT` por `idempotency_key`; si existe, retorna el registro sin procesar de nuevo.

**Alternativas consideradas**:
- Bloqueo optimista con versión: más complejo, no necesario aquí.
- Redis distributed lock: overhead operacional.

**Razón**: RN-PA02. La base de datos como fuente de verdad es suficiente y sin dependencias extras.

---

### Decisión 4: `external_reference = str(pedido.id)` para vincular MP con el pedido

**Elección**: pasar `external_reference=str(pedido_id)` al crear el pago en MP. El webhook usa este campo para encontrar el pedido al procesar la notificación.

**Razón**: RN-PA09. MP devuelve `external_reference` en la consulta del pago; es la forma oficial de vincular una preferencia/pago MP con el recurso interno.

---

### Decisión 5: Checkout Redirect (init_point) en lugar de formulario embebido

**Elección**: `POST /pagos/crear` devuelve `init_point` (URL de MP). El frontend redirige con `window.location.href = init_point`. Al regresar, MP envía query params `?status=...&payment_id=...`.

**Alternativas consideradas**:
- Formulario embebido `CardPayment` de `@mercadopago/sdk-react`: requiere `card_token` en el body del POST, implica tokenización en el frontend antes de llamar al backend.

**Razón**: Checkout Redirect (Preferences API) es la forma más simple de ser PCI SAQ-A compliant sin necesidad de renderizar el SDK de MP en el frontend; el cliente ingresa la tarjeta directamente en el sitio de MP. Se puede migrar a formulario embebido como mejora futura. El `init_point` es el URL de la preferencia de pago creada con la Preferences API de MP.

---

### Decisión 6: Reusar `pedidos.service.cambiar_estado` desde el servicio de pagos

**Elección**: `pagos.service` importa y llama a `pedidos.service.cambiar_estado(uow, pedido_id, "CONFIRMADO", actor_rol="SISTEMA")`.

**Alternativas consideradas**:
- Duplicar lógica de transición en `pagos.service`: rompe el principio DRY y puede dejar el FSM inconsistente.
- Llamar al endpoint interno `PATCH /pedidos/{id}/estado` via HTTP: innecesario overhead dentro del mismo proceso.

**Razón**: La FSM está centralizada en `pedidos.service`; reutilizarla garantiza que se respetan las transiciones válidas, el historial append-only y el decremento de stock atómico definidos en US-035.

## Risks / Trade-offs

- **[Risk] BackgroundTasks no garantiza durabilidad** → Si el proceso FastAPI muere entre recibir el webhook y ejecutar la tarea de background, el pago puede quedar sin procesar. Mitigación: MP reintenta el webhook hasta N veces; si el `idempotency_key` no existe en la BD, el reintento lo procesará correctamente.

- **[Risk] Sin verificación de firma HMAC del webhook** → Cualquiera puede POST a `/pagos/webhook`. Mitigación parcial: el backend siempre verifica el estado real contra la API de MP con el `mp_payment_id`; un atacante sin un `payment_id` real no puede forzar una transición de pedido. Se documenta como hardening pendiente.

- **[Risk] `external_reference` expone el `pedido_id` (entero secuencial)** → Enumeración de pedidos. Mitigación: en este scope académico es aceptable; en producción usar UUID.

- **[Trade-off] Checkout Redirect vs. formulario embebido** → El redirect abandona el sitio de Food Store; la UX es menos fluida. A cambio, la integración es más simple y no requiere gestión de `card_token` en el backend.

## Migration Plan

1. Verificar que `alembic upgrade head` ya incluye la tabla `pago` con las columnas de `model.py`. Si faltan columnas (`mp_status`, `external_reference`, `idempotency_key`), generar una nueva revisión: `alembic revision --autogenerate -m "add pago fields"`.
2. Agregar variables de entorno: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_NOTIFICATION_URL` en `backend/.env` y `frontend/.env`.
3. En el MP Dashboard (sandbox), configurar la URL de notificación al dominio/ngrok donde corre el backend.
4. Registrar el router de pagos en `app/main.py` (idempotente si ya existe `include_router` para el módulo).

**Rollback**: eliminar el `include_router` de pagos en `main.py` y hacer rollback de la migración de Alembic si fue necesaria.

## Open Questions

- ¿El deployment usa ngrok o un dominio público para que MP pueda enviar webhooks en desarrollo? Requiere `MP_NOTIFICATION_URL` real para probar el flujo E2E en sandbox.
- ¿Se implementa la verificación de firma HMAC del webhook en este change o se deja como hardening? (Recomendación: dejar para us-007 o un change de hardening posterior.)
