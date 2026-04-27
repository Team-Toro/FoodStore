## ADDED Requirements

### Requirement: Roles fijos del sistema
El sistema SHALL definir exactamente 4 roles con códigos e IDs estables: `ADMIN` (id=1), `STOCK` (id=2), `PEDIDOS` (id=3), `CLIENT` (id=4). Estos códigos MUST poblarse por semilla (`python -m app.db.seed`) tras la primera migración.

#### Scenario: Seed inserta los 4 roles
- **WHEN** se ejecuta `python -m app.db.seed` sobre una BD recién migrada
- **THEN** la tabla `rol` contiene exactamente 4 filas con `(id, codigo, nombre)` = `(1, "ADMIN", "Administrador")`, `(2, "STOCK", "Stock")`, `(3, "PEDIDOS", "Pedidos")`, `(4, "CLIENT", "Cliente")`.

#### Scenario: Re-ejecutar el seed es idempotente
- **WHEN** `python -m app.db.seed` se corre por segunda vez
- **THEN** no se duplican filas ni se producen errores; el script detecta los 4 roles existentes y los omite (upsert por `codigo`).

### Requirement: Dependencia get_current_user
El sistema SHALL proveer una dependencia FastAPI `get_current_user` en `app/core/deps.py` que extrae el bearer token, valida firma + expiración, y retorna un `CurrentUser(id, email, roles: list[str])` leído desde la BD con roles eager-loaded. MUST rechazar usuarios soft-deleted.

#### Scenario: Token válido retorna CurrentUser con roles
- **WHEN** un handler depende de `get_current_user` y la request llega con JWT válido de un usuario con roles `["CLIENT", "STOCK"]`
- **THEN** la dependencia retorna `CurrentUser(id=<uid>, email=<email>, roles=["CLIENT", "STOCK"])`.

#### Scenario: Usuario soft-deleted
- **WHEN** el JWT es válido pero el `Usuario` tiene `deleted_at IS NOT NULL`
- **THEN** la dependencia lanza `HTTPException(401, code="TOKEN_INVALID")`.

#### Scenario: Sin header Authorization
- **WHEN** la request no tiene `Authorization`
- **THEN** la dependencia lanza `HTTPException(401, code="TOKEN_MISSING")`.

#### Scenario: Token de tipo refresh usado como access
- **WHEN** el JWT es válido pero su claim `type != "access"`
- **THEN** la dependencia lanza `HTTPException(401, code="TOKEN_INVALID")`.

### Requirement: Factory require_roles
El sistema SHALL proveer `require_roles(*codigos: str)` en `app/core/deps.py` que retorna una dependencia FastAPI. Esta dependencia autoriza la request SI la intersección entre los roles del usuario y los códigos requeridos es no vacía; sino lanza 403.

#### Scenario: Usuario tiene uno de los roles requeridos
- **WHEN** un endpoint usa `Depends(require_roles("ADMIN", "PEDIDOS"))` y el usuario autenticado tiene roles `["PEDIDOS"]`
- **THEN** la dependencia retorna el `CurrentUser` y el handler se ejecuta.

#### Scenario: Usuario con rol insuficiente
- **WHEN** el endpoint exige `require_roles("ADMIN")` y el usuario tiene `["CLIENT"]`
- **THEN** la dependencia lanza `HTTPException(403, { detail: "Permisos insuficientes", code: "FORBIDDEN" })`.

#### Scenario: require_roles sin argumentos equivale a solo autenticado
- **WHEN** un endpoint usa `Depends(require_roles())` sin códigos
- **THEN** la dependencia sólo verifica autenticación y retorna el `CurrentUser` sin chequear roles.

#### Scenario: Sin autenticar en endpoint con require_roles
- **WHEN** no hay token y el endpoint depende de `require_roles("ADMIN")`
- **THEN** la dependencia responde `401` (propagado desde `get_current_user`), NO 403.

### Requirement: Rutas públicas vs protegidas
Las rutas `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` SHALL ser públicas (no requieren Authorization). Todas las demás rutas que no sean explícitamente públicas MUST estar protegidas por `get_current_user` o `require_roles(...)`.

#### Scenario: Login público
- **WHEN** se envía `POST /api/v1/auth/login` sin Authorization header
- **THEN** el sistema procesa la request normalmente (no retorna 401).

#### Scenario: Logout protegido
- **WHEN** se envía `POST /api/v1/auth/logout` sin Authorization header
- **THEN** el sistema responde `401 Unauthorized`.

#### Scenario: /me protegido
- **WHEN** se envía `GET /api/v1/auth/me` sin Authorization header
- **THEN** el sistema responde `401 Unauthorized`.
