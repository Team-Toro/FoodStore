## Context

Proyecto greenfield: `backend/` y `frontend/` están vacíos. Este sprint 0 establece la arquitectura base sobre la que todos los módulos funcionales se construirán. Las decisiones tomadas aquí son difíciles de revertir una vez que el resto de los sprints los adopten.

## Goals / Non-Goals

**Goals:**
- Estructura de carpetas reproducible y consistente con la especificación (feature-first backend, FSD frontend)
- `core/` con los componentes transversales: config, DB session, UoW, BaseRepository, JWT/bcrypt
- Migración Alembic inicial con el ERD v5 completo (todas las tablas, constraints, índices)
- Script de seed idempotente para datos catálogo
- FastAPI corriendo en `:8000` con Swagger accesible
- Frontend con Vite corriendo en `:5173`

**Non-Goals:**
- Implementar ningún endpoint funcional (auth, productos, pedidos — eso es de los sprints 1+)
- UI de ningún tipo
- Tests (los módulos los escriben cuando implementan)
- Deploy / CI

## Decisions

### D-01: Unit of Work como context manager async

**Decisión**: `UnitOfWork` implementado como `asynccontextmanager`. El `Service` lo recibe como parámetro, nunca lo instancia.

```python
# Router abre el contexto y lo pasa al Service
async with UnitOfWork() as uow:
    resultado = await service.crear_pedido(uow, body, current_user)
```

**Por qué**: Garantiza que commit/rollback es responsabilidad exclusiva del UoW. Si el Service hiciera `session.commit()` directamente, un error en una operación posterior dejaría la BD en estado inconsistente. El context manager fuerza atomicidad por diseño.

**Alternativa descartada**: Inyectar la sesión directamente con la dependencia `get_session` de FastAPI — pierde el beneficio de gestión centralizada de transacciones y obliga a cada router a pensar en commits.

---

### D-02: BaseRepository[T] genérico con typing estricto

**Decisión**: `BaseRepository[T]` con Generic[T] de Python. Operaciones: `get_by_id`, `list_all`, `count`, `create`, `update`, `soft_delete`, `hard_delete`. Los repositorios especializados heredan y agregan queries de dominio.

**Por qué**: Elimina ~80% del boilerplate CRUD en cada módulo. Los repos especializados solo implementan lo que es propio de su dominio.

**Nota**: `soft_delete` solo disponible para modelos que tienen campo `eliminado_en`. `hard_delete` solo para entidades sin soft delete (ej: `RefreshToken`).

---

### D-03: Configuración vía Pydantic Settings

**Decisión**: `core/config.py` usa `pydantic-settings` con `BaseSettings`. Las variables se leen del `.env` automáticamente. Un único objeto `settings` importado donde se necesite.

**Por qué**: Type-safe, con validación en startup. Si falta `DATABASE_URL`, el servidor no arranca — falla rápido y con mensaje claro.

---

### D-04: Modelos SQLModel con herencia de base

**Decisión**: Todos los modelos heredan de una clase base `TimestampModel` que inyecta `creado_en` y `actualizado_en`. Los modelos con soft delete heredan de `SoftDeleteModel(TimestampModel)` que agrega `eliminado_en`.

**Por qué**: Consistencia — ningún módulo puede "olvidar" los campos de auditoría. Un `event.listens_for` de SQLAlchemy actualiza `actualizado_en` automáticamente en cada UPDATE.

---

### D-05: Alembic con autogenerate + migración inicial manual revisada

**Decisión**: Configurar Alembic con `autogenerate = True` apuntando a los modelos SQLModel. La primera migración se genera con `alembic revision --autogenerate` y se revisa manualmente antes de commitear.

**Por qué**: El autogenerate de Alembic no detecta tipos PostgreSQL nativos (`INTEGER[]`, `NUMERIC(10,2)`) correctamente en todos los casos — la revisión manual garantiza que la migración inicial sea exacta.

**Tipos a verificar manualmente**:
- `DetallePedido.personalizacion`: debe ser `ARRAY(Integer)` con `as_uuid=False`
- `Producto.precio_base`: debe ser `Numeric(10, 2)` no `Float`
- `RefreshToken.token_hash`: debe ser `CHAR(64)` no `VARCHAR`

---

### D-06: Frontend — Axios instance centralizada

**Decisión**: Una única instancia de Axios en `shared/api/client.ts` con interceptors configurados desde el inicio. El interceptor de request adjunta `Authorization: Bearer` leyendo `useAuthStore.getState().accessToken`. El interceptor de response maneja 401 con renovación automática.

**Por qué**: Si cada feature crea su propio cliente Axios, la renovación del token debe implementarse N veces. Centralizar garantiza que el comportamiento sea consistente desde el primer módulo.

---

### D-07: Zustand stores creados en el scaffold, vacíos

**Decisión**: Los 4 stores (`authStore`, `cartStore`, `paymentStore`, `uiStore`) se crean con su estructura y tipos en el scaffold, aunque sin lógica de negocio aún.

**Por qué**: Permite que el interceptor de Axios importe `authStore` desde el inicio. Si el store no existe cuando se configura el cliente HTTP, hay un error de import circular difícil de debuggear.

## Risks / Trade-offs

- **[Riesgo] Migración inicial incompleta** → Mitigation: revisar el SQL generado contra el ERD v5 manualmente antes de `alembic upgrade head`. Correr en una DB limpia y verificar con `\d+ tabla` en psql.

- **[Riesgo] Seed no idempotente** → Mitigation: usar `INSERT INTO ... ON CONFLICT (id) DO NOTHING` para todos los datos catálogo. El ID del admin usa `ON CONFLICT (email) DO NOTHING`.

- **[Riesgo] Circular imports en Python** → Mitigation: los modelos en `model.py` no importan de `schemas.py` ni de `service.py`. La regla Router→Service→UoW→Repository→Model es el único flujo válido.

- **[Trade-off] Async UoW vs sync** → Se eligió async porque FastAPI es ASGI y SQLModel/SQLAlchemy 2.0 soportan async sessions nativamente. Mezclar sync en un contexto async genera bloqueos en el event loop.
