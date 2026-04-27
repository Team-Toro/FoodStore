## 1. Backend — Migración de Base de Datos

- [x] 1.1 Verificar que la tabla `direccion_entrega` ya existe en la migración Alembic existente; si no, crear la migración para crearla con todos sus campos (`linea1`, `linea2`, `ciudad`, `codigo_postal`, `referencia`, `alias`, `es_principal`, `usuario_id`, `deleted_at`, `creado_en`, `actualizado_en`)
- [x] 1.2 Crear migración Alembic para agregar columnas de snapshot a la tabla `pedido`: `direccion_snapshot_linea1 TEXT NULL`, `direccion_snapshot_ciudad VARCHAR(100) NULL`, `direccion_snapshot_alias VARCHAR(100) NULL`
- [x] 1.3 Ejecutar `alembic upgrade head` y verificar que no hay errores

## 2. Backend — Schemas Pydantic (direcciones)

- [x] 2.1 Crear `DireccionCreate` en `backend/app/modules/direcciones/schemas.py` con campos: `linea1` (str, requerido), `linea2` (str|None), `ciudad` (str, requerido), `codigo_postal` (str|None), `referencia` (str|None), `alias` (str|None)
- [x] 2.2 Crear `DireccionUpdate` con todos los campos opcionales (mismos que Create pero todos con `None` como default)
- [x] 2.3 Crear `DireccionRead` con todos los campos más `id`, `usuario_id`, `es_principal`, `creado_en`, `actualizado_en`

## 3. Backend — Repository (direcciones)

- [x] 3.1 Implementar `DireccionRepository(BaseRepository[DireccionEntrega])` en `backend/app/modules/direcciones/repository.py`
- [x] 3.2 Agregar método `list_by_usuario(usuario_id: int) -> list[DireccionEntrega]` — filtra por `usuario_id` y `deleted_at IS NULL`
- [x] 3.3 Agregar método `get_by_id_and_usuario(id: int, usuario_id: int) -> DireccionEntrega | None` — para enforcement de ownership
- [x] 3.4 Agregar método `clear_principal(usuario_id: int) -> None` — UPDATE masivo: `es_principal = false WHERE usuario_id = X AND deleted_at IS NULL`
- [x] 3.5 Agregar método `count_for_usuario(usuario_id: int) -> int` — para detectar primera dirección

## 4. Backend — Unit of Work (actualizar)

- [x] 4.1 Verificar que el UoW en `backend/app/core/uow.py` expone un atributo `direccion_repo: DireccionRepository`
- [x] 4.2 Verificar que el UoW expone `pedido_repo: PedidoRepository` (o similar) para que el service de direcciones pueda consultar pedidos activos
- [x] 4.3 Si el UoW no expone estos repos, agregarlos siguiendo el patrón existente

## 5. Backend — Service (direcciones)

- [x] 5.1 Implementar `crear_direccion(uow, usuario_id, data: DireccionCreate) -> DireccionEntrega` — si es la primera dirección del usuario, setear `es_principal = true`
- [x] 5.2 Implementar `listar_direcciones(uow, usuario_id) -> list[DireccionEntrega]`
- [x] 5.3 Implementar `actualizar_direccion(uow, direccion_id, usuario_id, data: DireccionUpdate) -> DireccionEntrega` — validar ownership; 403 si no es del usuario; 404 si no existe
- [x] 5.4 Implementar `eliminar_direccion(uow, direccion_id, usuario_id, es_admin: bool) -> None` — validar ownership (o es_admin); verificar que no tiene pedidos activos (`PENDIENTE`, `CONFIRMADO`, `EN_PREP`, `EN_CAMINO`); lanzar 409 con código `DIRECCION_CON_PEDIDOS_ACTIVOS` si los tiene; soft delete si OK
- [x] 5.5 Implementar `marcar_como_principal(uow, direccion_id, usuario_id) -> DireccionEntrega` — validar ownership; dentro del mismo UoW: `clear_principal(usuario_id)` luego setear `es_principal = true` en la dirección indicada

## 6. Backend — Router (direcciones)

- [x] 6.1 Implementar `GET /api/v1/direcciones` — requiere JWT CLIENT; llama `listar_direcciones`; retorna `list[DireccionRead]` HTTP 200
- [x] 6.2 Implementar `POST /api/v1/direcciones` — requiere JWT CLIENT; llama `crear_direccion`; retorna `DireccionRead` HTTP 201
- [x] 6.3 Implementar `PUT /api/v1/direcciones/{id}` — requiere JWT CLIENT; llama `actualizar_direccion`; retorna `DireccionRead` HTTP 200
- [x] 6.4 Implementar `DELETE /api/v1/direcciones/{id}` — requiere JWT CLIENT o ADMIN; llama `eliminar_direccion`; retorna HTTP 204
- [x] 6.5 Implementar `PATCH /api/v1/direcciones/{id}/predeterminada` — requiere JWT CLIENT; llama `marcar_como_principal`; retorna `DireccionRead` HTTP 200
- [x] 6.6 Registrar el router en `backend/app/main.py` con prefix `/api/v1/direcciones` y tags `["Direcciones"]`

