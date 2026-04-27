## ADDED Requirements

### Requirement: Registro de nuevo cliente
El sistema SHALL exponer `POST /api/v1/auth/register` que crea un `Usuario` con rol CLIENT y retorna un par `{access_token, refresh_token}`. El campo `rol` MUST NOT aceptarse desde el request. La contraseña MUST almacenarse hasheada con bcrypt (cost factor ≥ 12).

#### Scenario: Registro exitoso con datos válidos
- **WHEN** un cliente no registrado envía `POST /api/v1/auth/register` con `{ nombre, apellido, email, password }` válidos y `email` no duplicado
- **THEN** el sistema responde `201 Created` con `{ access_token, refresh_token, token_type: "bearer", expires_in: 1800 }`, persiste el `Usuario` con `password_hash = bcrypt(password)` y crea la asociación `UsuarioRol(usuario_id, rol_id=CLIENT_ID)`.

#### Scenario: Email ya registrado
- **WHEN** el request llega con un `email` que ya existe en la tabla `usuario` (aunque `deleted_at IS NULL`)
- **THEN** el sistema responde `409 Conflict` con `{ detail: "El email ya está registrado", code: "EMAIL_ALREADY_EXISTS", field: "email" }` y no crea ninguna fila.

#### Scenario: Contraseña menor a 8 caracteres
- **WHEN** el body contiene `password` de menos de 8 caracteres
- **THEN** el sistema responde `422 Unprocessable Entity` generado por Pydantic, sin consultar la BD.

#### Scenario: Email con formato inválido
- **WHEN** el campo `email` no valida contra `EmailStr`
- **THEN** el sistema responde `422` con el error de validación de Pydantic.

#### Scenario: Rol enviado en el body es ignorado
- **WHEN** el cliente agrega maliciosamente `"rol": "ADMIN"` al JSON
- **THEN** el sistema IGNORA el campo (no forma parte del schema), el usuario queda creado con rol CLIENT únicamente.

### Requirement: Login con credenciales
El sistema SHALL exponer `POST /api/v1/auth/login` que valida `{email, password}` y retorna `{access_token, refresh_token, token_type, expires_in}`. La respuesta ante credenciales inválidas MUST ser idéntica tanto si el email no existe como si la contraseña no coincide. El endpoint MUST aplicar rate limit de 5 intentos / 15 minutos por IP.

#### Scenario: Login exitoso
- **WHEN** un usuario existente envía credenciales válidas
- **THEN** el sistema responde `200 OK` con `{ access_token, refresh_token, token_type: "bearer", expires_in: 1800 }`, persiste una fila en `refresh_token` con `token_hash = sha256(refresh_token_uuid).hexdigest()`, `expires_at = now() + 7 days`, `revoked_at = NULL`.

#### Scenario: Credenciales inválidas — email inexistente
- **WHEN** el email no existe en la tabla `usuario`
- **THEN** el sistema SHALL ejecutar `verify_password` contra un hash dummy (para preservar timing constante) y responder `401 Unauthorized` con `{ detail: "Credenciales inválidas", code: "INVALID_CREDENTIALS" }`.

#### Scenario: Credenciales inválidas — contraseña incorrecta
- **WHEN** el email existe pero el `password` no verifica contra `password_hash`
- **THEN** el sistema responde `401 Unauthorized` con EXACTAMENTE el mismo payload que el caso de email inexistente.

#### Scenario: Usuario soft-deleted
- **WHEN** el email existe pero `deleted_at IS NOT NULL`
- **THEN** el sistema responde `401 Unauthorized` con el mismo payload de credenciales inválidas.

#### Scenario: Rate limit superado
- **WHEN** una misma IP hace un 6º intento de login dentro de una ventana de 15 minutos
- **THEN** el sistema responde `429 Too Many Requests` con header `Retry-After` en segundos y body `{ detail: "Demasiados intentos, reintenta en X minutos", code: "RATE_LIMIT_EXCEEDED" }`.

### Requirement: Rotación de refresh token
El sistema SHALL exponer `POST /api/v1/auth/refresh` que acepta `{refresh_token}`, revoca el token recibido y emite un nuevo par `{access_token, refresh_token}`. La operación MUST ser atómica (una sola transacción).

#### Scenario: Refresh válido
- **WHEN** se envía un refresh token cuyo hash existe en `refresh_token`, `revoked_at IS NULL` y `expires_at > now()`
- **THEN** el sistema setea `revoked_at = now()` en la fila vieja, inserta una nueva fila con un UUID v4 nuevo (hash correspondiente), y responde `200 OK` con `{access_token, refresh_token, token_type, expires_in}`.

