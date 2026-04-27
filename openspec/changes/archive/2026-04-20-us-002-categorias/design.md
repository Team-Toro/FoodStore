## Context

El módulo `categorias` ya tiene los 5 archivos scaffoldeados (`model.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`) pero están vacíos. La tabla `Categoria` no existe en la DB — se necesita una migración Alembic. El módulo de auth (us-001) ya provee `get_current_user` y `require_roles` en `app/core/deps.py`, listos para usar. Las categorías son un prerequisito duro para us-003-productos (FK en ProductoCategoria).

## Goals / Non-Goals

**Goals:**
- Implementar CRUD completo de categorías con jerarquía arbitraria padre/hijo
- Árbol completo con CTE recursivo (un solo query, sin N+1)
- Soft delete con validaciones de integridad (bloquear si tiene productos o subcategorías activos)
- Protección por roles: lectura pública, escritura solo ADMIN
- Regla anti-ciclo al actualizar `parent_id`

**Non-Goals:**
- UI de administración (se implementa en us-007-admin)
- Asociación producto-categoría (se implementa en us-003-productos via ProductoCategoria)
- Filtrado de productos por categoría (se implementa en us-003-productos)
- Paginación del árbol (el árbol completo se retorna en una sola respuesta — volúmenes esperados pequeños)

## Decisions

### D-01: CTE recursivo en el repositorio, no en el servicio

**Decisión**: El query de árbol completo (WITH RECURSIVE) se implementa directamente en `repository.py` usando `text()` de SQLAlchemy, no en `service.py`.

**Alternativas consideradas**:
- Construir el árbol en Python post-query (múltiples SELECTs + armado en memoria) → descartado: N+1 queries, ineficiente.
- ORM lazy-loading de relaciones hijas → descartado: genera N+1 implícito.
- CTE en el servicio → descartado: viola la separación de capas (lógica de acceso a datos en servicio).

**Rationale**: PostgreSQL maneja la recursión nativamente con un solo round-trip. El repositorio es el lugar correcto para encapsular queries complejos. El servicio solo recibe los resultados planos y los anida en Python.

---

### D-02: Anidamiento del árbol en Python, no en SQL

**Decisión**: El CTE retorna filas planas (con `depth` y `parent_id`). El servicio `service.py` las convierte a estructura anidada (árbol de objetos).

**Rationale**: SQL puede retornar el árbol anidado como JSON con `json_build_object`, pero eso acopla el formato de respuesta a la DB. El anidamiento en Python es más testeable y permite cambiar el schema de respuesta sin tocar el query.

---

### D-03: Validación anti-ciclo solo en la capa de servicio

**Decisión**: Antes de actualizar `parent_id`, el servicio recorre los ancestros del nuevo padre propuesto y verifica que ninguno sea la categoría que se está modificando.

**Rationale**: Esta validación requiere lógica recursiva que no tiene cabida en el router (que solo parsea HTTP) ni en el modelo (que no tiene acceso a sesión). El servicio puede hacer un query auxiliar de ancestros.

---

### D-04: `nombre` único dentro del mismo nivel (mismo `parent_id`)

**Decisión**: La constraint de unicidad es parcial: `UNIQUE(nombre, parent_id)` — pero dado que `parent_id` puede ser NULL (raíz), se implementa la validación en el servicio con un query previo al INSERT/UPDATE.

**Alternativas consideradas**:
- Constraint única DB con `UNIQUE(nombre, parent_id)` → no funciona bien con NULL en PostgreSQL (NULL != NULL en UNIQUE).
- Partial index por nivel → posible pero más complejo para el caso general.

**Rationale**: Validación explícita en servicio con query `SELECT WHERE nombre = X AND parent_id IS (NULL | Y) AND deleted_at IS NULL`. Lanza `HTTP 409 CONFLICT` con `code: "CATEGORIA_NOMBRE_DUPLICADO"`.

---

### D-05: Soft delete con bloqueo de integridad

**Decisión**: `DELETE /api/v1/categorias/{id}` es un soft delete (setea `deleted_at = now()`). Antes de hacerlo, el servicio verifica:
1. Que no tenga subcategorías con `deleted_at IS NULL`
2. Que no tenga productos activos via `ProductoCategoria` (query con JOIN, solo si la tabla existe)

**Rationale**: Alineado con el patrón de soft delete del proyecto (RN-CA03 y US-010). Los datos históricos se preservan. La validación de productos se hace best-effort (si ProductoCategoria no existe aún en DB, se omite).

## Risks / Trade-offs

- **[Riesgo] El CTE recursivo puede ser lento con árboles muy profundos** → Mitigación: índice en `parent_id`; en v1 el volumen de categorías es pequeño (< 100).
- **[Riesgo] La validación de productos activos en DELETE requiere que la tabla `ProductoCategoria` exista** → Mitigación: el servicio atrapa `ProgrammingError` / usa `information_schema` para verificar; en el orden de implementación, us-003 viene después, así que se implementa como consulta condicional.
- **[Trade-off] Anidamiento en Python vs. en SQL** → Ligeramente más código Python, pero respuesta más flexible y testeable sin DB.
- **[Trade-off] Sin paginación del árbol** → Aceptable para v1 con catálogos pequeños. Si el árbol crece, se puede agregar lazy loading por nodo (un endpoint `GET /categorias/{id}/hijos`).

## Migration Plan

1. Crear migración Alembic: `alembic revision --autogenerate -m "create_categorias_table"`
2. Verificar SQL generado (tabla `categoria`, FK self-ref con `ON DELETE SET NULL`, índice en `parent_id`, `deleted_at TIMESTAMPTZ NULL`)
3. Aplicar: `alembic upgrade head`
4. Registrar router en `app/main.py`: `app.include_router(categorias_router, prefix="/api/v1")`
5. Smoke test: `GET /api/v1/categorias` → `[]` (sin datos). `POST /api/v1/categorias` con token ADMIN → 201.
6. Rollback: `alembic downgrade -1` (drop table `categoria`)
