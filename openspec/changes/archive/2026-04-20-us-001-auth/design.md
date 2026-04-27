## Context

Food Store arranca sin ningún endpoint. Los modelos `Usuario`, `Rol`, `UsuarioRol` y `RefreshToken` ya están declarados en SQLModel (`backend/app/modules/{usuarios,auth,refreshtokens}/model.py`) pero ningún servicio ni router está implementado. `app/core/security.py` contiene un esqueleto con `hash_password`, `verify_password`, `create_access_token`, `decode_access_token`. `app/core/uow.py` abre sesión asíncrona pero todavía no registra repositorios.

Los documentos `docs/Integrador.txt` (§4.1 flujo JWT, §4.2 RBAC, §5 contrato API, §6 schemas Pydantic) y `docs/Historias_de_usuario.txt` (US-001..US-005, US-073, reglas RN-AU01..RN-AU08, RN-RB01..RN-RB10, RN-DA04) son la fuente de verdad. La presente change implementa el cimiento de seguridad para todo el resto del sistema.

## Goals / Non-Goals

**Goals:**
- Entregar los 5 endpoints de auth del contrato (§5.1 Integrador): register, login, refresh, logout, me.
- Hashing bcrypt (cost ≥ 12), JWT HS256 con access de 30 min y refresh UUID v4 opaco de 7 días.
- Rotación de refresh con detección de replay (revoca familia completa del usuario ante reuso).
- Rate limiting en `/login` (5/15min por IP) y `/register` (3/1h por IP) usando `slowapi`.
- Dependencias FastAPI reutilizables `get_current_user` y `require_roles(*codigos)` aplicables en todas las historias siguientes.
- Semilla mínima (4 roles + admin) y primera migración Alembic con `rol`, `usuario`, `usuario_rol`, `refresh_token`.
- Frontend: `authStore` persistiendo sólo `accessToken`, reconstrucción vía `/auth/me`, interceptor Axios con cola singleton para refresh transparente ante 401.

**Non-Goals:**
- Gestión administrativa de roles (US-005 `PUT /admin/users/:id/role`) — se cubre en `us-007-admin`.
- Recuperación de contraseña, verificación de email, OAuth social, 2FA.
- Rate limiting en endpoints fuera de auth (US-073 completo: pedidos, etc.) — aquí sólo login/register.
- Guardas de rutas frontend por rol (US-075/US-076) — se cubrirá cuando existan rutas por rol; acá sólo `RequireAuth` genérico.
- Logs de auditoría detallados (intentos fallidos persistidos). `slowapi` cuenta in-memory alcanza para MVP.
- Blacklist de access tokens. Son stateless por diseño (RN-AU-implícita: el access vale hasta `exp` aunque se haga logout; logout revoca sólo el refresh).

## Decisions

### 1. JWT HS256 (simétrico) con `python-jose`
- **Qué**: Access token firmado con `SECRET_KEY` (simétrica). Claims: `sub` (user id como string), `email`, `roles` (lista de códigos), `type="access"`, `exp`, `iat`.
- **Alternativa considerada**: RS256 (asimétrico). Aporta si hay verificadores externos o microservicios. Food Store es monolito con un solo API, así que HS256 simplifica y evita gestión de llaves PEM.
- **Por qué**: menor fricción, suficiente para la consigna, alineado con `Integrador.txt` §6 y `.env` con `SECRET_KEY` + `ALGORITHM=HS256`.

### 2. Refresh token = UUID v4 opaco, almacenado como SHA-256 hex(64) en BD
- **Qué**: el cliente recibe el UUID en claro. La BD guarda `token_hash CHAR(64)` (columna ya definida). `hash_refresh_token = sha256(uuid).hexdigest()`.
- **Alternativa considerada**: JWT como refresh. Sería consistente pero imposible de revocar realmente sin blacklist; lo opaco + hash es más seguro y ya es lo que el modelo espera.
- **Por qué**: RN-AU03 + modelo preexistente en `refreshtokens/model.py`.

