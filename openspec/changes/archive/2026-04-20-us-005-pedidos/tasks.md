## 1. Base de Datos — Migración Alembic

- [x] 1.1 Verificar que los modelos `Pedido`, `DetallePedido` y `HistorialEstadoPedido` en `backend/app/modules/pedidos/model.py` están definidos con todos los campos del ERD v5 (incluyendo `personalizacion INTEGER[]`, `estado_desde VARCHAR NULL`, `costo_envio`, `direccion_snapshot` fields)
- [x] 1.2 Generar migración Alembic: `alembic revision --autogenerate -m "feat(pedidos): add pedido detalle_pedido historial_estado_pedido tables"`
- [x] 1.3 Revisar el archivo de migración generado y confirmar que incluye las tres tablas con FK correctas y tipo `ARRAY(Integer)` para `personalizacion`
- [x] 1.4 Ejecutar `alembic upgrade head` y verificar que no hay errores
- [x] 1.5 Confirmar que `python -m app.db.seed` carga correctamente los 6 `EstadoPedido` y las `FormaPago` (necesarios como FK)

## 2. Backend — Modelos y Schemas

- [x] 2.1 Implementar `app/modules/pedidos/model.py`: clases `Pedido`, `DetallePedido`, `HistorialEstadoPedido` como tablas SQLModel con todas las relaciones y constraints
- [x] 2.2 Implementar `app/modules/pedidos/schemas.py`: `CrearPedidoRequest`, `ItemPedidoRequest`, `CambiarEstadoRequest` (con `nuevo_estado` y `motivo: Optional[str]`), `PedidoRead`, `PedidoDetail`, `DetallePedidoRead`, `HistorialRead`, `PaginatedPedidos`
- [x] 2.3 Añadir `PedidoRead` y `PedidoDetail` con todos los campos requeridos por los endpoints (incluyendo ítems embebidos en `PedidoDetail`)

## 3. Backend — Repository

- [x] 3.1 Implementar `app/modules/pedidos/repository.py` con `PedidoRepository(BaseRepository[Pedido])`: métodos `get_by_id`, `list_paginated(usuario_id=None, estado=None, page, size)`, `create`
- [x] 3.2 Implementar `DetallePedidoRepository`: método `create_bulk(detalles: list[DetallePedido])`
- [x] 3.3 Implementar `HistorialEstadoPedidoRepository`: método `append(registro)` — solo INSERT, nunca UPDATE/DELETE; método `get_by_pedido_id(pedido_id)`
- [x] 3.4 Añadir `uow.pedidos`, `uow.detalles_pedido`, `uow.historial_pedido` en `app/core/uow.py`
- [x] 3.5 Implementar `ProductoRepository.get_for_update(producto_id)` con `SELECT ... FOR UPDATE` para validación de stock atómico (si no existe aún)

## 4. Backend — Service (FSM + Lógica de Negocio)

- [x] 4.1 Implementar constantes `TRANSICIONES_PERMITIDAS` y `ROLES_POR_TRANSICION` en `app/modules/pedidos/service.py` según el diseño D-01
- [x] 4.2 Implementar `crear_pedido(uow, body: CrearPedidoRequest, usuario_id: int)`: validar stock (SELECT FOR UPDATE), crear Pedido, crear DetallePedido[] con snapshots, crear HistorialEstadoPedido inicial con `estado_desde=None`
- [x] 4.3 Implementar `listar_pedidos(uow, usuario_id, rol, estado, page, size)`: filtrar por `usuario_id` si rol es CLIENT
- [x] 4.4 Implementar `obtener_pedido(uow, pedido_id, usuario_id, rol)`: validar propiedad si rol CLIENT; retornar `PedidoDetail` con ítems e historial
- [x] 4.5 Implementar `cambiar_estado(uow, pedido_id, nuevo_estado, motivo, usuario_id, rol)`: validar FSM, validar rol, ejecutar efecto de stock si aplica (decremento al CONFIRMAR, restauración al CANCELAR desde CONFIRMADO), registrar en historial
- [x] 4.6 Implementar `obtener_historial(uow, pedido_id, usuario_id, rol)`: validar propiedad si CLIENT; retornar historial ordenado por `created_at ASC`
- [x] 4.7 Validar que `motivo` es requerido cuando `nuevo_estado == "CANCELADO"` (RN-05)

## 5. Backend — Router

- [x] 5.1 Implementar `app/modules/pedidos/router.py` con los 5 endpoints:
  - `POST /api/v1/pedidos` (requiere rol CLIENT)
  - `GET /api/v1/pedidos` (requiere CLIENT, PEDIDOS o ADMIN)
  - `GET /api/v1/pedidos/{id}` (requiere CLIENT, PEDIDOS o ADMIN)
  - `PATCH /api/v1/pedidos/{id}/estado` (requiere PEDIDOS o ADMIN; CLIENT para cancelar propio)
  - `GET /api/v1/pedidos/{id}/historial` (requiere CLIENT, PEDIDOS o ADMIN)
