## ADDED Requirements

### Requirement: Campo activo en Usuario
El modelo `Usuario` SHALL incluir columna `activo BOOLEAN NOT NULL DEFAULT TRUE`. El endpoint de login MUST verificar `activo=True` antes de emitir tokens: si `activo=False`, responder HTTP 403 con `code: "ACCOUNT_DISABLED"`.

#### Scenario: Login de usuario desactivado
- **WHEN** un usuario con `activo=False` intenta hacer login con credenciales correctas
- **THEN** responde HTTP 403 con body `{ "detail": "Cuenta desactivada", "code": "ACCOUNT_DISABLED" }`

#### Scenario: Login de usuario activo no afectado
- **WHEN** usuario con `activo=True` hace login con credenciales correctas
- **THEN** responde HTTP 200 con tokens (sin cambios respecto al comportamiento actual)

### Requirement: Listado de usuarios para Admin
El sistema SHALL exponer `GET /api/v1/admin/usuarios` accesible sólo con rol ADMIN. Acepta query params: `page` (int, default 1), `size` (int, default 20), `q` (string búsqueda por nombre o email), `rol` (string filtro por código de rol). Retorna esquema paginado con `{ items, total, page, size, pages }`. Cada ítem incluye: `id`, `nombre`, `apellido`, `email`, `activo`, `created_at`, `roles` (array de códigos), `deleted_at`.

#### Scenario: Listado paginado sin filtros
- **WHEN** Admin llama `GET /api/v1/admin/usuarios?page=1&size=20`
- **THEN** responde HTTP 200 con estructura paginada incluyendo usuarios activos e inactivos (excluye soft-deleted)

#### Scenario: Búsqueda por email parcial
- **WHEN** Admin llama con `?q=juan`
- **THEN** retorna usuarios cuyo nombre o email contenga "juan" (case-insensitive, ILIKE)

#### Scenario: Filtro por rol
- **WHEN** Admin llama con `?rol=STOCK`
- **THEN** retorna sólo usuarios que tienen el rol STOCK asignado

### Requirement: Asignación y revocación de roles (Admin)
El sistema SHALL exponer `PATCH /api/v1/admin/usuarios/{id}/roles` con body `{ "roles": ["STOCK", "CLIENT"] }` (array de códigos de rol que debe tener el usuario). El servicio MUST reemplazar todos los roles actuales con los nuevos y luego revocar todos los refresh tokens activos del usuario afectado (`revoked_at = now()`). MUST rechazar si la operación dejaría al sistema sin ningún ADMIN.

#### Scenario: Cambio de roles revoca tokens
- **WHEN** Admin modifica los roles del usuario X
- **THEN** todos los `RefreshToken` activos de X reciben `revoked_at = now()`

#### Scenario: No se puede remover último ADMIN
- **WHEN** Admin intenta quitar el rol ADMIN al único usuario con ese rol
- **THEN** responde HTTP 422 con `code: "LAST_ADMIN_PROTECTED"`

#### Scenario: Admin no puede degradarse a sí mismo si es el último
- **WHEN** el Admin autenticado intenta removerse el rol ADMIN siendo el único administrador
- **THEN** responde HTTP 422 con `code: "LAST_ADMIN_PROTECTED"`

#### Scenario: Asignación exitosa retorna usuario actualizado
- **WHEN** Admin asigna roles `["STOCK", "CLIENT"]` a usuario que tenía `["CLIENT"]`
- **THEN** responde HTTP 200 con el usuario y sus nuevos roles `["STOCK", "CLIENT"]`

### Requirement: Activación y desactivación de usuarios (Admin)
El sistema SHALL exponer `PATCH /api/v1/admin/usuarios/{id}/estado` con body `{ "activo": false }`. Al desactivar, el servicio MUST revocar todos los refresh tokens activos del usuario (`revoked_at = now()`). MUST rechazar si el administrador intenta desactivarse a sí mismo.

#### Scenario: Desactivar usuario revoca tokens
- **WHEN** Admin desactiva al usuario X (activo=True → activo=False)
- **THEN** todos los refresh tokens activos de X se revocan y responde HTTP 200

#### Scenario: Admin no puede desactivarse a sí mismo
- **WHEN** el Admin autenticado envía `{ "activo": false }` apuntando a su propio ID
- **THEN** responde HTTP 422 con `code: "SELF_DEACTIVATION_FORBIDDEN"`

#### Scenario: Reactivar usuario
- **WHEN** Admin envía `{ "activo": true }` para un usuario desactivado
- **THEN** el usuario queda activo y puede hacer login nuevamente; responde HTTP 200

## MODIFIED Requirements

### Requirement: Servicio de usuarios
El módulo `app/modules/usuarios/service.py` SHALL orquestar:
- `crear_cliente(uow, data: RegisterRequest) -> Usuario` — crea `Usuario` + `UsuarioRol(CLIENT)` en una transacción, hasheando la contraseña.
- `get_current_user_dto(uow, usuario_id: int) -> UserResponse` — lee usuario con roles y mapea a Pydantic `UserResponse`.
- `verificar_activo(usuario: Usuario) -> None` — lanza `HTTPException(403, code="ACCOUNT_DISABLED")` si `usuario.activo=False`. MUST ser llamado en el flujo de login antes de emitir tokens.
Ningún servicio SHALL llamar `session.commit()` directamente; la UoW se encarga.

#### Scenario: Registro crea usuario y rol en misma transacción
- **WHEN** `crear_cliente(uow, data)` se ejecuta dentro de `async with UnitOfWork() as uow`
- **THEN** al salir del bloque SIN excepciones se han persistido una fila en `usuario` y una en `usuario_rol` apuntando al rol CLIENT.

#### Scenario: Rollback por email duplicado
- **WHEN** `crear_cliente` se ejecuta con un email ya existente y el servicio lanza `HTTPException(409)`
- **THEN** `UnitOfWork.__aexit__` hace rollback y no queda ninguna fila persistida.

#### Scenario: UserResponse nunca expone password_hash
- **WHEN** cualquier endpoint retorna un `UserResponse`
- **THEN** el JSON serializado no contiene la clave `password_hash` (verificado por el schema Pydantic).

#### Scenario: Login bloqueado para usuario inactivo
- **WHEN** el servicio de auth llama `verificar_activo(usuario)` y `usuario.activo=False`
- **THEN** lanza `HTTPException(403, detail="Cuenta desactivada", code="ACCOUNT_DISABLED")` antes de generar tokens.
