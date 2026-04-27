## Context

El módulo de pedidos es el núcleo del dominio de negocio de Food Store. Conecta el carrito del cliente (us-004) con el sistema de pagos (us-006). Introduce la entidad `Pedido` con una FSM de 6 estados, el patrón Snapshot para precios y nombres de producto, y un audit trail append-only en `HistorialEstadoPedido`. El backend ya tiene la estructura de archivos creada (`model.py`, `schemas.py`, `repository.py`, `service.py`, `router.py` en `app/modules/pedidos/`), pero aún sin implementación. El ERD v5 define las tablas (`Pedido`, `DetallePedido`, `HistorialEstadoPedido`).

Restricciones clave:
- La FSM debe vivir **solo** en la capa de servicio — el router no puede contener lógica de transición.
- `HistorialEstadoPedido` es append-only: la aplicación NUNCA emite `UPDATE` ni `DELETE` sobre esa tabla.
- El stock se maneja de forma atómica dentro del mismo UoW que avanza el estado.
- La transición `PENDIENTE → CONFIRMADO` está reservada para el webhook de MercadoPago (us-006). En este change se implementa la infraestructura pero la transición automática se activa en us-006.

## Goals / Non-Goals

**Goals:**
- Implementar los 5 endpoints de pedidos definidos en el spec de la API.
- Implementar la FSM completa con validación de transiciones y gestión de stock atómica.
- Implementar el Snapshot Pattern (precio y nombre) al crear el pedido.
- Implementar `HistorialEstadoPedido` como append-only con trazabilidad completa.
- Implementar RBAC por endpoint y por transición de estado.
- Frontend: páginas `MisPedidos`, `DetallePedido`, panel de gestión para rol PEDIDOS, hook `usePedidos`.

**Non-Goals:**
- Integración con MercadoPago (us-006).
- Transición automática `PENDIENTE → CONFIRMADO` vía webhook (us-006).
- Dashboard de admin con métricas (us-007).
- Gestión de direcciones de entrega (us-008).
- Notificaciones por email/push (fuera de scope del proyecto).

## Decisions

### D-01: FSM implementada como mapa de transiciones en `service.py`

**Decisión**: La FSM se define como un diccionario `TRANSICIONES_PERMITIDAS: dict[str, list[str]]` en `service.py`. Antes de cada transición, el service valida que `(estado_actual, nuevo_estado)` esté en el mapa. Los roles permitidos por transición se validan por separado con un mapa `ROLES_POR_TRANSICION`.

**Alternativa considerada**: Usar una librería de FSM (ej. `transitions`). Descartada porque agrega dependencia externa innecesaria para un grafo simple y fijo.

**Rationale**: El mapa es explícito, legible y testeble unitariamente sin levantar FastAPI.

```python
TRANSICIONES_PERMITIDAS = {
    "PENDIENTE":   ["CONFIRMADO", "CANCELADO"],
    "CONFIRMADO":  ["EN_PREP", "CANCELADO"],
    "EN_PREP":     ["EN_CAMINO", "CANCELADO"],
    "EN_CAMINO":   ["ENTREGADO"],
    "ENTREGADO":   [],
    "CANCELADO":   [],
}

ROLES_POR_TRANSICION = {
    ("PENDIENTE",  "CONFIRMADO"): ["SISTEMA"],          # solo webhook MP
    ("PENDIENTE",  "CANCELADO"):  ["CLIENT", "PEDIDOS", "ADMIN"],
    ("CONFIRMADO", "EN_PREP"):    ["PEDIDOS", "ADMIN"],
    ("CONFIRMADO", "CANCELADO"):  ["PEDIDOS", "ADMIN"],
    ("EN_PREP",    "EN_CAMINO"):  ["PEDIDOS", "ADMIN"],
    ("EN_PREP",    "CANCELADO"):  ["ADMIN"],             # solo ADMIN (RN-RB08)
    ("EN_CAMINO",  "ENTREGADO"):  ["PEDIDOS", "ADMIN"],
}
```

### D-02: Snapshot Pattern — copiar precio y nombre en `DetallePedido`

**Decisión**: Al crear el pedido, se copian `producto.precio_base` → `precio_snapshot` y `producto.nombre` → `nombre_snapshot` en cada `DetallePedido`. No se usa FK al precio histórico; los campos son columnas planas en la tabla.

**Alternativa considerada**: FK a tabla de precios históricos. Descartada por complejidad innecesaria.

**Rationale**: Garantiza inmutabilidad sin joins. Si el producto cambia de precio o nombre, el pedido existente no se ve afectado (RN-DA06).

