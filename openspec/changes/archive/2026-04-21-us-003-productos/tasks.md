## 1. Ingredientes — Schemas y Repository

- [x] 1.1 Definir schemas Pydantic en `backend/app/modules/ingredientes/schemas.py`: `IngredienteCreate`, `IngredienteUpdate`, `IngredienteRead` con campos `id`, `nombre`, `descripcion`, `es_alergeno`
- [x] 1.2 Implementar `IngredienteRepository` en `backend/app/modules/ingredientes/repository.py` extendiendo `BaseRepository[Ingrediente]` con métodos: `get_by_nombre`, `list_paginated(es_alergeno=None, page, size)`
- [x] 1.3 Implementar `IngredienteService` en `backend/app/modules/ingredientes/service.py` con: `crear`, `listar`, `obtener_por_id`, `actualizar`, `eliminar` (soft delete). Validar unicidad de nombre en crear/actualizar (HTTP 409 INGREDIENTE_DUPLICADO)
- [x] 1.4 Implementar `IngredienteRouter` en `backend/app/modules/ingredientes/router.py` con endpoints: `GET /ingredientes`, `GET /ingredientes/{id}`, `POST /ingredientes`, `PUT /ingredientes/{id}`, `DELETE /ingredientes/{id}` con control de acceso por rol

## 2. Productos — Schemas

- [x] 2.1 Definir `ProductoCreate` en `backend/app/modules/productos/schemas.py`: `nombre` (str, requerido), `descripcion` (str|None), `imagen_url` (str|None), `precio_base` (Decimal, gt=0), `stock_cantidad` (int, ge=0), `disponible` (bool, default True)
- [x] 2.2 Definir `ProductoUpdate` (todos los campos opcionales, mismas validaciones)
- [x] 2.3 Definir `ProductoRead` (campos base sin relaciones) y `ProductoDetail` (con `categorias: list[CategoriaRead]` y `ingredientes: list[IngredienteConRemovible]`)
- [x] 2.4 Definir `IngredienteConRemovible` (extiende `IngredienteRead` con campo `es_removible: bool`)
- [x] 2.5 Definir schemas para relaciones: `ProductoCategoriasUpdate` (`{ categoria_ids: list[int] }`), `ProductoIngredientesUpdate` (`{ ingredientes: list[{ ingrediente_id: int, es_removible: bool }] }`)
- [x] 2.6 Definir schemas de stock y disponibilidad: `StockUpdate` (`{ delta: int }`), `DisponibilidadUpdate` (`{ disponible: bool }`)

## 3. Productos — Repository

- [x] 3.1 Implementar `ProductoRepository` en `backend/app/modules/productos/repository.py` extendiendo `BaseRepository[Producto]` con métodos: `list_paginated(categoria_id, nombre, disponible, page, size)` usando ILIKE para búsqueda por nombre
- [x] 3.2 Agregar método `get_categorias(producto_id)` que retorna lista de `Categoria` via JOIN con `ProductoCategoria`
- [x] 3.3 Agregar método `get_ingredientes(producto_id)` que retorna lista de `(Ingrediente, ProductoIngrediente)` via JOIN
- [x] 3.4 Agregar método `sync_categorias(producto_id, categoria_ids)` que hace DELETE + INSERT en `ProductoCategoria` dentro de la misma sesión
- [x] 3.5 Agregar método `sync_ingredientes(producto_id, ingredientes_data)` que hace DELETE + INSERT en `ProductoIngrediente`
- [x] 3.6 Agregar método `update_stock_atomico(producto_id, delta)` usando query atómica `UPDATE ... SET stock_cantidad = stock_cantidad + :delta WHERE id = :id AND stock_cantidad + :delta >= 0`, retornar False si no actualizó ninguna fila

## 4. Productos — Service

