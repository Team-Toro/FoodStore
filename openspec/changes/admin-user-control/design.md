## Context

El backend ya define la capacidad `admin-usuarios` con endpoints para listar usuarios, cambiar roles y activar/desactivar, incluyendo reglas de negocio (protección del último ADMIN, prohibición de auto-desactivación y revocación de refresh tokens). Actualmente falta la contraparte de frontend para que un ADMIN pueda operar estas funciones desde la UI.

El frontend sigue FSD (Pages → Features → Hooks/Stores → API → Types) y separa server state (TanStack Query) de client state (Zustand). Esta pantalla es principalmente server state.

## Goals / Non-Goals

**Goals:**
- Crear la página `/admin/usuarios` accesible sólo por rol `ADMIN`.
- Permitir: (1) listado paginado con búsqueda y filtro por rol, (2) activar/desactivar usuario, (3) reemplazar roles de un usuario.
- UX robusta: loading/empty/error, confirmaciones para acciones destructivas, y feedback claro ante errores de negocio (`LAST_ADMIN_PROTECTED`, `SELF_DEACTIVATION_FORBIDDEN`, `ACCOUNT_DISABLED`, etc.).
- Mantener consistencia con patrones existentes del admin (componentes, layout, estilos).

**Non-Goals:**
- No cambiar contratos de API ni lógica de negocio en backend (salvo que se detecte una desviación respecto de `openspec/specs/admin-usuarios/spec.md`).
- No crear un sistema nuevo de permisos en frontend; sólo consumir RBAC existente.
- No agregar funcionalidades fuera de alcance (crear/borrar usuarios, reset de contraseña, auditoría detallada de cambios).

## Decisions

1) **TanStack Query para server state**
- Usar `useQuery` para `GET /api/v1/admin/usuarios` con `page/size/q/rol` como parte de la `queryKey`.
- Usar `useMutation` para `PATCH .../roles` y `PATCH .../estado`.
- Estrategia de cache: invalidar la query de listado al mutar (y opcionalmente actualizar optimistamente la fila afectada si es simple).

Alternativas consideradas:
- Zustand para persistir listado y filtros. Se descarta: es server state y se beneficia de caching/retries/invalidation de Query.

2) **Modelo de UI: tabla con acciones por fila + modal/drawer para roles**
- Tabla con columnas mínimas (Nombre, Email, Roles, Activo, Creado) y acciones (Editar roles, Activar/Desactivar).
- Edición de roles en modal/drawer con multiselect de roles (códigos fijos: ADMIN, STOCK, PEDIDOS, CLIENT).

Alternativas consideradas:
- Edición inline en tabla. Se descarta por complejidad UX (validación, confirmación, foco) y riesgo de acciones accidentales.

3) **Confirmaciones y estados de error consistentes**
- Desactivar/activar requiere confirmación (especialmente desactivar).
- En errores 422/403 con `code` conocido, mostrar mensaje específico; en otros errores, fallback genérico.

4) **Acceso y protección por rol**
- Enrutado: proteger la ruta con guard del frontend existente para ADMIN.
- Si el backend responde 403, mostrar estado “Sin permisos” (no asumir que el guard siempre previene).

## Risks / Trade-offs

- **Riesgo**: divergencia entre API real y spec (campos o parámetros distintos) → **Mitigación**: validar contra swagger/backend durante la implementación y ajustar client/types.
- **Riesgo**: invalidación excesiva y re-fetch en cada mutación → **Mitigación**: invalidar sólo la query del listado vigente (mismas params) o aplicar patch local a la fila.
- **Riesgo**: manejo inconsistente de códigos de error → **Mitigación**: centralizar mapping `code -> message` para esta pantalla y reutilizar patrón existente del admin.
