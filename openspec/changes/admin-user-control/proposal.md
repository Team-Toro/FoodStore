## Why

Hoy no existe una pantalla en el frontend para que un ADMIN pueda gestionar usuarios (ver listado, cambiar roles y activar/desactivar). Esto obliga a operar vía BD/Swagger y genera fricción y riesgo operativo (p. ej., bloquear cuentas o asignar permisos) para tareas frecuentes.

## What Changes

- Agregar una página de administración **Usuarios** en el frontend (`/admin/usuarios`) con:
  - listado paginado de usuarios con búsqueda por nombre/email y filtro por rol
  - acciones para **activar/desactivar** un usuario
  - edición de **roles** (reemplazo del set de roles)
  - estados de carga/empty/error y manejo de errores de negocio (p. ej. protección de último ADMIN)
- Integrar la UI con los endpoints admin existentes (`GET /api/v1/admin/usuarios`, `PATCH /api/v1/admin/usuarios/{id}/roles`, `PATCH /api/v1/admin/usuarios/{id}/estado`).

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `admin-usuarios`: incorporar requisitos de UI/UX para la pantalla de gestión de usuarios (ruteo, filtros, paginación, acciones y manejo de errores) sin cambiar el contrato funcional existente de los endpoints.

## Impact

- Frontend (Admin): nueva página/feature de gestión de usuarios; nuevos hooks/queries y cliente API para endpoints admin de usuarios; componentes de tabla/controles y confirmaciones.
- Backend/API: sin cambios esperados si los endpoints ya están implementados según `admin-usuarios` (se valida durante la implementación).
- Seguridad/RBAC: la página debe ser accesible sólo para rol `ADMIN` y reflejar restricciones de negocio (p. ej. no desactivar self, no remover último ADMIN).
