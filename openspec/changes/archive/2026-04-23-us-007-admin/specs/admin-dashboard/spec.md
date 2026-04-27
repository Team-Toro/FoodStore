## ADDED Requirements

### Requirement: Ruta /admin protegida por rol ADMIN
El sistema SHALL proteger todas las rutas bajo `/admin` con `RequireRoles(['ADMIN'])`. Un usuario sin rol ADMIN que intente acceder MUST ser redirigido a `/` con un mensaje de acceso denegado.

#### Scenario: Redirección por permisos insuficientes
- **WHEN** usuario con rol CLIENT navega a `/admin`
- **THEN** el sistema redirige a `/` (o muestra página de acceso denegado)

#### Scenario: Admin accede sin redirección
- **WHEN** usuario con rol ADMIN navega a `/admin`
- **THEN** se renderiza el dashboard sin redirección

### Requirement: Dashboard de métricas con KPI cards
La página `/admin` SHALL renderizar cuatro KPI cards mostrando: ventas totales del período (valor monetario), cantidad total de pedidos, cantidad de usuarios registrados activos, cantidad de productos disponibles. Las cards MUST usar datos del endpoint `GET /api/v1/admin/metricas/resumen`. El componente MUST mostrar estado de loading mientras los datos se obtienen.

#### Scenario: Cards en estado loading
- **WHEN** la página se monta y la query aún no resolvió
- **THEN** cada card muestra un skeleton loader

#### Scenario: Cards con datos reales
- **WHEN** la query resuelve exitosamente
- **THEN** cada card muestra el valor correspondiente del resumen

### Requirement: Gráfico LineChart de ventas por período
La página `/admin` SHALL incluir componente `VentasLineChart` que consume `GET /api/v1/admin/metricas/ventas`. El gráfico MUST usar `recharts LineChart` con eje X (período) y eje Y (monto). Debe permitir seleccionar granularidad (`dia` / `semana` / `mes`) mediante selector en la UI. Al cambiar la granularidad, se refetch la query automáticamente.

#### Scenario: Selección de granularidad dispara refetch
- **WHEN** usuario cambia el selector de granularidad a "semana"
- **THEN** TanStack Query invalida el cache y refetch con `granularidad=semana`

#### Scenario: Gráfico vacío cuando no hay datos
- **WHEN** la API retorna array vacío
- **THEN** el gráfico muestra mensaje "Sin datos para el período seleccionado"

### Requirement: Gráfico PieChart de pedidos por estado
La página `/admin` SHALL incluir componente `PedidosPieChart` que consume `GET /api/v1/admin/metricas/pedidos-por-estado`. MUST usar `recharts PieChart` con colores distintos por estado y leyenda visible.

#### Scenario: Todos los estados representados
- **WHEN** la query resuelve con datos
- **THEN** el PieChart renderiza un sector por estado con su etiqueta y porcentaje

### Requirement: Gráfico BarChart de top productos
La página `/admin` SHALL incluir componente `TopProductosBarChart` que consume `GET /api/v1/admin/metricas/productos-top?top=10`. MUST usar `recharts BarChart` con barras horizontales, eje Y = nombre del producto, eje X = cantidad vendida.

#### Scenario: Top 10 productos renderizados
- **WHEN** la query resuelve con 10 productos
- **THEN** BarChart muestra 10 barras horizontales ordenadas de mayor a menor

### Requirement: Página /admin/productos — tabla admin
La página `/admin/productos` SHALL mostrar tabla de todos los productos (incluyendo soft-deleted con indicador visual). Cada fila MUST incluir: nombre, categoría, precio, stock, disponible (toggle), estado (activo/eliminado). El toggle de disponibilidad MUST llamar `PATCH /api/v1/productos/{id}/disponibilidad` inmediatamente sin diálogo de confirmación. Incluir botón para restaurar soft-deleted.

#### Scenario: Toggle disponibilidad sin confirmación
- **WHEN** Admin hace click en el toggle de disponibilidad de un producto
- **THEN** se llama al endpoint inmediatamente y el toggle refleja el nuevo estado al resolver

#### Scenario: Productos soft-deleted con indicador visual
- **WHEN** la tabla carga con `incluir_eliminados=true`
- **THEN** las filas de productos eliminados aparecen con fondo diferenciado (e.g., tachado o clase CSS `opacity-50`)

### Requirement: Página /admin/usuarios — tabla de gestión
La página `/admin/usuarios` SHALL mostrar tabla paginada de usuarios con: nombre, email, roles (chips), estado activo (badge), fecha de registro. MUST incluir: input de búsqueda por nombre/email, selector de filtro por rol. Al hacer click en un usuario, abre modal/panel lateral con formulario para modificar roles y estado activo. El formulario MUST validar que no se quede el sistema sin ADMIN (error desde la API propagado al UI).

#### Scenario: Búsqueda en tiempo real
- **WHEN** Admin escribe en el input de búsqueda
- **THEN** la tabla refetch con `?q=<texto>` con debounce de 300ms

#### Scenario: Error de último ADMIN visible al usuario
- **WHEN** la API responde HTTP 422 con `code: "LAST_ADMIN_PROTECTED"`
- **THEN** el formulario muestra mensaje de error "No se puede remover el último administrador del sistema"

### Requirement: Extensión de guards para rol ADMIN en catálogo y pedidos
Los endpoints de gestión de catálogo (`POST/PUT/PATCH/DELETE /api/v1/productos`, gestión de categorías) SHALL aceptar tanto rol ADMIN como STOCK. Los endpoints de gestión de pedidos (`PATCH /api/v1/pedidos/{id}/estado`) SHALL aceptar tanto rol ADMIN como PEDIDOS (ya implementado en us-005, verificar que el guard incluya ADMIN).

#### Scenario: Admin puede crear un producto
- **WHEN** usuario con rol ADMIN llama `POST /api/v1/productos` con datos válidos
- **THEN** responde HTTP 201 (no 403)

#### Scenario: Admin puede avanzar estado de pedido
- **WHEN** usuario con rol ADMIN llama `PATCH /api/v1/pedidos/{id}/estado`
- **THEN** responde según la FSM (no 403)
