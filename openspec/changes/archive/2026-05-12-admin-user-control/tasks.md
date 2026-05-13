## 1. Descubrimiento y alineación con API

- [x] 1.1 Identificar en el frontend la estructura actual del Admin (rutas/layout) y decidir dónde ubicar `/admin/usuarios` siguiendo FSD
- [x] 1.2 Verificar contratos reales de los endpoints `GET /api/v1/admin/usuarios`, `PATCH /api/v1/admin/usuarios/{id}/roles`, `PATCH /api/v1/admin/usuarios/{id}/estado` (params, shapes, códigos de error) y ajustar types/client si difieren del spec

## 2. Capa API + Types (frontend)

- [x] 2.1 Definir types de `AdminUsuario` y respuesta paginada (items/total/page/size/pages)
- [x] 2.2 Implementar funciones API para: listar usuarios (con `page/size/q/rol`), actualizar roles, actualizar estado
- [x] 2.3 Agregar mapping de errores por `code` relevante (`LAST_ADMIN_PROTECTED`, `SELF_DEACTIVATION_FORBIDDEN`, `FORBIDDEN`, etc.) para mensajes de UI

## 3. Queries/Mutations con TanStack Query

- [x] 3.1 Implementar `useAdminUsuariosQuery({page,size,q,rol})` con `queryKey` estable y soporte de loading/error/empty
- [x] 3.2 Implementar `useUpdateUsuarioRolesMutation` e invalidación/actualización del cache
- [x] 3.3 Implementar `useUpdateUsuarioEstadoMutation` e invalidación/actualización del cache

## 4. UI: Página `/admin/usuarios`

- [x] 4.1 Crear la página y registrar la ruta `/admin/usuarios` protegida para rol `ADMIN`
- [x] 4.2 Construir UI de filtros (búsqueda `q`, filtro por `rol`, paginación `page/size`) y conectarla con la query
- [x] 4.3 Renderizar tabla/listado con columnas mínimas (nombre/apellido, email, roles, activo, created_at) y acciones por fila
- [x] 4.4 Implementar confirmación para activar/desactivar y mostrar feedback de éxito/error

## 5. UI: Edición de roles

- [x] 5.1 Implementar modal/drawer de edición de roles con multiselect de roles fijos (ADMIN/STOCK/PEDIDOS/CLIENT)
- [x] 5.2 Conectar confirmación del modal a la mutation de roles y actualizar el listado
- [x] 5.3 Manejar errores de negocio (`LAST_ADMIN_PROTECTED`) mostrando mensajes claros y sin cambiar el estado visual si falla

## 6. Estados y calidad

- [x] 6.1 Implementar estados loading/empty/error según spec, incluyendo caso 403 (sin permisos)
- [x] 6.2 Revisar accesibilidad básica (labels, focus en modal, navegación teclado) para la pantalla
- [x] 6.3 Ejecutar lint del frontend y corregir issues (sin build)
