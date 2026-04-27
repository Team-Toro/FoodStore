## 1. Modelo y Migración

- [x] 1.1 Implementar `Categoria` en `backend/app/modules/categorias/model.py` con campos: `id BIGSERIAL PK`, `nombre VARCHAR(100) NN`, `parent_id BIGINT FK self-ref NULL ON DELETE SET NULL`, `deleted_at TIMESTAMPTZ NULL`, `created_at TIMESTAMPTZ NN default now()`
- [x] 1.2 Crear migración Alembic: `alembic revision --autogenerate -m "create_categorias_table"` y verificar el SQL generado
- [x] 1.3 Aplicar migración: `alembic upgrade head` y confirmar que la tabla existe en PostgreSQL
- [x] 1.4 Agregar índice en `parent_id` en la migración si no fue generado automáticamente

## 2. Schemas Pydantic

- [x] 2.1 Implementar `CategoriaCreate` en `schemas.py`: campos `nombre: str` y `parent_id: int | None = None`
- [x] 2.2 Implementar `CategoriaUpdate` en `schemas.py`: campos `nombre: str | None = None` y `parent_id: int | None = None` (todos opcionales)
- [x] 2.3 Implementar `CategoriaRead` en `schemas.py`: incluye `id`, `nombre`, `parent_id`, `created_at`
- [x] 2.4 Implementar `CategoriaTree` en `schemas.py`: igual a `CategoriaRead` pero con campo `hijos: list['CategoriaTree'] = []` (recursivo)

## 3. Repositorio

- [x] 3.1 Implementar `get_by_id(session, id)` en `repository.py` — retorna `Categoria | None` filtrando `deleted_at IS NULL`
- [x] 3.2 Implementar `get_all_flat(session)` en `repository.py` — CTE recursivo via `text()` de SQLAlchemy que retorna todas las categorías activas ordenadas por `depth`
- [x] 3.3 Implementar `get_direct_children(session, parent_id)` en `repository.py` — hijos directos activos de un `parent_id` dado
- [x] 3.4 Implementar `get_by_nombre_and_parent(session, nombre, parent_id)` en `repository.py` — para validar unicidad por nivel
- [x] 3.5 Implementar `create(session, data: CategoriaCreate)` en `repository.py` — inserta y retorna la entidad
- [x] 3.6 Implementar `update(session, categoria, data: CategoriaUpdate)` en `repository.py` — aplica cambios y retorna la entidad actualizada
- [x] 3.7 Implementar `soft_delete(session, categoria)` en `repository.py` — setea `deleted_at = datetime.utcnow()`
- [x] 3.8 Implementar `has_active_children(session, id)` en `repository.py` — retorna bool
- [x] 3.9 Implementar `get_ancestors(session, id)` en `repository.py` — retorna lista de IDs ancestros (para validación anti-ciclo)

## 4. Servicio

- [x] 4.1 Implementar `get_tree(uow)` en `service.py` — llama `repo.get_all_flat`, construye árbol anidado en Python y retorna lista de `CategoriaTree`
- [x] 4.2 Implementar `get_by_id(uow, id)` en `service.py` — lanza HTTP 404 `CATEGORIA_NOT_FOUND` si no existe, retorna categoría con hijos directos
- [x] 4.3 Implementar `create(uow, data: CategoriaCreate)` en `service.py` con validaciones:
  - Verificar `parent_id` existe si fue provisto (HTTP 404 `CATEGORIA_PADRE_NOT_FOUND`)
  - Verificar unicidad de nombre en el nivel destino (HTTP 409 `CATEGORIA_NOMBRE_DUPLICADO`)
  - Crear y retornar categoría
- [x] 4.4 Implementar `update(uow, id, data: CategoriaUpdate)` en `service.py` con validaciones:
  - Verificar que la categoría existe (HTTP 404 `CATEGORIA_NOT_FOUND`)
  - Si se cambia `parent_id`: verificar que el nuevo padre existe, verificar que no es auto-referencia, verificar que no genera ciclo (HTTP 422 `CATEGORIA_CICLO_DETECTADO`)
  - Si se cambia `nombre`: verificar unicidad en el nivel destino (HTTP 409 `CATEGORIA_NOMBRE_DUPLICADO`)
  - Actualizar y retornar categoría
- [x] 4.5 Implementar `delete(uow, id)` en `service.py` con validaciones:
  - Verificar que la categoría existe (HTTP 404 `CATEGORIA_NOT_FOUND`)
  - Verificar que no tiene hijos activos (HTTP 422 `CATEGORIA_TIENE_HIJOS`)
  - Verificar que no tiene productos activos via `ProductoCategoria` (HTTP 422 `CATEGORIA_TIENE_PRODUCTOS`) — omitir si la tabla no existe aún
  - Ejecutar soft delete

## 5. Router

- [x] 5.1 Implementar `GET /api/v1/categorias` en `router.py` — público, sin auth, llama `service.get_tree`, retorna lista de `CategoriaTree`
- [x] 5.2 Implementar `GET /api/v1/categorias/{id}` en `router.py` — público, sin auth, llama `service.get_by_id`
- [x] 5.3 Implementar `POST /api/v1/categorias` en `router.py` — requiere ADMIN via `require_roles`, retorna HTTP 201 y `CategoriaRead`
- [x] 5.4 Implementar `PUT /api/v1/categorias/{id}` en `router.py` — requiere ADMIN, retorna HTTP 200 y `CategoriaRead`
- [x] 5.5 Implementar `DELETE /api/v1/categorias/{id}` en `router.py` — requiere ADMIN, retorna HTTP 204 sin body

## 6. Registro y Configuración

- [x] 6.1 Importar y registrar el router de categorías en `backend/app/main.py` con prefijo `/api/v1`
- [x] 6.2 Agregar importación del modelo `Categoria` en `backend/app/db/base.py` (o donde se referencian los modelos para Alembic) para que la migración lo detecte

## 7. Tests

- [x] 7.1 Crear `backend/tests/test_categorias.py` con test: crear categoría raíz exitosa
- [x] 7.2 Test: crear subcategoría con `parent_id` válido
- [x] 7.3 Test: rechazar nombre duplicado en el mismo nivel (HTTP 409)
- [x] 7.4 Test: `GET /api/v1/categorias` retorna árbol anidado correctamente
- [x] 7.5 Test: soft delete exitoso y verificar que no aparece en árbol
- [x] 7.6 Test: rechazar delete si tiene subcategorías activas (HTTP 422)
- [x] 7.7 Test: rechazar ciclo al actualizar `parent_id`

## 8. Verificación Final

- [x] 8.1 Smoke test manual: `GET /api/v1/categorias` → 200, `POST` con token ADMIN → 201, `DELETE` sin token → 401
- [x] 8.2 Verificar documentación automática en `http://localhost:8000/docs` — los 5 endpoints de categorías aparecen con schemas correctos
- [x] 8.3 Ejecutar `pytest tests/test_categorias.py -v` — todos los tests pasan
