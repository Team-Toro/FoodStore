## ADDED Requirements

### Requirement: Página /admin/ingredientes — CRUD de ingredientes
El panel admin SHALL exponer la ruta `/admin/ingredientes` accesible sólo para usuarios con rol `ADMIN`. La página MUST permitir crear, editar y eliminar (soft-delete) ingredientes, usando el stack estándar del admin (`PageHeader`, `Toolbar`, `DataTable`, `PaginationBar`) para consistencia visual.

#### Scenario: Admin lista ingredientes
- **WHEN** un usuario con rol ADMIN navega a `/admin/ingredientes`
- **THEN** la página renderiza una tabla paginada obtenida desde `GET /api/v1/ingredientes?page=&size=` mostrando al menos `Nombre`, `Es alérgeno`, `Estado` y `Acciones`.

#### Scenario: Admin crea un ingrediente
- **WHEN** Admin hace click en "Nuevo ingrediente", completa `nombre` y `es_alergeno`, y confirma
- **THEN** la UI llama `POST /api/v1/ingredientes` y, al resolver, cierra el diálogo, invalida/refetch de la lista y muestra un mensaje de éxito.

#### Scenario: Admin edita un ingrediente
- **WHEN** Admin selecciona "Editar" en una fila, modifica `nombre` o `es_alergeno` y guarda
- **THEN** la UI llama `PUT /api/v1/ingredientes/{id}` y refresca la tabla mostrando los datos actualizados.

#### Scenario: Admin elimina (soft-delete) un ingrediente
- **WHEN** Admin selecciona "Eliminar" en una fila y confirma
- **THEN** la UI llama `DELETE /api/v1/ingredientes/{id}` y el ingrediente ya no aparece en el listado (o aparece con indicador de eliminado según configuración de filtro).

### Requirement: Entrada en sidebar para Ingredientes
El layout del admin SHALL incluir una entrada "Ingredientes" en el sidebar que navega a `/admin/ingredientes`. La entrada MUST ser visible sólo para usuarios con rol `ADMIN`.

#### Scenario: Sidebar muestra Ingredientes para ADMIN
- **WHEN** un usuario con rol ADMIN está autenticado
- **THEN** el sidebar del admin muestra la entrada "Ingredientes".

#### Scenario: Sidebar oculta Ingredientes para no-ADMIN
- **WHEN** un usuario sin rol ADMIN está autenticado
- **THEN** el sidebar no renderiza la entrada "Ingredientes".

### Requirement: Validación de nombre duplicado visible en UI
Cuando la API rechaza la creación/edición por `nombre` duplicado (HTTP 409 con `code: "INGREDIENTE_DUPLICADO"`), la UI MUST mostrar el error al usuario sin cerrar el diálogo.

#### Scenario: Error de duplicado no cierra el diálogo
- **WHEN** Admin intenta crear un ingrediente con un `nombre` ya existente y la API responde 409 `INGREDIENTE_DUPLICADO`
- **THEN** el diálogo permanece abierto y se muestra un mensaje de error con el `detail` retornado por backend.
