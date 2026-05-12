## MODIFIED Requirements

### Requirement: Login con credenciales

El sistema SHALL exponer `POST /api/v1/auth/login` que valida `{email, password}` y retorna `{access_token, refresh_token, token_type, expires_in}`. La respuesta ante credenciales inválidas MUST ser idéntica tanto si el email no existe como si la contraseña no coincide. El endpoint MUST aplicar rate limit de 5 intentos / 15 minutos por IP.

#### Scenario: Login exitoso
- **WHEN** un usuario existente envía credenciales válidas
- **THEN** el sistema responde `200 OK` con `{ access_token, refresh_token, token_type: "bearer", expires_in: 1800 }`, persiste una fila en `refresh_token` con `token_hash = sha256(refresh_token_uuid).hexdigest()`, `expires_at = now() + 7 days`, `revoked_at = NULL`.

#### Scenario: Login acepta `username` como alias de `email` (tooling OpenAPI)
- **WHEN** una herramienta OpenAPI (p. ej. ReDoc) envía un request con campo `username` en lugar de `email`
- **THEN** el sistema interpreta `username` como `email` y aplica exactamente la misma validación y respuesta que el flujo estándar

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