### 3. Rotación y detección de replay
- **Qué**: en `/auth/refresh`:
  1. hashear el token recibido, buscarlo con `SELECT ... FOR UPDATE`.
  2. si **no existe** → 401.
  3. si existe pero `revoked_at IS NOT NULL` → replay: `UPDATE refresh_token SET revoked_at = now() WHERE usuario_id = :uid AND revoked_at IS NULL` + 401.
  4. si existe, activo y `expires_at < now()` → 401 "expirado" (sin revocar familia).
  5. si válido → marcar el actual como `revoked_at = now()`, crear uno nuevo, emitir par `{access, refresh}`.
- **Por qué**: RN-AU04 + RN-AU05. `FOR UPDATE` evita carreras donde dos requests concurrentes con el mismo refresh emiten dos pares válidos.

### 4. Rate limiting con `slowapi` (in-memory)
- **Qué**: `Limiter(key_func=get_remote_address)` montado en `app/main.py`. En el router de auth: `@limiter.limit("5/15minutes")` en `login`, `@limiter.limit("3/1hour")` en `register`.
- **Alternativa**: Redis. Fuera de alcance para esta change; slowapi in-memory alcanza para una sola instancia de uvicorn dev/eval.
- **Por qué**: RN-AU06, US-002, US-073 (sólo login+register). Si más adelante se escala, cambiar `key_func`/backend sin tocar servicios.

### 5. Respuesta neutral ante credenciales inválidas
- **Qué**: `/auth/login` retorna 401 con mismo `detail` ("Credenciales inválidas") tanto si el email no existe como si la contraseña es incorrecta. Además siempre se ejecuta `verify_password` contra un hash dummy cuando el usuario no existe, para evitar timing leak.
- **Por qué**: RN-AU08.

### 6. Registro siempre como CLIENT, sin aceptar `rol` del body
- **Qué**: el schema `RegisterRequest` no contiene campo `rol`. El servicio inyecta la asociación `(usuario_id, rol_id=CLIENT_ID)` después de crear el usuario.
- **Por qué**: RN-AU07. Defensa en profundidad frente a mass assignment.

### 7. `UnitOfWork` pasa a exponer repositorios
- **Qué**: en `__aenter__`, instanciar `self.usuarios = UsuarioRepository(self.session)`, `self.roles = RolRepository(self.session)`, `self.refresh_tokens = RefreshTokenRepository(self.session)`.
- **Por qué**: que los servicios reciban `uow` y naveguen por atributos, tal como describe `Integrador.txt` §7 (patrones). Esto sienta el estándar que todas las changes siguientes copiarán.

### 8. `get_current_user` lee el usuario con roles eager-loaded
- **Qué**: dependencia FastAPI que:
  1. extrae `Bearer <token>` (via `OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")`).
  2. decodifica el JWT; si falla → 401 con `code="TOKEN_INVALID"` (o `TOKEN_EXPIRED` si `ExpiredSignatureError`).
  3. abre una `UnitOfWork` y llama `uow.usuarios.get_with_roles(user_id)`; si no existe o tiene `deleted_at` → 401.
  4. retorna un DTO `CurrentUser(id, email, roles: list[str])`.
- **Por qué**: evita que cada handler re-consulte; `require_roles` recibe `CurrentUser` y valida la intersección.

### 9. `require_roles(*codigos)` como factory
- **Qué**: `def require_roles(*codigos: str) -> Callable[[CurrentUser], CurrentUser]`. Retorna una dependencia que lanza 403 si `set(user.roles) & set(codigos)` está vacío. Si no se pasan `codigos`, equivale a "sólo autenticado".
- **Por qué**: compone igual que en `Integrador.txt` §4.1 paso 5.

### 10. Frontend: `authStore` persiste sólo `accessToken`; usuario viene de `/auth/me`
- **Qué**: `persist({ partialize: s => ({ accessToken: s.accessToken }) })`. En el bootstrap de la app, si hay `accessToken`, se dispara `useMe()` (TanStack Query) para hidratar `user` y `roles`. Si `/me` retorna 401, se ejecuta `logout()`.
- **Alternativa**: persistir también `user`. Se evita porque quedaría desactualizado si el admin cambia roles; el server es la verdad.
- **Por qué**: `Integrador.txt` §7.1 y CLAUDE.md.

