## Why

La navegación actual todavía expone entradas (p.ej. “menu”, “inicio”) que llevan a “gestión”, generando una UX confusa y rutas rotas/inútiles. Además, el dataset de seed es demasiado chico para recorrer flujos reales del sistema, y la documentación (ReDoc) no permite autenticarse cómodamente para probar endpoints protegidos.

## What Changes

- Limpiar/ajustar navegación para remover/ocultar “menu” e “inicio” (y cualquier acceso equivalente) cuando redirigen a “gestión” o no corresponden al contexto actual.
- Ampliar seed data para habilitar exploración de funcionalidades (más categorías/productos, usuarios/roles, direcciones, pedidos con distintos estados, etc.).
- Agregar un endpoint de token “form-based” para compatibilidad con ReDoc: `POST /api/v1/auth/token` usando `OAuth2PasswordRequestForm`, manteniendo `POST /api/v1/auth/login` como JSON para el frontend.
- Actualizar el `tokenUrl` del esquema OAuth2 del OpenAPI para que apunte a `/api/v1/auth/token`, permitiendo autenticar desde ReDoc con las mismas credenciales de login.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `auth`: se incorpora un endpoint adicional de obtención de token compatible con OAuth2 (form-encoded) para herramientas de documentación, sin reemplazar el login JSON utilizado por el frontend.

## Impact

- Backend (FastAPI): módulo `auth` (router/schemas/servicio), configuración del OpenAPI security scheme (`tokenUrl`).
- Documentación: ReDoc/OpenAPI podrá obtener token vía formulario y usarlo en requests autenticadas.
- Frontend: navegación/menú y rutas que hoy apuntan a “gestión”.
- Seed: script(s) de carga inicial y datos de prueba (sin cambios de esquema; solo más registros).
