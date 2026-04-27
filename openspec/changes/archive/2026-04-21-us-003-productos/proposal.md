## Why

El catálogo de productos es el núcleo del e-commerce: sin él, el carrito, los pedidos y los pagos no tienen razón de existir. Este change implementa el CRUD completo de productos (US-015 a US-023), incluyendo asociación con categorías e ingredientes (personalizables), catálogo público con filtros, y las reglas de negocio de stock y soft delete que garantizan integridad histórica en pedidos futuros.

## What Changes

- **Nuevo módulo `productos`**: modelos `Producto`, `ProductoCategoria`, `ProductoIngrediente` (ya en `model.py`), más `schemas.py`, `repository.py`, `service.py` y `router.py` completamente implementados.
- **Nuevo módulo `ingredientes`**: CRUD completo de ingredientes con flag `es_alergeno`, soporte de soft delete y paginación (US-011 a US-014).
- **Endpoints públicos de catálogo**: listado paginado con filtros (`categoria_id`, `nombre`, `disponible`, `excluirAlergenos`) y detalle con categorías + ingredientes.
- **Endpoints protegidos de gestión**: crear, editar, eliminar (soft delete), cambiar disponibilidad y gestionar stock (ADMIN o STOCK).
- **Asociaciones M2M**: endpoints para sync de categorías e ingredientes de un producto.
- **Registro en UoW y router principal**: los repositorios `productos` e `ingredientes` se exponen en el Unit of Work; los routers se registran en `app/main.py`.

## Capabilities

### New Capabilities

- `productos-catalogo`: Catálogo público de productos — listado paginado/filtrado y detalle con ingredientes y categorías. Cubre US-018, US-019, US-023.
- `productos-gestion`: CRUD de productos para roles ADMIN/STOCK — alta, edición, soft delete, disponibilidad y stock. Cubre US-015, US-020, US-021, US-022.
- `productos-relaciones`: Gestión de asociaciones M2M producto↔categoría y producto↔ingrediente. Cubre US-016, US-017.
- `ingredientes-gestion`: CRUD de ingredientes con flag `es_alergeno` y soft delete. Cubre US-011, US-012, US-013, US-014.

### Modified Capabilities

*(ninguna — no hay specs existentes que cambien de requerimiento)*

## Impact

- **Backend**:
  - `backend/app/modules/productos/` — todos los archivos del módulo
  - `backend/app/modules/ingredientes/` — todos los archivos del módulo
  - `backend/app/core/uow.py` — agregar `uow.productos` y `uow.ingredientes`
  - `backend/app/main.py` — registrar routers de productos e ingredientes
  - `backend/alembic/versions/` — nueva migración para tablas (ya existentes en modelos)
- **Dependencias upstream**: `us-002-categorias` debe estar implementado (FK a `categoria`)
- **Dependencias downstream**: `us-004-carrito` y `us-005-pedidos` dependen de `Producto.id`, `precio_base` y `stock_cantidad`
