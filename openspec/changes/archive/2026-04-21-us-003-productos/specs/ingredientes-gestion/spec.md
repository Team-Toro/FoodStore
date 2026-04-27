## ADDED Requirements

### Requirement: Crear ingrediente
El sistema SHALL exponer `POST /api/v1/ingredientes` que crea un nuevo ingrediente. Solo roles ADMIN o STOCK pueden acceder. El body SHALL incluir `nombre` (requerido, único, max 100 chars), `descripcion` (opcional), `es_alergeno` (opcional, default false). Si el nombre ya existe (case-insensitive), SHALL retornar HTTP 409 Conflict.

#### Scenario: Creación exitosa
- **WHEN** un usuario STOCK hace `POST /api/v1/ingredientes` con `{ "nombre": "Gluten", "es_alergeno": true }`
- **THEN** retorna HTTP 201 con `{ id, nombre, descripcion, es_alergeno, creado_en }`

#### Scenario: Nombre duplicado
- **WHEN** ya existe un ingrediente con el mismo nombre
- **THEN** retorna HTTP 409 con `{ "code": "INGREDIENTE_DUPLICADO", "detail": "Ya existe un ingrediente con ese nombre" }`

#### Scenario: Sin autorización
- **WHEN** un CLIENT intenta crear un ingrediente
- **THEN** retorna HTTP 403

---

### Requirement: Listar ingredientes (público con filtro)
El sistema SHALL exponer `GET /api/v1/ingredientes` como endpoint público que retorna ingredientes activos paginados. SHALL aceptar `?es_alergeno=true` para filtrar solo alérgenos.

#### Scenario: Listado sin filtros
- **WHEN** se hace `GET /api/v1/ingredientes`
- **THEN** retorna HTTP 200 con todos los ingredientes con `deleted_at IS NULL`, paginados

#### Scenario: Filtro por alérgeno
- **WHEN** se hace `GET /api/v1/ingredientes?es_alergeno=true`
- **THEN** retorna solo ingredientes con `es_alergeno=true`

---

### Requirement: Obtener ingrediente por ID
El sistema SHALL exponer `GET /api/v1/ingredientes/{id}` que retorna el detalle de un ingrediente. El endpoint es público. Si el ingrediente no existe o está eliminado, retorna HTTP 404.

#### Scenario: Detalle exitoso
- **WHEN** se hace `GET /api/v1/ingredientes/1`
- **THEN** retorna HTTP 200 con `{ id, nombre, descripcion, es_alergeno }`

#### Scenario: No encontrado
- **WHEN** el ID no existe o tiene `deleted_at IS NOT NULL`
- **THEN** retorna HTTP 404 con `{ "code": "INGREDIENTE_NOT_FOUND" }`

---

### Requirement: Actualizar ingrediente
El sistema SHALL exponer `PUT /api/v1/ingredientes/{id}` que actualiza un ingrediente. Solo roles ADMIN o STOCK pueden acceder. Si el nuevo nombre ya existe en otro ingrediente, SHALL retornar HTTP 409.

#### Scenario: Actualización exitosa
- **WHEN** un usuario STOCK hace `PUT /api/v1/ingredientes/1` con `{ "es_alergeno": false }`
- **THEN** retorna HTTP 200 con el ingrediente actualizado

#### Scenario: Nombre duplicado en actualización
- **WHEN** el nuevo nombre coincide con otro ingrediente existente
- **THEN** retorna HTTP 409 con `{ "code": "INGREDIENTE_DUPLICADO" }`

---

### Requirement: Eliminar ingrediente (soft delete)
El sistema SHALL exponer `DELETE /api/v1/ingredientes/{id}` que marca el ingrediente con `deleted_at = NOW()`. Solo rol ADMIN puede eliminar. El ingrediente eliminado no puede asociarse a nuevos productos pero se mantiene en las asociaciones existentes para preservar integridad histórica.

#### Scenario: Soft delete exitoso
- **WHEN** un usuario ADMIN hace `DELETE /api/v1/ingredientes/1`
- **THEN** retorna HTTP 204 No Content y `deleted_at` queda poblado

#### Scenario: Solo ADMIN puede eliminar
- **WHEN** un usuario STOCK intenta eliminar un ingrediente
- **THEN** retorna HTTP 403 Forbidden

#### Scenario: Ingrediente ya eliminado
- **WHEN** se intenta eliminar un ingrediente con `deleted_at IS NOT NULL`
- **THEN** retorna HTTP 404
