## Context

El módulo de productos es el tercero en el orden de implementación, después de auth y categorías. Los modelos `Producto`, `ProductoCategoria` y `ProductoIngrediente` ya existen en `backend/app/modules/productos/model.py`; también existe `Ingrediente` en `backend/app/modules/ingredientes/model.py`. Los archivos de schemas, repository, service y router están vacíos o son stubs.

El sistema ya tiene patrones establecidos: `BaseRepository[T]`, `UnitOfWork`, `require_roles`, `get_current_user` (en `app/core/deps.py`), paginación `PaginatedResponse`, y soft delete via `SoftDeleteModel` con campo `deleted_at`.

## Goals / Non-Goals

**Goals:**
- CRUD completo de productos con validación de precio > 0 y stock >= 0
- Gestión de ingredientes (con `es_alergeno`) como entidad independiente
- Asociaciones M2M producto↔categoría y producto↔ingrediente (sync completo via PUT)
- Catálogo público con filtros (categoria_id, nombre, disponible) y paginación
- Detalle público que retorna el producto con sus categorías e ingredientes
- Soft delete en productos e ingredientes (campo `deleted_at`)
- Restricción de acceso: solo ADMIN o STOCK pueden modificar; lectura es pública

**Non-Goals:**
- Upload de imágenes (se almacena URL solamente)
- Filtro por alérgenos en esta iteración (US-023, complejidad extra de query)
- Gestión de stock desde este módulo (se hace en us-005-pedidos via webhook MP)
- Frontend React de esta vista (cubre otro change)
- Caché de respuestas del catálogo

## Decisions

### D1: Sync completo de relaciones M2M via PUT (replace-all)

**Decisión**: `PUT /api/v1/productos/{id}/categorias` y `PUT /api/v1/productos/{id}/ingredientes` reciben el array completo de IDs y reemplazan todas las asociaciones existentes en una sola transacción.

**Alternativas consideradas**:
- `POST`/`DELETE` individuales por asociación (más granular, más requests del cliente)
- PATCH con `add`/`remove` en el body (más complejo de parsear)

**Rationale**: El replace-all es la operación más simple y menos propensa a inconsistencias. El cliente (admin UI) siempre trabaja con el conjunto completo seleccionado en un formulario.

---

### D2: Producto cargado con JOIN en memoria (no lazy loading)

**Decisión**: El endpoint `GET /api/v1/productos/{id}` ejecuta queries separadas para categorías e ingredientes dentro del mismo UoW y ensambla el `ProductoDetail` en el service, sin usar SQLModel relationships con lazy loading.

**Alternativas consideradas**:
- Usar `relationship()` de SQLAlchemy con `selectinload` (más elegante pero requiere async session config compleja)
- Múltiples queries N+1 en el router (viola separación de capas)

**Rationale**: El proyecto usa SQLModel con sesiones síncronas y el patrón `BaseRepository` no está configurado para relaciones eager. Queries explícitas en el service mantienen el código predecible y evitan el problema N+1 en listados.

---

### D3: Paginación y filtros en el listado público

**Decisión**: `GET /api/v1/productos` acepta query params `?page=1&size=20&categoria_id=X&nombre=foo&disponible=true`. El catálogo público filtra automáticamente `deleted_at IS NULL` y `disponible=true` salvo que el caller sea ADMIN/STOCK (futuro). Por ahora el endpoint público siempre filtra ambos.

**Rationale**: Consistente con `PaginatedResponse[T]` ya usado en categorías. Los filtros se traducen a cláusulas WHERE en el repository, evitando lógica de filtrado en el service.

---

### D4: Ingredientes como módulo independiente

**Decisión**: `Ingrediente` tiene su propio CRUD en `/api/v1/ingredientes` (no anidado bajo productos). El módulo vive en `app/modules/ingredientes/`.

**Rationale**: Un ingrediente puede asociarse a múltiples productos. Gestionar ingredientes independientemente permite reutilizarlos sin duplicar datos. Esto sigue el mismo patrón que `Categoria`.

---

### D5: `precio_base` validado como Decimal en Pydantic, no float

**Decisión**: En `ProductoCreate` y `ProductoUpdate`, `precio_base` se declara como `Decimal` (Python `decimal.Decimal`) con validator `gt=Decimal("0")`. El modelo SQLModel usa `Column(Numeric(10,2))`.

**Rationale**: `float` tiene imprecisión binaria que genera errores en precios. `Decimal` en Pydantic y `NUMERIC(10,2)` en PostgreSQL garantizan exactitud. La regla RN-CA04 lo requiere explícitamente.

---

### D6: `PATCH /api/v1/productos/{id}/disponibilidad` separado de PUT

**Decisión**: Cambiar `disponible` tiene su propio endpoint PATCH con body `{ "disponible": bool }`. El `PUT /api/v1/productos/{id}` actualiza nombre, descripción, precio, imagen pero no disponibilidad ni stock directamente.

**Rationale**: Roles: STOCK puede cambiar disponibilidad y stock pero no precio ni nombre (según RN-RB06 y la descripción del rol). Tener endpoints separados permite control de acceso granular sin complejidad en el service. El `PUT` completo solo para ADMIN.

## Risks / Trade-offs

- **[Race condition en stock]** → Si dos transacciones decrementan stock simultáneamente, puede quedar negativo. Mitigación: las operaciones de stock en us-005-pedidos usarán `SELECT ... FOR UPDATE`. En este módulo el stock solo se modifica por ADMIN/STOCK con operación atómica (`UPDATE SET stock = stock + delta WHERE id = :id`).
- **[Precio float en modelo existente]** → `Producto.precio_base` está declarado como `float` en el modelo Python actual. Mitigación: mantener `Column(Numeric(10,2))` a nivel SQL (ya presente) y validar con `Decimal` en Pydantic. Al leer de BD, SQLAlchemy retorna `Decimal`; en respuestas JSON se serializa como string o float según config del schema.
- **[N+1 en listado con ingredientes]** → El listado paginado no incluye ingredientes por diseño (solo el detalle los carga). Si en el futuro se necesitan, será necesario un JOIN o subquery.

## Migration Plan

1. Las tablas ya existen en los modelos (`producto`, `producto_categoria`, `producto_ingrediente`, `ingrediente`). Verificar que la migración de us-000-setup las haya creado; si no, generar `alembic revision --autogenerate`.
2. Registrar `ProductoRepository` y `IngredienteRepository` en `UnitOfWork` como `uow.productos` y `uow.ingredientes`.
3. Registrar routers en `app/main.py` con prefijos `/api/v1/productos` e `/api/v1/ingredientes`.
4. Rollback: los endpoints son nuevos, no modifican comportamiento existente. Revertir = eliminar los registros de router en main.py.

## Open Questions

- ¿La carga de imagen es solo URL o se necesita upload multipart en este sprint? (Asumir URL por ahora, upload queda para us-007-admin)
- ¿El endpoint de stock (`PATCH .../stock`) recibe cantidad absoluta o delta? (Asumir delta con signo, p.ej. `+10` o `-3`, y validar que el resultado >= 0)