- [x] 5.2 Registrar el router en `app/main.py` con prefix `/api/v1`
- [x] 5.3 Verificar que los endpoints retornan los códigos HTTP correctos: 201 (crear), 200 (resto), 404, 403, 422 con códigos de error definidos

## 6. Backend — Tests

- [x] 6.1 Escribir `backend/tests/test_pedidos.py` con casos:
  - `test_crear_pedido_exitoso`
  - `test_crear_pedido_stock_insuficiente`
  - `test_crear_pedido_sin_items`
  - `test_listar_pedidos_cliente_solo_ve_suyos`
  - `test_listar_pedidos_admin_ve_todos`
  - `test_cambiar_estado_valido`
  - `test_cambiar_estado_transicion_invalida`
  - `test_cancelar_pedido_confirmado_restaura_stock`
  - `test_cancelar_en_prep_solo_admin`
  - `test_cancelar_sin_motivo_falla`
  - `test_historial_append_only`
- [x] 6.2 Ejecutar `pytest tests/test_pedidos.py -v` y confirmar que todos pasan

## 7. Frontend — Tipos y API

- [x] 7.1 Definir tipos en `frontend/src/types/pedido.ts`: `PedidoRead`, `PedidoDetail`, `DetallePedidoRead`, `HistorialRead`, `PaginatedPedidos`, `CrearPedidoRequest`, `CambiarEstadoRequest`
- [x] 7.2 Implementar `frontend/src/api/pedidosApi.ts`: funciones `crearPedido`, `listarPedidos`, `obtenerPedido`, `cambiarEstado`, `obtenerHistorial` usando el cliente Axios con interceptor JWT

## 8. Frontend — Hooks TanStack Query

- [x] 8.1 Implementar `frontend/src/hooks/usePedidos.ts`: `useListarPedidos(params)` con TanStack Query
- [x] 8.2 Implementar `useObtenerPedido(id)` con TanStack Query
- [x] 8.3 Implementar `useCrearPedido()`: mutation que llama `crearPedido`, en `onSuccess` ejecuta `cartStore.clearCart()` y redirige a `/pedidos/{id}`
- [x] 8.4 Implementar `useCambiarEstado()`: mutation con invalidación de query de pedido tras éxito

## 9. Frontend — Componentes y Páginas

- [x] 9.1 Implementar componente `HistorialTimeline` que renderiza la lista de `HistorialRead` en orden cronológico con íconos de estado y timestamps
- [x] 9.2 Implementar página `MisPedidos` (`/pedidos`): listado paginado de pedidos del cliente autenticado con estado visual, fecha y total; filtro por estado
- [x] 9.3 Implementar página `DetallePedido` (`/pedidos/:id`): detalle completo con ítems, snapshots, dirección, total, estado actual y `HistorialTimeline`
- [x] 9.4 Implementar `CheckoutForm` o integración en `CartDrawer`: botón "Confirmar Pedido" que llama `useCrearPedido` con los ítems del `cartStore`
- [x] 9.5 Implementar página `GestionPedidos` (`/admin/pedidos`): visible para rol PEDIDOS y ADMIN, listado de todos los pedidos con filtros por estado y botones de avance de estado
- [x] 9.6 Registrar las rutas nuevas en el router de React con guards de rol correspondientes

## 10. Frontend — Zustand (cartStore)

- [x] 10.1 Verificar que `cartStore` tiene la acción `clearCart()` implementada
- [x] 10.2 Implementar `mapCartToCrearPedidoRequest(items, formaPago, direccionId)` en un helper que transforma el estado del `cartStore` al formato `CrearPedidoRequest`

## 11. Integración y Verificación Final

- [x] 11.1 Probar flujo end-to-end: login CLIENT → agregar productos al carrito → crear pedido → verificar estado PENDIENTE → avanzar a EN_PREP (con rol PEDIDOS) → avanzar a EN_CAMINO → avanzar a ENTREGADO
- [x] 11.2 Probar flujo de cancelación: crear pedido → simular confirmación manual → cancelar (con motivo) → verificar stock restaurado
- [x] 11.3 Verificar que `HistorialEstadoPedido` acumula todos los registros en orden cronológico sin UPDATE/DELETE
- [x] 11.4 Verificar que el frontend vacía el `cartStore` después de crear el pedido
- [x] 11.5 Ejecutar `npm run lint` y `npm run build` sin errores en el frontend
