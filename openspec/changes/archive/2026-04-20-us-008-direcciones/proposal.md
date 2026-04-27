## Why

Food Store ya soporta creación de pedidos con un campo `direccion_id` opcional en `CrearPedidoRequest`, pero el módulo de direcciones nunca fue implementado. Sin este módulo, los clientes no pueden guardar, gestionar ni seleccionar direcciones de entrega — funcionalidad crítica para el flujo de checkout.

## What Changes

- **Nuevo módulo backend** `app/modules/direcciones/`: schemas Pydantic, repository, service y router completos (los archivos existentes son stubs vacíos).
- **5 endpoints REST** bajo `/api/v1/direcciones` para CRUD completo + marcar dirección principal.
- **Integración con pedidos**: validar `direccion_id` en `PedidoService.crear_pedido()` — que la dirección pertenece al usuario y no está eliminada.
- **Regla de negocio**: primera dirección creada se marca automáticamente como principal; al marcar otra como principal, la anterior pierde el flag (transacción atómica).
- **Soft delete con guardia**: no se puede eliminar una dirección si tiene pedidos activos (PENDIENTE, CONFIRMADO, EN_PREP, EN_CAMINO).
- **Frontend**: página `/perfil/direcciones` con modal de formulario y selector de dirección en el checkout.

## Capabilities

### New Capabilities

- `gestion-direcciones`: CRUD completo de DireccionEntrega por usuario — crear, listar, editar, eliminar (soft), marcar principal. Ownership enforcement: un cliente solo opera sobre sus propias direcciones (excepto ADMIN).
- `checkout-con-direccion`: Integración entre el módulo de direcciones y la creación de pedidos — validación de ownership de `direccion_id` y snapshot de dirección en el pedido.

### Modified Capabilities

- `pedidos`: La creación de pedido ahora valida que `direccion_id` (cuando se provee) pertenece al usuario autenticado.

## Impact

- **Backend nuevo**: `backend/app/modules/direcciones/` — schemas.py, repository.py, service.py, router.py (model.py ya existe con la tabla `DireccionEntrega`).
- **Backend modificado**: `backend/app/modules/pedidos/service.py` — agregar validación de `direccion_id` en `crear_pedido`.
- **Migración Alembic**: tabla `direccion_entrega` ya existe en el ERD v5; verificar que la migración existente la cubre.
- **Frontend nuevo**: `frontend/src/features/direcciones/` con componentes, hooks y API client; página `DireccionesPage`; selector en `CheckoutDrawer`.
- **Rutas frontend**: `/perfil/direcciones` agregada al React Router.
