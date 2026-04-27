## Why

El catálogo de productos de Food Store requiere un sistema de categorías jerárquicas para que los clientes puedan navegar e filtrar productos de forma intuitiva. Sin categorías funcionales, los módulos us-003-productos y us-007-admin no pueden completarse, ya que Producto depende de la tabla Categoria a través de la relación M:N (ProductoCategoria). Este cambio desbloquea el flujo completo de catálogo.

## What Changes

- **Nuevo módulo `categorias`**: CRUD completo con soporte de jerarquía arbitraria vía `parent_id` (self-referential FK)
- **Endpoint público de árbol completo**: `GET /api/v1/categorias` devuelve árbol anidado usando CTE recursivo en PostgreSQL
- **Endpoint público de detalle**: `GET /api/v1/categorias/{id}` con hijos directos
- **Endpoints protegidos (ADMIN)**: `POST`, `PUT`, `DELETE /api/v1/categorias/{id}`
- **Soft delete con validaciones**: No se puede eliminar una categoría con productos activos o subcategorías activas
- **Regla anti-ciclo**: No se puede asignar una categoría como padre de sí misma (RN-CA02)
- **Nombres únicos por nivel**: Duplicados rechazados dentro del mismo nivel jerárquico (US-007)

## Capabilities

### New Capabilities

- `categorias`: CRUD jerárquico de categorías de productos con árbol recursivo, soft delete, validaciones de integridad y protección de roles.

### Modified Capabilities

_(ninguna — este change no altera specs existentes de auth, authz, refresh-tokens ni usuarios)_

## Impact

- **Backend**: Nuevo módulo `app/modules/categorias/` (5 archivos ya scaffoldeados: model.py, schemas.py, repository.py, service.py, router.py). Nueva migración Alembic para tabla `Categoria`.
- **API**: 5 endpoints nuevos bajo `/api/v1/categorias`
- **Autenticación**: Usa deps existentes `get_current_user` y `require_roles` de `app/core/deps.py`
- **Base de datos**: Tabla `Categoria` con `id BIGSERIAL PK`, `nombre VARCHAR(100) NN`, `parent_id BIGINT FK self-ref NULL ON DELETE SET NULL`, `deleted_at TIMESTAMPTZ NULL`, `created_at TIMESTAMPTZ NN`
- **Dependencias futuras**: us-003-productos y us-007-admin requieren que este change esté completo (FK en ProductoCategoria)
- **Sin cambios en frontend** en este change — la UI de categorías se implementa en us-007-admin