## 7. Backend — Integración con Pedidos

- [x] 7.1 En `backend/app/modules/pedidos/schemas.py` — verificar que `CrearPedidoRequest` ya tiene `direccion_id: int | None`; si no, agregarlo
- [x] 7.2 En `backend/app/modules/pedidos/service.py`, en `crear_pedido()`: si `direccion_id` no es None, buscar la dirección con `uow.direccion_repo.get_by_id_and_usuario(direccion_id, usuario_id)` — lanzar 403 si no coincide o 404 si no existe
- [x] 7.3 En el mismo método, copiar el snapshot: `pedido.direccion_snapshot_linea1 = direccion.linea1`, `pedido.direccion_snapshot_ciudad = direccion.ciudad`, `pedido.direccion_snapshot_alias = direccion.alias`
- [x] 7.4 Actualizar `PedidoDetail` schema (en schemas de pedidos) para incluir `direccion_snapshot_linea1`, `direccion_snapshot_ciudad`, `direccion_snapshot_alias` como campos opcionales

## 8. Backend — Tests

- [x] 8.1 Crear `backend/tests/test_direcciones.py` con tests para: crear primera dirección (debe ser principal), crear segunda (no debe ser principal), listar propias, no ver ajenas, editar propia, editar ajena → 403, eliminar sin pedidos activos, eliminar con pedidos activos → 409, marcar como principal (desactiva la anterior)
- [x] 8.2 Agregar test en `backend/tests/test_pedidos.py` para: crear pedido con `direccion_id` propio (snapshot copiado), crear con `direccion_id` ajeno → 403, crear sin `direccion_id` (OK, snapshot null)

## 9. Frontend — API Client y Types

- [x] 9.1 Crear `frontend/src/features/direcciones/types.ts` con interfaces: `DireccionRead`, `DireccionCreate`, `DireccionUpdate`
- [x] 9.2 Crear `frontend/src/features/direcciones/api.ts` con funciones Axios: `getDirecciones()`, `createDireccion(data)`, `updateDireccion(id, data)`, `deleteDireccion(id)`, `setDireccionPredeterminada(id)`

## 10. Frontend — Hooks TanStack Query

- [x] 10.1 Crear `frontend/src/features/direcciones/hooks.ts` con: `useDirecciones()` (query), `useCreateDireccion()` (mutation + invalidate), `useUpdateDireccion()` (mutation + invalidate), `useDeleteDireccion()` (mutation + invalidate), `useSetPredeterminada()` (mutation + invalidate)

## 11. Frontend — Componentes

- [x] 11.1 Crear `DireccionCard` — muestra los datos de una dirección con badge "Principal" si `es_principal`; botones Editar, Eliminar y "Marcar como principal"
- [x] 11.2 Crear `DireccionFormModal` — modal con formulario TanStack Form para crear/editar; campos: `linea1` (requerido), `linea2`, `ciudad` (requerido), `codigo_postal`, `referencia`, `alias`; submit dispara `createDireccion` o `updateDireccion` según modo
- [x] 11.3 Crear `ConfirmDeleteModal` (o reutilizar uno existente) — diálogo de confirmación antes de eliminar
- [x] 11.4 Crear `DireccionSelector` — componente para el checkout: lista radio/card de direcciones del usuario; preselecciona la principal; opción "Sin dirección (retiro en local)"

## 12. Frontend — Página de Direcciones

- [x] 12.1 Crear `frontend/src/pages/DireccionesPage.tsx` — usa `useDirecciones()`; renderiza lista de `DireccionCard`; botón "Agregar dirección" abre `DireccionFormModal`
- [x] 12.2 Agregar la ruta `/perfil/direcciones` en `frontend/src/app/router.tsx` (o equivalente) con protección de auth (solo CLIENT)
- [x] 12.3 Agregar link "Mis Direcciones" en el menú de navegación para usuarios con rol CLIENT

## 13. Frontend — Integración en Checkout

- [x] 13.1 En `frontend/src/store/paymentStore.ts` — agregar campo `direccionSeleccionadaId: number | null` con setter `setDireccionSeleccionada`
- [x] 13.2 Integrar `DireccionSelector` en el flujo de checkout (CartDrawer o paso previo al pago) — carga direcciones del usuario, preselecciona la principal
- [x] 13.3 Al llamar a `createPedido` desde el checkout, incluir `direccion_id: paymentStore.direccionSeleccionadaId` en el body del request
- [x] 13.4 Limpiar `direccionSeleccionadaId` en `paymentStore` al completar o cancelar el flujo de checkout