### 11. Interceptor Axios con cola singleton
- **Qué**: una sola promesa `refreshPromise: Promise<string> | null`. Al recibir 401:
  - si el request era `/auth/refresh` o `/auth/login` → no reintentar, hacer logout y rechazar.
  - si `refreshPromise == null` → dispararla (`POST /auth/refresh` con refresh_token leído de `localStorage` o del body previo — ver decisión 12).
  - si ya existe → encolar y esperar; al resolver, reintentar con nuevo token.
- **Por qué**: evita tormentas de refresh concurrentes (US-066).

### 12. Almacenamiento del refresh token en el cliente
- **Qué**: MVP → `localStorage` bajo clave `food-store-refresh`. Documentado en README y en la tarea que lo implementa; migración futura a cookie httpOnly queda como deuda.
- **Alternativa**: cookie `Set-Cookie: HttpOnly; Secure; SameSite=Strict` emitida por `/auth/login`. Requiere CORS `credentials: true` y cambios de despliegue (HTTPS obligatorio). Se deja fuera por alcance.
- **Por qué**: desbloquear US-001..US-004 sin romper el esqueleto Vite dev. Queda registrado como riesgo.

## Risks / Trade-offs

- **Refresh token en `localStorage` → vulnerable a XSS** → mitigación: CSP estricta en Vite/Nginx, sanitizar todo input renderizado, plan de migración a httpOnly cookie como deuda técnica en un change posterior.
- **Rate limit in-memory no comparte estado entre workers** → mitigación: arrancar uvicorn con `--workers 1` durante el MVP; documentar que producción requiere backend Redis para slowapi.
- **Defensa de timing en `/login` depende de ejecutar bcrypt siempre** → mitigación: el service invoca `verify_password(plain, DUMMY_HASH)` cuando el usuario no existe, descartando el resultado.
- **Concurrent refresh puede duplicar tokens** → mitigación: `SELECT ... FOR UPDATE` sobre `refresh_token` en la transacción de rotación (decisión 3) + una sola promesa singleton en el cliente (decisión 11).
- **SECRET_KEY débil haría inútil toda la capa** → mitigación: validar en `config.py` que `len(SECRET_KEY) >= 32`; falla el arranque si no.
- **Bcrypt cost 12 añade ~250ms por login** → aceptado; rate limit y UX de login no lo sienten.
- **El access token sobrevive al logout hasta su `exp`** → aceptado por diseño stateless (nota en US-004 criterio 2); si se necesita revocación inmediata se agregará blacklist en una change futura.

## Migration Plan

Greenfield: no hay versión previa. Pasos de despliegue:
1. Actualizar `backend/requirements.txt` con `passlib[bcrypt]`, `python-jose[cryptography]`, `slowapi`, `email-validator` (si faltan).
2. `alembic revision --autogenerate -m "initial: rol, usuario, usuario_rol, refresh_token"` (modelos SQLModel ya detectables); revisar el diff antes de aplicar.
3. `alembic upgrade head`.
4. `python -m app.db.seed` — inserta roles (IDs fijos 1..4) y admin.
5. `uvicorn app.main:app --reload` — verificar `/docs`.
6. Probar flujo manual: register → login → me → refresh → logout.

Rollback: `alembic downgrade -1` devuelve el esquema vacío; dado que no había usuarios productivos, es seguro.

## Open Questions

- **¿Dónde debe residir `CurrentUser`?** Propuesta: `app/core/deps.py` junto a las dependencias. Decidir durante apply si se extrae a `app/core/schemas.py`.
- **¿`/auth/refresh` requiere Authorization header además del body?** Decisión: NO. El refresh token del body es suficiente; exigir access header rompe el caso "access ya expirado".
- **¿Se acepta loguear el `email` en JWT además de `sub`?** Sí (lo pide `Integrador.txt` §6 TokenResponse/UserResponse), asumiendo PII mínima.
