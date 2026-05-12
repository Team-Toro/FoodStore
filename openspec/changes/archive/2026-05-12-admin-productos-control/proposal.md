## Why

Hoy el panel de administración no refleja correctamente el rol **ADMIN**: el Admin ve funcionalidades de cliente (carrito/checkout) y, a la vez, le faltan capacidades centrales de gestión de catálogo (crear/modificar productos, ajustar stock) y de mantenimiento de datos base (CRUD de ingredientes). Esto genera fricción operativa y riesgo de errores al administrar el catálogo.

## What Changes

- El rol **ADMIN** MUST no tener acceso a UI de carrito/checkout (ni entrypoints visibles) y la navegación/admin layout MUST enfocarse en gestión.
- El Admin MUST poder **crear** y **modificar** productos desde `/admin/productos` (formularios + validaciones) además del listado existente.
- El Admin MUST poder **actualizar stock** de productos desde el panel (edición explícita de cantidad), respetando las mismas reglas de backend de gestión de catálogo.
- Se agrega una página `/admin/ingredientes` con CRUD completo de ingredientes (crear/editar/soft-delete/restaurar) y su entrada en el sidebar.

## Capabilities

### New Capabilities
- `admin-ingredientes`: Gestión de ingredientes desde el panel admin (CRUD + integración UI/API + restricciones por rol).

### Modified Capabilities
- `admin-dashboard`: Extender y corregir los requisitos de `/admin/productos` (crear/editar + stock) y ajustar la navegación/visibilidad de funcionalidades de cliente para usuarios ADMIN.

## Impact

- Frontend: navegación/guards por rol, sidebar del admin, nueva página y formularios (productos e ingredientes), queries/mutations TanStack Query, stores (evitar exponer carrito en ADMIN).
- Backend: endpoints y guards RBAC para operaciones de ingredientes y actualización de stock (si no existen o si están restringidos), y/o alineación de permisos con `require_roles("ADMIN", "STOCK")`.
- UX: simplificación del flujo del Admin (sin carrito) y mayor eficiencia para tareas de catálogo.
