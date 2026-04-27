## ADDED Requirements

### Requirement: Listado paginado de productos (público)
El sistema SHALL exponer `GET /api/v1/productos` como endpoint público que retorna los productos activos en formato paginado. La respuesta SHALL seguir el esquema `{ items, total, page, size, pages }`. El endpoint SHALL aceptar los query params `page` (default 1), `size` (default 20, max 100), `categoria_id` (opcional), `nombre` (opcional, búsqueda case-insensitive ILIKE), y `disponible` (opcional, boolean). Cuando el caller no pasa `disponible`, el endpoint SHALL retornar solo productos con `disponible=true` y `deleted_at IS NULL`.

#### Scenario: Listado básico sin filtros
- **WHEN** se hace `GET /api/v1/productos` sin parámetros
- **THEN** retorna HTTP 200 con `{ items: [...], total: N, page: 1, size: 20, pages: P }` incluyendo solo productos con `disponible=true` y `deleted_at IS NULL`

#### Scenario: Filtro por categoría
- **WHEN** se hace `GET /api/v1/productos?categoria_id=3`
- **THEN** retorna solo los productos asociados a esa categoría (vía `ProductoCategoria`) que sean disponibles y no eliminados

#### Scenario: Filtro por nombre
- **WHEN** se hace `GET /api/v1/productos?nombre=pizza`
- **THEN** retorna productos cuyo nombre contenga "pizza" (case-insensitive), disponibles y no eliminados

#### Scenario: Paginación
- **WHEN** se hace `GET /api/v1/productos?page=2&size=5`
- **THEN** retorna el segundo bloque de 5 productos y `page=2`, `size=5` en la respuesta

#### Scenario: Catálogo vacío
- **WHEN** no hay productos disponibles
- **THEN** retorna HTTP 200 con `{ items: [], total: 0, page: 1, size: 20, pages: 0 }`

---

### Requirement: Detalle completo de producto (público)
El sistema SHALL exponer `GET /api/v1/productos/{id}` que retorna el producto con sus categorías e ingredientes asociados. El endpoint es público. Si el producto no existe, está eliminado (`deleted_at IS NOT NULL`) o no está disponible, SHALL retornar HTTP 404.

#### Scenario: Detalle exitoso
- **WHEN** se hace `GET /api/v1/productos/1` y el producto existe, está disponible y no eliminado
- **THEN** retorna HTTP 200 con `{ id, nombre, descripcion, imagen_url, precio_base, stock_cantidad, disponible, categorias: [...], ingredientes: [...], creado_en, actualizado_en }`

#### Scenario: Ingredientes con flag de alérgeno
- **WHEN** el producto tiene ingredientes asociados, algunos con `es_alergeno=true`
- **THEN** cada ingrediente en la respuesta incluye `{ id, nombre, es_alergeno, es_removible }`

#### Scenario: Producto no encontrado
- **WHEN** se hace `GET /api/v1/productos/9999` y no existe ese ID
- **THEN** retorna HTTP 404 con `{ "detail": "Producto no encontrado", "code": "PRODUCTO_NOT_FOUND" }`

#### Scenario: Producto eliminado
- **WHEN** el producto tiene `deleted_at IS NOT NULL`
- **THEN** retorna HTTP 404 (igual que no encontrado, no revela existencia)

#### Scenario: Producto no disponible
- **WHEN** el producto tiene `disponible=false` y el caller no está autenticado como ADMIN/STOCK
- **THEN** retorna HTTP 404