#### Scenario: Refresh token expirado
- **WHEN** el hash existe pero `expires_at <= now()`
- **THEN** el sistema responde `401 Unauthorized` con `{ detail: "Refresh token expirado", code: "REFRESH_TOKEN_EXPIRED" }` y no emite tokens nuevos.

#### Scenario: Refresh token inexistente
- **WHEN** el hash no existe en la tabla
- **THEN** el sistema responde `401 Unauthorized` con `{ detail: "Refresh token inválido", code: "REFRESH_TOKEN_INVALID" }`.

#### Scenario: Replay de refresh token ya revocado
- **WHEN** el hash existe pero `revoked_at IS NOT NULL`
- **THEN** el sistema DEBE revocar TODOS los refresh tokens activos del usuario (`UPDATE refresh_token SET revoked_at = now() WHERE usuario_id = :uid AND revoked_at IS NULL`) y responder `401 Unauthorized` con `{ detail: "Refresh token reusado", code: "REFRESH_TOKEN_REUSED" }`.

### Requirement: Logout
El sistema SHALL exponer `POST /api/v1/auth/logout` que recibe `{refresh_token}` y revoca SOLO ese token. El endpoint MUST requerir `Authorization: Bearer <access_token>` válido.

#### Scenario: Logout exitoso
- **WHEN** un usuario autenticado envía su `refresh_token` actual
- **THEN** el sistema setea `revoked_at = now()` en la fila correspondiente y responde `204 No Content`.

#### Scenario: Logout con refresh ya revocado
- **WHEN** el hash existe pero `revoked_at IS NOT NULL`
- **THEN** el sistema responde `204 No Content` de forma idempotente (no falla, no revoca la familia completa — a diferencia de `/refresh`).

#### Scenario: Logout sin access token
- **WHEN** no se envía header `Authorization` o el access token es inválido/expirado
- **THEN** el sistema responde `401 Unauthorized` y no toca la BD.

#### Scenario: Access token sigue valido post-logout
- **WHEN** un cliente usa su access token (aún no expirado) después de haber hecho logout
- **THEN** las rutas protegidas siguen aceptándolo hasta su `exp` natural (comportamiento stateless documentado).

### Requirement: Endpoint /me
El sistema SHALL exponer `GET /api/v1/auth/me` protegido por `get_current_user` que retorna los datos del usuario autenticado, INCLUYENDO sus roles activos. La respuesta MUST NOT incluir `password_hash`.

#### Scenario: /me con access token válido
- **WHEN** se envía `GET /api/v1/auth/me` con `Authorization: Bearer <access_token>` válido
- **THEN** el sistema responde `200 OK` con `{ id, nombre, apellido, email, telefono, roles: ["CLIENT"], created_at }`.

#### Scenario: /me sin token
- **WHEN** la request no incluye header `Authorization`
- **THEN** el sistema responde `401 Unauthorized` con `{ detail: "Not authenticated", code: "TOKEN_MISSING" }`.

#### Scenario: /me con token expirado
- **WHEN** el access token tiene `exp < now()`
- **THEN** el sistema responde `401 Unauthorized` con `{ detail: "Token expirado", code: "TOKEN_EXPIRED" }`.

#### Scenario: /me con token inválido (firma mal)
- **WHEN** el JWT no valida la firma HS256 con `SECRET_KEY`
- **THEN** el sistema responde `401 Unauthorized` con `{ detail: "Token inválido", code: "TOKEN_INVALID" }`.

### Requirement: Rate limit en registro
El sistema SHALL aplicar `slowapi` rate limit de 3 registros / 1 hora por IP en `POST /api/v1/auth/register`.

#### Scenario: Cuarto intento de registro desde la misma IP
- **WHEN** una IP ya ejecutó 3 registros exitosos o intentados en la última hora y hace un 4º POST
- **THEN** el sistema responde `429 Too Many Requests` con header `Retry-After`.

### Requirement: Formato de respuesta de errores
Todos los errores HTTP devueltos por el módulo `auth` SHALL seguir el patrón `{ "detail": "<mensaje>", "code": "<CODE>", "field"?: "<campo>" }` (RFC 7807 simplificado). Los códigos en este módulo son: `EMAIL_ALREADY_EXISTS`, `INVALID_CREDENTIALS`, `RATE_LIMIT_EXCEEDED`, `REFRESH_TOKEN_INVALID`, `REFRESH_TOKEN_EXPIRED`, `REFRESH_TOKEN_REUSED`, `TOKEN_MISSING`, `TOKEN_EXPIRED`, `TOKEN_INVALID`.

#### Scenario: Error 401 devuelve code estable
- **WHEN** cualquier endpoint de auth responde 401
- **THEN** el JSON incluye un campo `code` con uno de los valores listados — los clientes pueden discriminar por `code` sin parsear `detail`.