- [x] 4.1 Implementar `crear_producto(uow, data: ProductoCreate)` — persiste el producto, retorna `ProductoRead`
- [x] 4.2 Implementar `listar_productos(uow, page, size, categoria_id, nombre, disponible)` — retorna `PaginatedResponse[ProductoRead]`
- [x] 4.3 Implementar `obtener_producto(uow, id)` — carga producto + categorías + ingredientes, retorna `ProductoDetail`; lanza HTTP 404 si no existe/eliminado/no disponible
- [x] 4.4 Implementar `actualizar_producto(uow, id, data: ProductoUpdate)` — actualiza solo campos presentes en el body; lanza HTTP 404 si no existe
- [x] 4.5 Implementar `cambiar_disponibilidad(uow, id, disponible: bool)` — solo actualiza campo `disponible`
- [x] 4.6 Implementar `actualizar_stock(uow, id, delta: int)` — llama al método atómico del repo; lanza HTTP 422 STOCK_INSUFICIENTE si delta negativo excede stock
- [x] 4.7 Implementar `eliminar_producto(uow, id)` — soft delete con `deleted_at = NOW()`
- [x] 4.8 Implementar `sync_categorias_producto(uow, id, categoria_ids)` — valida que cada categoria_id exista, luego sincroniza; lanza HTTP 422 CATEGORIA_NOT_FOUND si alguno no existe
- [x] 4.9 Implementar `sync_ingredientes_producto(uow, id, ingredientes_data)` — valida que cada ingrediente_id exista y no esté eliminado; lanza HTTP 422 INGREDIENTE_NOT_FOUND si alguno falla

## 5. Productos — Router

- [x] 5.1 Implementar `GET /api/v1/productos` en `backend/app/modules/productos/router.py` — endpoint público, query params `page`, `size`, `categoria_id`, `nombre`, `disponible`
- [x] 5.2 Implementar `GET /api/v1/productos/{id}` — endpoint público, retorna `ProductoDetail`
- [x] 5.3 Implementar `POST /api/v1/productos` — requiere ADMIN o STOCK, retorna HTTP 201
- [x] 5.4 Implementar `PUT /api/v1/productos/{id}` — requiere ADMIN o STOCK
- [x] 5.5 Implementar `PATCH /api/v1/productos/{id}/disponibilidad` — requiere ADMIN o STOCK
- [x] 5.6 Implementar `PATCH /api/v1/productos/{id}/stock` — requiere ADMIN o STOCK
- [x] 5.7 Implementar `DELETE /api/v1/productos/{id}` — requiere ADMIN únicamente (no STOCK)
- [x] 5.8 Implementar `PUT /api/v1/productos/{id}/categorias` — requiere ADMIN o STOCK
- [x] 5.9 Implementar `PUT /api/v1/productos/{id}/ingredientes` — requiere ADMIN o STOCK
- [x] 5.10 Implementar `GET /api/v1/productos/{id}/ingredientes` — endpoint público

## 6. Integración y Registro

- [x] 6.1 Agregar `self.productos = ProductoRepository(self.session)` y `self.ingredientes = IngredienteRepository(self.session)` en `backend/app/core/uow.py`
- [x] 6.2 Registrar `productos_router` e `ingredientes_router` en `backend/app/main.py` con prefijos `/api/v1/productos` e `/api/v1/ingredientes`
- [x] 6.3 Verificar que la migración Alembic cubra las tablas `producto`, `producto_categoria`, `producto_ingrediente`, `ingrediente` — ejecutar `alembic upgrade head` y confirmar que no hay errores
- [x] 6.4 Agregar datos de seed de ingredientes y productos de prueba en `backend/app/db/seed.py` (al menos 3 ingredientes con `es_alergeno` variado y 2 productos con categorías e ingredientes asociados)

## 7. Tests

- [x] 7.1 Escribir tests en `backend/tests/test_ingredientes.py`: crear, listar, filtrar por `es_alergeno`, obtener por ID, actualizar, soft delete, nombre duplicado retorna 409
- [x] 7.2 Escribir tests en `backend/tests/test_productos.py`: crear con precio válido, precio cero retorna 422, stock negativo retorna 422, listar con paginación, filtro por categoría, filtro por nombre, obtener detalle con ingredientes y categorías, detalle de producto eliminado retorna 404
- [x] 7.3 Escribir test de sync de categorías: asignar, reemplazar, vaciar, categoría inexistente retorna 422
- [x] 7.4 Escribir test de sync de ingredientes: asignar con `es_removible`, reemplazar, ingrediente eliminado retorna 422
- [x] 7.5 Escribir test de stock: delta positivo, delta negativo que resultaría en negativo retorna 422, delta negativo válido
- [x] 7.6 Escribir test de autorización: CLIENT no puede crear/editar/eliminar, STOCK no puede hacer DELETE de producto, sin token retorna 401