### D-03: Validación de stock con `SELECT FOR UPDATE` dentro del UoW

**Decisión**: Al crear el pedido, el repositorio de productos ejecuta `SELECT ... FOR UPDATE` sobre cada `Producto` referenciado. Si `stock < cantidad`, el service lanza `HTTPException(422)` y el UoW hace rollback automático.

**Alternativa considerada**: Validar stock antes de abrir la transacción y luego insertar. Descartada por race condition: entre la validación y el insert, otro pedido puede consumir el stock.

**Rationale**: `SELECT FOR UPDATE` serializa el acceso a las filas de productos afectados, garantizando atomicidad (RN-PE04, RN-PE05).

### D-04: Decremento y restauración de stock dentro del mismo UoW de cambio de estado

**Decisión**: La transición `* → CONFIRMADO` (decremento) y `CONFIRMADO → CANCELADO` (restauración) se ejecutan en el mismo contexto `with UnitOfWork() as uow:` que registra la transición en `HistorialEstadoPedido`. Si el decremento falla (stock insuficiente al momento del webhook), todo hace rollback.

**Rationale**: Garantiza que nunca quede un pedido en CONFIRMADO con stock sin decrementar, ni un pedido CANCELADO sin stock restaurado.

### D-05: `HistorialEstadoPedido` — primer registro con `estado_desde = NULL`

**Decisión**: El primer `INSERT` en historial al crear el pedido usa `estado_desde = NULL`. Los siguientes registros siempre tienen `estado_desde` con el estado anterior (RN-02).

**Rationale**: Es el contrato definido en el ERD v5. Permite distinguir la creación de las transiciones posteriores.

### D-06: RBAC — CLIENT accede solo a sus propios pedidos

**Decisión**: Los endpoints `GET /api/v1/pedidos` y `GET /api/v1/pedidos/{id}` filtran por `usuario_id = current_user.id` si el rol es `CLIENT`. Los roles `PEDIDOS` y `ADMIN` ven todos. El service recibe el usuario completo y aplica el filtro.

**Alternativa considerada**: Dos endpoints separados (uno para cliente, otro para gestión). Descartada por duplicación innecesaria.

**Rationale**: Un único endpoint con lógica de filtro en el service es más simple y coherente con el patrón usado en otros módulos.

### D-07: Frontend — vaciar carrito post-creación de pedido

**Decisión**: Después de un `POST /api/v1/pedidos` exitoso, el hook `useCrearPedido` llama a `cartStore.clearCart()` y redirige a `/pedidos/{id}`.

**Rationale**: El carrito representa la intención pre-pedido. Una vez confirmado el pedido, el carrito queda obsoleto y debe vaciarse para evitar re-compra accidental.

## Risks / Trade-offs

- **[Riesgo] Race condition en stock** → Mitigación: `SELECT FOR UPDATE` en el repositorio de productos garantiza serialización a nivel de fila.
- **[Riesgo] Transición PENDIENTE → CONFIRMADO habilitada manualmente en esta fase** → Mitigación: La transición está en el mapa pero solo la invoca el webhook (us-006). En testing se puede invocar con rol ADMIN temporalmente para probar el flujo completo.
- **[Trade-off] `personalizacion` como `INTEGER[]` (PostgreSQL array)** → Alternativa sería tabla `DetallePedidoIngrediente`. Se usa array porque la personalización es solo para exclusión de ingredientes; no necesita metadatos adicionales y PostgreSQL soporta arrays nativamente.
- **[Riesgo] Historial append-only requiere disciplina de equipo** → Mitigación: documentado explícitamente en el repositorio y se puede agregar un constraint de DB (`INSERT ONLY` trigger) si se requiere enforcement a nivel de BD.
- **[Trade-off] `direccion_id` como FK con `SET NULL`** → El pedido almacena `direccion_snapshot` (campos planos) para inmutabilidad. Si la dirección se elimina, `direccion_id` queda NULL pero el snapshot sigue intacto.

## Migration Plan

1. Crear migración Alembic: `alembic revision --autogenerate -m "feat(pedidos): add pedido, detalle_pedido, historial_estado_pedido tables"`.
2. Ejecutar `alembic upgrade head`.
3. Ejecutar `python -m app.db.seed` para poblar `EstadoPedido` y `FormaPago` (ya incluidos en seed existente).
4. Implementar backend módulo pedidos.
5. Implementar frontend feature pedidos.
6. No hay rollback destructivo: las tablas son nuevas, no modifican esquema existente.
