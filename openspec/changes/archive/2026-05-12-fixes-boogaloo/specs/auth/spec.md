## ADDED Requirements

### Requirement: Token form-based para herramientas OpenAPI
El sistema SHALL exponer `POST /api/v1/auth/token` que acepta credenciales vía `application/x-www-form-urlencoded` (OAuth2 Password Flow) y retorna el mismo formato de respuesta que `POST /api/v1/auth/login`: `{ access_token, refresh_token, token_type: "bearer", expires_in }`.

El endpoint MUST autenticar con las mismas credenciales válidas que el login normal. Dado que OAuth2 define el campo `username`, el sistema MUST interpretar `username` como el identificador de login utilizado por el sistema (por defecto, `email`).

#### Scenario: Obtener tokens vía formulario con credenciales válidas
- **WHEN** un usuario existente envía `POST /api/v1/auth/token` con form-data `{ username, password }` válidos
- **THEN** el sistema responde `200 OK` con `{ access_token, refresh_token, token_type: "bearer", expires_in: 1800 }` y crea/persiste un refresh token como en el flujo de login.

#### Scenario: Credenciales inválidas en endpoint token
- **WHEN** el request a `POST /api/v1/auth/token` incluye `username` inexistente o `password` incorrecta
- **THEN** el sistema responde `401 Unauthorized` con `{ detail: "Credenciales inválidas", code: "INVALID_CREDENTIALS" }`, manteniendo el mismo comportamiento de timing constante que el login.

#### Scenario: Usuario soft-deleted no puede obtener token
- **WHEN** un usuario con `deleted_at IS NOT NULL` intenta autenticarse vía `POST /api/v1/auth/token`
- **THEN** el sistema responde `401 Unauthorized` con el mismo payload de credenciales inválidas.

### Requirement: OpenAPI tokenUrl apunta al endpoint form-based
El OpenAPI de la API SHALL configurar el OAuth2 Password Flow de forma que `tokenUrl` apunte a `/api/v1/auth/token`, permitiendo autenticación desde ReDoc/Swagger UI.

#### Scenario: ReDoc puede iniciar sesión y autorizar requests
- **WHEN** un usuario ingresa credenciales en el panel de autorización de ReDoc
- **THEN** ReDoc obtiene un access token llamando a `/api/v1/auth/token` y envía `Authorization: Bearer <access_token>` en requests a endpoints protegidos.
