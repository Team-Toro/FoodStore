## ADDED Requirements

### Requirement: Sincronizar categorías de un producto
El sistema SHALL exponer `PUT /api/v1/productos/{id}/categorias` con body `{ "categoria_ids": [int] }`. Este endpoint reemplaza TODAS las categorías actuales del producto con el nuevo conjunto. Solo roles ADMIN o STOCK pueden acceder. Si algún `categoria_id` no existe, SHALL retornar error. Si el array está vacío, elimina todas las asociaciones.

#### Scenario: Asignación exitosa de categorías
- **WHEN** un usuario ADMIN hace `PUT /api/v1/productos/1/categorias` con `{ "categoria_ids": [2, 5] }`
- **THEN** retorna HTTP 200 con el producto actualizado y sus nuevas categorías; las categorías anteriores son reemplazadas

#### Scenario: Array vacío elimina todas las categorías
- **WHEN** se envía `{ "categoria_ids": [] }`
- **THEN** retorna HTTP 200 y el producto queda sin categorías asociadas

#### Scenario: Categoría inexistente
- **WHEN** se incluye un `categoria_id` que no existe en la BD
- **THEN** retorna HTTP 422 con `{ "code": "CATEGORIA_NOT_FOUND", "detail": "Categoría X no encontrada" }`

#### Scenario: Producto no encontrado
- **WHEN** el `id` del producto no existe o está eliminado
- **THEN** retorna HTTP 404

#### Scenario: Sin autorización
- **WHEN** un CLIENT intenta modificar las categorías de un producto
- **THEN** retorna HTTP 403

---

### Requirement: Sincronizar ingredientes de un producto
El sistema SHALL exponer `PUT /api/v1/productos/{id}/ingredientes` con body `{ "ingredientes": [{ "ingrediente_id": int, "es_removible": bool }] }`. Este endpoint reemplaza TODAS las asociaciones de ingredientes. El campo `es_removible` indica si el cliente puede excluir ese ingrediente al personalizar su pedido. Solo roles ADMIN o STOCK pueden acceder.

#### Scenario: Asignación exitosa de ingredientes
- **WHEN** un usuario ADMIN hace `PUT /api/v1/productos/1/ingredientes` con `{ "ingredientes": [{ "ingrediente_id": 3, "es_removible": true }, { "ingrediente_id": 7, "es_removible": false }] }`
- **THEN** retorna HTTP 200 con los ingredientes actualizados; los anteriores son reemplazados

#### Scenario: Array vacío elimina todos los ingredientes
- **WHEN** se envía `{ "ingredientes": [] }`
- **THEN** retorna HTTP 200 y el producto queda sin ingredientes asociados

#### Scenario: Ingrediente inexistente
- **WHEN** se incluye un `ingrediente_id` que no existe en la BD
- **THEN** retorna HTTP 422 con `{ "code": "INGREDIENTE_NOT_FOUND", "detail": "Ingrediente X no encontrado" }`

#### Scenario: Ingrediente eliminado no puede asociarse
- **WHEN** se incluye un `ingrediente_id` cuyo `deleted_at IS NOT NULL`
- **THEN** retorna HTTP 422 con `{ "code": "INGREDIENTE_NOT_FOUND" }`

#### Scenario: Sin autorización
- **WHEN** un CLIENT intenta modificar los ingredientes de un producto
- **THEN** retorna HTTP 403

---

### Requirement: Listar ingredientes de un producto (público)
El sistema SHALL exponer `GET /api/v1/productos/{id}/ingredientes` que retorna la lista de ingredientes asociados al producto con sus flags `es_alergeno` y `es_removible`. El endpoint es público. Si el producto no existe o está eliminado, retorna HTTP 404.

#### Scenario: Listado exitoso
- **WHEN** se hace `GET /api/v1/productos/1/ingredientes`
- **THEN** retorna HTTP 200 con `[{ id, nombre, es_alergeno, es_removible }]`

#### Scenario: Producto sin ingredientes
- **WHEN** el producto existe pero no tiene ingredientes asociados
- **THEN** retorna HTTP 200 con array vacío `[]`
