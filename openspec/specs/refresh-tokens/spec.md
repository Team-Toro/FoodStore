## ADDED Requirements

### Requirement: Persistencia como hash SHA-256
La tabla `refresh_token` SHALL almacenar el token como `token_hash CHAR(64)` (SHA-256 hex) con índice UNIQUE. El UUID v4 crudo MUST NUNCA persistirse. El hash MUST calcularse con `hashlib.sha256(token.encode()).hexdigest()`.

#### Scenario: Insertar token persiste hash, no UUID
- **WHEN** el servicio de auth emite un nuevo refresh UUID `"5f4e..."` y lo persiste
- **THEN** la fila resultante contiene `token_hash = sha256("5f4e...")` y ninguna columna contiene el UUID crudo.

#### Scenario: Búsqueda por hash
- **WHEN** llega un refresh desde el cliente
- **THEN** el repositorio calcula el hash y consulta `SELECT * FROM refresh_token WHERE token_hash = :h LIMIT 1`.

#### Scenario: Colisión de hash imposible en práctica
- **WHEN** dos UUIDs distintos producen el mismo hash (improbable)
- **THEN** la restricción UNIQUE sobre `token_hash` impide insertarlo; el servicio regenera un nuevo UUID y reintenta (máximo 3 intentos).

### Requirement: Campos temporales
La tabla `refresh_token` SHALL contener `id` (BIGSERIAL PK), `token_hash` (CHAR(64) UQ NN), `usuario_id` (BIGINT FK → usuario.id NN), `issued_at` (TIMESTAMPTZ default now() NN), `expires_at` (TIMESTAMPTZ NN), `revoked_at` (TIMESTAMPTZ NULL). Un token se considera "activo" SSI `revoked_at IS NULL AND expires_at > now()`.

#### Scenario: Expiración a 7 días
- **WHEN** se emite un refresh token en `T`
- **THEN** la fila tiene `expires_at = T + 7 days` (exactamente `timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)`).

#### Scenario: Revocado ya no es activo
- **WHEN** una fila tiene `revoked_at = T` con `T <= now()`
- **THEN** los métodos de lectura del repositorio la consideran inactiva.

### Requirement: Repositorio de refresh tokens
El módulo `app/modules/refreshtokens/repository.py` SHALL proveer `RefreshTokenRepository(BaseRepository[RefreshToken])` con al menos:
- `create(usuario_id, token_uuid, expires_at) -> RefreshToken` (hashea internamente).
- `get_by_token(token_uuid) -> RefreshToken | None` (hashea internamente, lectura con `FOR UPDATE` opcional).
- `revoke(token: RefreshToken) -> None` (setea `revoked_at = now()`).
- `revoke_all_for_user(usuario_id: int) -> int` (revoca todas las filas activas del usuario; retorna cantidad).

#### Scenario: revoke_all_for_user afecta sólo las activas
- **WHEN** el usuario 5 tiene 3 tokens con `revoked_at IS NULL` y 2 con `revoked_at IS NOT NULL`
- **THEN** `revoke_all_for_user(5)` retorna `3`; las 2 ya revocadas no se tocan (idempotencia).

#### Scenario: get_by_token no revela existencia si expiró
- **WHEN** `get_by_token(uuid)` encuentra la fila pero `expires_at <= now()`
- **THEN** el método retorna la fila (el service decide: en `refresh` → 401 expired; en `logout` → idempotente 204); el repositorio es data-access puro y NO filtra por tiempo.

### Requirement: Servicio de rotación
El módulo `app/modules/refreshtokens/service.py` SHALL implementar `rotate_refresh_token(uow, token_uuid) -> tuple[access, refresh]` que:
1. Busca el token por hash.
2. Si no existe → lanza `HTTPException(401, code="REFRESH_TOKEN_INVALID")`.
3. Si existe y `revoked_at IS NOT NULL` → llama `revoke_all_for_user(usuario_id)` y lanza `HTTPException(401, code="REFRESH_TOKEN_REUSED")`.
4. Si existe y `expires_at <= now()` → lanza `HTTPException(401, code="REFRESH_TOKEN_EXPIRED")`.
5. Si válido → marca revocado, crea uno nuevo, emite access token nuevo.

#### Scenario: Replay dispara revocación masiva
- **WHEN** el usuario tiene 2 refresh tokens activos (T1, T2) y el atacante reenvía T1 tras haberlo usado
- **THEN** el sistema detecta `T1.revoked_at != NULL`, revoca T1 y T2 y responde 401 `REFRESH_TOKEN_REUSED`.

#### Scenario: Operación atómica ante fallo de red
- **WHEN** `rotate_refresh_token` cae entre el `revoke` del viejo y el `insert` del nuevo
- **THEN** la `UnitOfWork` hace rollback — el token viejo sigue activo y el cliente puede reintentar idempotentemente.

### Requirement: Emisión de refresh en login y register
El servicio de auth SHALL crear exactamente UN refresh token en la BD en cada `/auth/login` exitoso y en cada `/auth/register` exitoso. El UUID crudo retornado al cliente MUST generarse con `uuid.uuid4()` y NUNCA reutilizarse.

#### Scenario: Login inserta fila en refresh_token
- **WHEN** un login exitoso para `usuario_id=10`
- **THEN** la tabla `refresh_token` gana una fila nueva con `usuario_id=10`, `revoked_at=NULL`, `expires_at = now() + 7d`.

#### Scenario: Register inserta fila en refresh_token
- **WHEN** un register exitoso crea `usuario_id=25`
- **THEN** la tabla `refresh_token` gana una fila nueva asociada a 25 dentro de la MISMA transacción que creó el usuario.
