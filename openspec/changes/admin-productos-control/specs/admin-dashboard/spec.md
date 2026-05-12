## MODIFIED Requirements

### Requirement: Página /admin/productos — tabla admin
La página `/admin/productos` SHALL mostrar tabla de todos los productos (incluyendo soft-deleted con indicador visual). Cada fila MUST incluir: nombre, categoría, precio, stock, disponible (toggle), estado (activo/eliminado). El toggle de disponibilidad MUST llamar `PATCH /api/v1/productos/{id}/disponibilidad` inmediatamente sin diálogo de confirmación. Incluir botón para restaurar soft-deleted.

Además, la página MUST permitir:
- **Crear producto** desde la UI (abrir formulario, validar, persistir) usando `POST /api/v1/productos`.
- **Editar producto** desde la UI (abrir formulario con datos existentes, validar, persistir) usando `PUT /api/v1/productos/{id}` (o el endpoint de actualización existente).
- **Modificar stock_cantidad** desde el panel como parte del formulario de edición/creación, persistiendo el valor enviado y reflejándolo en la tabla al guardar.

#### Scenario: Toggle disponibilidad sin confirmación
- **WHEN** Admin hace click en el toggle de disponibilidad de un producto
- **THEN** se llama al endpoint inmediatamente y el toggle refleja el nuevo estado al resolver

#### Scenario: Productos soft-deleted con indicador visual
- **WHEN** la tabla carga con `incluir_eliminados=true`
- **THEN** las filas de productos eliminados aparecen con fondo diferenciado (e.g., tachado o clase CSS `opacity-50`)

#### Scenario: Admin crea un producto desde /admin/productos
- **WHEN** Admin hace click en "Nuevo producto", completa el formulario con datos válidos (incluyendo `stock_cantidad`) y guarda
- **THEN** la UI llama `POST /api/v1/productos` y, al resolver, el nuevo producto aparece en la tabla con el stock cargado

#### Scenario: Admin edita un producto y actualiza el stock
- **WHEN** Admin edita un producto existente, cambia `stock_cantidad` y guarda
- **THEN** la UI persiste el cambio mediante el endpoint de actualización y la tabla refleja el nuevo stock

### Requirement: Extensión de guards para rol ADMIN en catálogo y pedidos
Los endpoints de gestión de catálogo (`POST/PUT/PATCH/DELETE /api/v1/productos`, gestión de categorías) SHALL aceptar tanto rol ADMIN como STOCK. Los endpoints de gestión de pedidos (`PATCH /api/v1/pedidos/{id}/estado`) SHALL aceptar tanto rol ADMIN como PEDIDOS (ya implementado en us-005, verificar que el guard incluya ADMIN).

#### Scenario: Admin puede crear un producto
- **WHEN** usuario con rol ADMIN llama `POST /api/v1/productos` con datos válidos
- **THEN** responde HTTP 201 (no 403)

#### Scenario: Admin puede avanzar estado de pedido
- **WHEN** usuario con rol ADMIN llama `PATCH /api/v1/pedidos/{id}/estado`
- **THEN** responde según la FSM (no 403)

## ADDED Requirements

### Requirement: Rol ADMIN no expone carrito/checkout en UI
Cuando el usuario autenticado incluye el rol `ADMIN`, la aplicación MUST ocultar entrypoints de carrito/checkout (links, íconos, accesos directos) y MUST bloquear acceso directo a rutas de carrito/checkout mediante guards de routing, redirigiendo a una ruta válida del admin.

#### Scenario: Admin no ve acceso al carrito
- **WHEN** un usuario con rol ADMIN navega por la app
- **THEN** la UI no muestra ningún link/botón hacia carrito/checkout

#### Scenario: Admin intenta acceder por URL a /carrito
- **WHEN** un usuario con rol ADMIN navega manualmente a una ruta de carrito/checkout (e.g. `/carrito` o `/checkout`)
- **THEN** el router redirige a `/admin` (o a una página de acceso denegado del admin)
