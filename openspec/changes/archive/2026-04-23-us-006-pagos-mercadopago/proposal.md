## Why

Los pedidos creados en Food Store quedan en estado `PENDIENTE` indefinidamente porque no existe ningún mecanismo de cobro integrado. Sin integración con MercadoPago, el sistema no puede confirmar pedidos, decrementar stock ni habilitar el flujo de preparación y entrega. Esta es la pieza central que cierra el ciclo compra → pago → confirmación.

## What Changes

- **Nuevo endpoint** `POST /api/v1/pagos/crear` — recibe `pedido_id`, genera `idempotency_key` UUID, llama al SDK MercadoPago Python para crear un pago con el token de tarjeta tokenizado en el browser, y persiste un registro `Pago` en la base de datos.
- **Nuevo endpoint** `POST /api/v1/pagos/webhook` — endpoint IPN público que responde HTTP 200 inmediatamente, luego verifica el estado real contra la API de MercadoPago y procesa de forma asíncrona: si `approved`, transiciona el pedido de `PENDIENTE` → `CONFIRMADO` y decrementa stock; si `rejected`/`pending`, actualiza el estado del `Pago` sin modificar el pedido.
- **Nuevo endpoint** `GET /api/v1/pagos/{pedido_id}` — consulta el(los) pago(s) asociados a un pedido; accesible por el cliente propietario o un ADMIN.
- **Módulo `pagos` backend completo** — `schemas.py`, `repository.py`, `service.py`, `router.py` sobre el `model.py` ya scaffoldeado (`FormaPago`, `Pago`).
- **Frontend — checkout flow** — después de crear el pedido (`POST /api/v1/pedidos`), el componente de checkout llama a `POST /api/v1/pagos/crear` y redirige al `init_point` devuelto por MercadoPago (Checkout Redirect) o renderiza el componente `CardPayment` del SDK para tokenización in-page.
- **Frontend — página de resultado** — ruta `/pedidos/{id}/resultado?status=approved|rejected|pending` que lee el query param de retorno de MercadoPago, hace polling con TanStack Query al endpoint de estado de pago, y actualiza `paymentStore`.
- **`paymentStore`** — hidratación del estado `mp_status` y `mp_payment_id` desde la API al regresar de MercadoPago.

## Capabilities

### New Capabilities

- `pagos-mercadopago`: Integración completa de pagos con MercadoPago — creación de pago con token de tarjeta, procesamiento asíncrono de webhook IPN, idempotencia por UUID, y página de resultado de retorno.

### Modified Capabilities

- `pedidos`: La transición `PENDIENTE → CONFIRMADO` y el decremento de stock ahora son disparados exclusivamente desde el webhook de pagos (RN-FS02). Se agrega campo de estado de pago en la vista detalle del pedido.

## Impact

- **Backend nuevo**: `app/modules/pagos/schemas.py`, `repository.py`, `service.py`, `router.py`; `app/main.py` registra el router de pagos.
- **Backend modificado**: `app/modules/pedidos/service.py` expone `confirmar_pedido(uow, pedido_id)` para ser invocado desde el servicio de pagos.
- **Frontend nuevo**: `src/features/store/pages/ResultadoPagoPage.tsx`, `src/features/store/components/CheckoutPago.tsx`
- **Frontend modificado**: `src/app/store/paymentStore.ts` (agregar campos `mp_status`, `mp_payment_id`, acción `setPagoResult`), flujo de checkout en `src/features/store/pages/CheckoutPage.tsx`.
- **Dependencias ya instaladas**: `mercadopago==2.4.0` (Python SDK), `@mercadopago/sdk-react` (frontend).
- **Variables de entorno requeridas**: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_NOTIFICATION_URL`.
- **Sin migraciones**: el modelo `Pago` ya está scaffoldeado; solo se necesita `alembic revision --autogenerate` si faltan columnas.
