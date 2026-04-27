## ADDED Requirements

### Requirement: Listado paginado del catálogo público
El sistema SHALL mostrar productos con `disponible=true` y `deleted_at IS NULL` en un grid paginado (20 por página). Cada tarjeta SHALL mostrar nombre, imagen, precio (2 decimales), categorías y badge "Sin stock" si `stock = 0`.

#### Scenario: Catálogo con productos disponibles
- **WHEN** el cliente navega a la sección de catálogo
- **THEN** el sistema muestra un grid con las tarjetas de productos paginadas (máx. 20 por página)

#### Scenario: Producto sin stock visible pero bloqueado
- **WHEN** un producto tiene `stock = 0` y `disponible = true`
- **THEN** la tarjeta muestra badge "Sin stock" y el botón "Agregar" aparece deshabilitado

#### Scenario: Catálogo vacío
- **WHEN** no hay productos disponibles
- **THEN** el sistema muestra mensaje "No hay productos disponibles" con sugerencia de volver más tarde

---

### Requirement: Búsqueda de productos por nombre
El sistema SHALL permitir filtrar el catálogo por nombre ingresando texto en un campo de búsqueda. La búsqueda SHALL ser case-insensitive y enviarse como query param `?nombre=` al endpoint.

#### Scenario: Búsqueda con resultados
- **WHEN** el cliente escribe en el campo de búsqueda y espera 300 ms (debounce)
- **THEN** el grid se actualiza mostrando solo productos cuyo nombre contiene el texto ingresado

#### Scenario: Búsqueda sin resultados
- **WHEN** la búsqueda no encuentra ningún producto
- **THEN** el sistema muestra mensaje "No se encontraron productos para '[término]'"

---

### Requirement: Filtro de catálogo por categoría
El sistema SHALL permitir filtrar productos por categoría usando un selector. Al seleccionar una categoría, se envía `?categoria_id=` al endpoint.

#### Scenario: Filtro activo
- **WHEN** el cliente selecciona una categoría del selector
- **THEN** el grid muestra solo productos de esa categoría y el filtro queda marcado como activo

#### Scenario: Limpiar filtro
- **WHEN** el cliente selecciona "Todas las categorías"
- **THEN** el grid muestra todos los productos disponibles sin filtro de categoría

---

### Requirement: Vista de detalle de producto
El sistema SHALL mostrar un modal de detalle al hacer clic en una tarjeta de producto. El modal SHALL incluir: nombre, descripción, precio, imagen, categorías, e ingredientes con flag de alérgeno.

#### Scenario: Abrir modal de detalle
- **WHEN** el cliente hace clic en la tarjeta de un producto
- **THEN** se abre un modal con el detalle completo del producto y la lista de ingredientes (con íconos de alérgenos marcados)

#### Scenario: Ingredientes alérgenos destacados
- **WHEN** el modal muestra ingredientes
- **THEN** los ingredientes con `es_alergeno=true` se marcan visualmente (ícono o badge)

---

### Requirement: Carga y estados de UI del catálogo
El sistema SHALL mostrar skeleton loaders mientras se cargan los productos y un mensaje de error con opción de reintentar si la API falla.

#### Scenario: Estado de carga
- **WHEN** la petición `GET /api/v1/productos` está en vuelo
- **THEN** se muestran tarjetas skeleton en lugar del grid

#### Scenario: Error de red
- **WHEN** la petición falla con error de red o status >= 500
- **THEN** se muestra mensaje "Error al cargar productos" con botón "Reintentar"
