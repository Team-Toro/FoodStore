## ADDED Requirements

### Requirement: Endpoint resumen de métricas generales
El sistema SHALL exponer `GET /api/v1/admin/metricas/resumen` accesible únicamente con rol ADMIN. Acepta query params opcionales `desde` (date ISO) y `hasta` (date ISO). El response SHALL incluir: `ventas_totales` (DECIMAL suma de pagos APROBADOS), `cantidad_pedidos` (INT), `pedidos_por_estado` (objeto con conteo por cada estado), `usuarios_registrados` (INT total activos), `productos_activos` (INT disponibles y no eliminados).

#### Scenario: Resumen sin filtro de fecha
- **WHEN** Admin llama `GET /api/v1/admin/metricas/resumen` sin parámetros
- **THEN** responde HTTP 200 con métricas de los últimos 30 días

#### Scenario: Resumen con rango de fechas
- **WHEN** Admin llama con `?desde=2024-01-01&hasta=2024-01-31`
- **THEN** responde HTTP 200 con métricas filtradas a ese período

#### Scenario: Acceso denegado sin rol ADMIN
- **WHEN** un usuario con rol CLIENT o PEDIDOS llama al endpoint
- **THEN** responde HTTP 403

### Requirement: Endpoint ventas por período
El sistema SHALL exponer `GET /api/v1/admin/metricas/ventas` con params `desde`, `hasta` y `granularidad` (enum: `dia`, `semana`, `mes`, default `dia`). Retorna array de `{ periodo: string, monto_total: float, cantidad_pedidos: int }` ordenado cronológicamente. La query MUST usar `DATE_TRUNC` para agrupar por granularidad.

#### Scenario: Ventas agrupadas por día
- **WHEN** Admin llama con `granularidad=dia&desde=2024-01-01&hasta=2024-01-07`
- **THEN** responde array de hasta 7 objetos, uno por día, con `periodo` en formato `YYYY-MM-DD`

#### Scenario: Ventas agrupadas por mes
- **WHEN** Admin llama con `granularidad=mes&desde=2024-01-01&hasta=2024-03-31`
- **THEN** responde array de 3 objetos con `periodo` en formato `YYYY-MM`

#### Scenario: Período sin ventas devuelve array vacío
- **WHEN** el rango seleccionado no tiene pedidos confirmados ni pagos aprobados
- **THEN** responde HTTP 200 con `[]`

### Requirement: Endpoint top productos más vendidos
El sistema SHALL exponer `GET /api/v1/admin/metricas/productos-top` con params `top` (int, default 10), `desde`, `hasta`. Retorna array de `{ producto_id, nombre_snapshot, cantidad_vendida: int, ingreso_total: float }` ordenado por `cantidad_vendida` DESC. MUST considerar sólo pedidos con estado ENTREGADO o CONFIRMADO (excluyendo CANCELADO).

#### Scenario: Top 5 productos
- **WHEN** Admin llama con `?top=5`
- **THEN** responde array de máximo 5 productos ordenados por cantidad vendida descendente

#### Scenario: Filtro por fecha aplica
- **WHEN** Admin filtra por `desde` y `hasta`
- **THEN** sólo se cuentan detalles de pedidos creados en ese rango

#### Scenario: Sin datos suficientes devuelve lo disponible
- **WHEN** existen sólo 3 productos vendidos y `top=10`
- **THEN** responde array de 3 elementos (no error)

### Requirement: Endpoint pedidos por estado
El sistema SHALL exponer `GET /api/v1/admin/metricas/pedidos-por-estado` con params opcionales `desde`, `hasta`. Retorna array de `{ estado: string, cantidad: int }` para todos los estados del sistema (incluyendo estados con 0 pedidos). MUST incluir todos los EstadoPedido del sistema, poniendo `cantidad: 0` para los que no tengan pedidos en el rango.

#### Scenario: Distribución completa de estados
- **WHEN** Admin llama sin filtros
- **THEN** responde array con un objeto por cada estado (PENDIENTE, CONFIRMADO, EN_PREP, EN_CAMINO, ENTREGADO, CANCELADO)

#### Scenario: Filtro por fecha
- **WHEN** Admin llama con rango de fechas
- **THEN** cuenta pedidos cuyo `created_at` esté dentro del rango
