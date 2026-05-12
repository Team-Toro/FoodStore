## ADDED Requirements

### Requirement: Página de gestión de usuarios para Admin
El frontend SHALL exponer una página `/admin/usuarios` visible sólo para usuarios autenticados con rol `ADMIN`. La página SHALL permitir gestionar usuarios existentes sin requerir acceso a Swagger/BD.

#### Scenario: Acceso permitido para ADMIN
- **WHEN** un usuario con rol `ADMIN` navega a `/admin/usuarios`
- **THEN** la aplicación renderiza la pantalla de gestión de usuarios y dispara la carga del listado.

#### Scenario: Acceso denegado para no-ADMIN
- **WHEN** un usuario autenticado sin rol `ADMIN` navega a `/admin/usuarios`
- **THEN** la aplicación bloquea el acceso (redirige o muestra estado de “Sin permisos”) y no permite ejecutar acciones de administración.

### Requirement: Listado paginado con búsqueda y filtro
La página `/admin/usuarios` SHALL consumir `GET /api/v1/admin/usuarios` y SHALL soportar:
- paginación por `page` y `size`
- búsqueda por `q` (nombre o email)
- filtro por `rol`
El listado SHALL mostrar al menos `nombre`, `apellido`, `email`, `roles`, `activo` y `created_at`.

#### Scenario: Paginación cambia los resultados
- **WHEN** el Admin cambia a `page=2` manteniendo `size=20`
- **THEN** la página solicita `GET /api/v1/admin/usuarios?page=2&size=20` y renderiza los ítems de esa página.

#### Scenario: Búsqueda por texto
- **WHEN** el Admin ingresa `q="juan"` y confirma la búsqueda
- **THEN** la página solicita el listado incluyendo `q=juan` y renderiza sólo los usuarios coincidentes.

#### Scenario: Filtro por rol
- **WHEN** el Admin selecciona el rol `STOCK` como filtro
- **THEN** la página solicita el listado incluyendo `rol=STOCK` y renderiza sólo usuarios con ese rol.

### Requirement: Activar y desactivar usuarios desde la UI
La página SHALL permitir activar/desactivar un usuario consumiendo `PATCH /api/v1/admin/usuarios/{id}/estado`.

#### Scenario: Desactivar usuario
- **WHEN** el Admin confirma la acción de desactivar para un usuario activo
- **THEN** la página envía `{ "activo": false }` al endpoint correspondiente y al éxito actualiza el estado mostrado a inactivo.

#### Scenario: Error de negocio al intentar auto-desactivación
- **WHEN** el backend responde `422` con `code: "SELF_DEACTIVATION_FORBIDDEN"`
- **THEN** la UI muestra un mensaje de error comprensible y no cambia el estado del usuario en pantalla.

### Requirement: Edición de roles desde la UI
La página SHALL permitir reemplazar el set de roles de un usuario consumiendo `PATCH /api/v1/admin/usuarios/{id}/roles` con body `{ "roles": [<codigos>] }`.

#### Scenario: Asignación de roles exitosa
- **WHEN** el Admin confirma la edición de roles de un usuario
- **THEN** la página envía el arreglo de roles seleccionado y, si la respuesta es 200, muestra los roles actualizados en el listado.

#### Scenario: Protección del último ADMIN
- **WHEN** el backend responde `422` con `code: "LAST_ADMIN_PROTECTED"`
- **THEN** la UI muestra un mensaje de error comprensible y no persiste el cambio visual de roles.

### Requirement: Estados de carga, vacío y error
La pantalla SHALL presentar estados consistentes:
- loading mientras se obtiene el listado
- empty state cuando `items` es vacío para los filtros actuales
- error state cuando falla la carga o una mutación

#### Scenario: Empty state
- **WHEN** el listado retorna `{ items: [] }` para los filtros actuales
- **THEN** la UI muestra un estado vacío con indicación de que no hay resultados y permite ajustar filtros/búsqueda.
