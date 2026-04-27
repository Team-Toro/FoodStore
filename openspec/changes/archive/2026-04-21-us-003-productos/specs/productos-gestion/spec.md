## ADDED Requirements

### Requirement: Crear producto
El sistema SHALL exponer `POST /api/v1/productos` que crea un nuevo producto. Solo roles ADMIN o STOCK pueden acceder. El body SHALL incluir `nombre` (requerido), `descripcion` (opcional), `imagen_url` (opcional), `precio_base` (requerido, Decimal, > 0), `stock_cantidad` (requerido, int, >= 0), `disponible` (opcional, default true). El sistema SHALL retornar HTTP 201 con el producto creado.

#### Scenario: Creación exitosa
- **WHEN** un usuario con rol STOCK hace `POST /api/v1/productos` con `{ nombre: "Milanesa", precio_base: 1500.00, stock_cantidad: 20 }`
- **THEN** retorna HTTP 201 con el producto persistido incluyendo su `id` generado y `disponible=true`

#### Scenario: Precio inválido (cero)
- **WHEN** se envía `precio_base: 0`
- **THEN** retorna HTTP 422 con error de validación indicando que el precio debe ser mayor que cero

#### Scenario: Precio inválido (negativo)
- **WHEN** se envía `precio_base: -100`
- **THEN** retorna HTTP 422 con error de validación

#### Scenario: Stock negativo
- **WHEN** se envía `stock_cantidad: -1`
- **THEN** retorna HTTP 422 con error de validación indicando stock debe ser >= 0

#### Scenario: Sin autorización
- **WHEN** un cliente (rol CLIENT) intenta crear un producto
- **THEN** retorna HTTP 403 Forbidden

#### Scenario: Sin autenticación
- **WHEN** se hace el request sin token JWT
- **THEN** retorna HTTP 401 Unauthorized

---

### Requirement: Actualizar producto
El sistema SHALL exponer `PUT /api/v1/productos/{id}` que actualiza los campos del producto. Solo roles ADMIN o STOCK pueden acceder. Todos los campos son opcionales (PATCH semántico). Las mismas validaciones de precio y stock aplican.

#### Scenario: Actualización exitosa
- **WHEN** un usuario ADMIN hace `PUT /api/v1/productos/1` con `{ "precio_base": 1800.00 }`
- **THEN** retorna HTTP 200 con el producto actualizado

#### Scenario: Producto no encontrado
- **WHEN** se hace `PUT /api/v1/productos/9999`
- **THEN** retorna HTTP 404 con `{ "code": "PRODUCTO_NOT_FOUND" }`

#### Scenario: Precio inválido en actualización
- **WHEN** se envía `precio_base: 0` en la actualización
- **THEN** retorna HTTP 422

---

### Requirement: Cambiar disponibilidad de producto
El sistema SHALL exponer `PATCH /api/v1/productos/{id}/disponibilidad` con body `{ "disponible": bool }`. Roles ADMIN o STOCK pueden acceder.

#### Scenario: Deshabilitar producto
- **WHEN** un usuario STOCK hace `PATCH /api/v1/productos/1/disponibilidad` con `{ "disponible": false }`
- **THEN** retorna HTTP 200 con `disponible=false` y el producto deja de aparecer en el catálogo público

#### Scenario: Habilitar producto
- **WHEN** un usuario STOCK hace `PATCH /api/v1/productos/1/disponibilidad` con `{ "disponible": true }`
- **THEN** retorna HTTP 200 con `disponible=true` y el producto vuelve a aparecer en el catálogo

---

### Requirement: Actualizar stock de producto
El sistema SHALL exponer `PATCH /api/v1/productos/{id}/stock` con body `{ "delta": int }`. El `delta` puede ser positivo (entrada) o negativo (salida). Si el resultado sería negativo, SHALL retornar error. Roles ADMIN o STOCK pueden acceder.

#### Scenario: Incremento de stock
- **WHEN** un usuario STOCK hace `PATCH /api/v1/productos/1/stock` con `{ "delta": 50 }`
- **THEN** retorna HTTP 200 con el nuevo `stock_cantidad = stock_anterior + 50`

#### Scenario: Decremento que resultaría en negativo
- **WHEN** el stock actual es 5 y se envía `{ "delta": -10 }`
- **THEN** retorna HTTP 422 con `{ "code": "STOCK_INSUFICIENTE", "detail": "El stock no puede quedar negativo" }`

#### Scenario: Operación atómica
- **WHEN** se actualiza el stock
- **THEN** la operación usa `UPDATE producto SET stock_cantidad = stock_cantidad + :delta WHERE id = :id AND stock_cantidad + :delta >= 0` garantizando atomicidad

---

### Requirement: Eliminar producto (soft delete)
El sistema SHALL exponer `DELETE /api/v1/productos/{id}` que marca el producto con `deleted_at = NOW()`. Solo rol ADMIN puede eliminar. El producto eliminado no aparece en el catálogo público ni en respuestas de detalle.

#### Scenario: Soft delete exitoso
- **WHEN** un usuario ADMIN hace `DELETE /api/v1/productos/1`
- **THEN** retorna HTTP 204 No Content y el producto tiene `deleted_at` poblado

#### Scenario: Producto ya eliminado
- **WHEN** se intenta eliminar un producto que ya fue eliminado lógicamente
- **THEN** retorna HTTP 404

#### Scenario: Solo ADMIN puede eliminar
- **WHEN** un usuario con rol STOCK intenta `DELETE /api/v1/productos/1`
- **THEN** retorna HTTP 403 Forbidden
