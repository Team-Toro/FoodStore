## Why

Food Store es un greenfield: el módulo `backend/app/modules/auth/` está vacío y no existe ningún endpoint de autenticación. Sin auth no se puede avanzar con ninguna historia posterior (catálogo admin, carrito persistente, pedidos, pagos) porque todas dependen de identificar al usuario, aplicar RBAC y proteger rutas. Esta change entrega el piso mínimo seguro — registro, login, refresh, logout y `/me` — alineado a US-001..US-005 y a las reglas RN-AU01..RN-AU08 del documento Integrador.

## What Changes

- Implementar el módulo `auth` backend completo: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- Implementar hashing de contraseñas con bcrypt (cost factor ≥ 12) vía Passlib en `app/core/security.py` (ya existe parcialmente — completar con utilidades de refresh token).
- Implementar emisión y validación de JWT HS256 con claims `sub` (user id), `email`, `roles`, `exp`, `iat`, `type` (`access`).
- Persistir refresh tokens como `SHA-256(token_uuid_v4)` en la tabla `refresh_token` con `expires_at` y `revoked_at` (modelo ya existe).
- Implementar rotación de refresh token en `/auth/refresh`: revocar el anterior y emitir uno nuevo en la misma transacción.
- Detectar replay attack: si llega un refresh token con `revoked_at != NULL`, revocar TODOS los refresh tokens activos del usuario y retornar 401 (RN-AU05).
- Implementar rate limiting con `slowapi`: 5 intentos / 15 min por IP en `/auth/login` y 3 registros / 1 h por IP en `/auth/register`.
- Completar módulo `usuarios` backend con repository + service para consultas por email/id y para reconstruir el usuario autenticado (`GET /auth/me`).
- Completar módulo `refreshtokens` backend con repository para buscar por hash, crear, revocar individual y revocar por usuario.
- Agregar dependencias FastAPI reutilizables en `app/core/deps.py`: `get_current_user`, `require_roles(*codigos)`.
- Registrar repositorios (`usuarios`, `refreshtokens`) en `UnitOfWork` y montar el router de auth en `app/main.py`.
- Migración Alembic inicial que materialice las tablas `rol`, `usuario`, `usuario_rol`, `refresh_token` (los modelos SQLModel ya existen pero no hay migración aún).
- Semilla (`python -m app.db.seed`) que inserta los 4 roles fijos (ADMIN=1, STOCK=2, PEDIDOS=3, CLIENT=4) y el usuario admin `admin@foodstore.com / Admin1234!` con rol ADMIN (RN-RB01).
- Frontend: implementar feature `auth` mínima bajo FSD — tipos, API client, hooks `useLogin/useRegister/useLogout/useMe`, `authStore` (Zustand) persistiendo sólo `accessToken`, interceptor Axios con cola de reintentos y refresh automático, páginas `/login` y `/register`, guard `RequireAuth`.

## Capabilities

### New Capabilities
- `auth`: endpoints de registro, login, refresh con rotación y detección de replay, logout, `/me`, rate limiting en login/register.
- `authz`: RBAC con 4 roles fijos, dependencia `get_current_user`, factory `require_roles(*codigos)` y convenciones de protección de rutas (401 sin token, 403 rol insuficiente, rutas públicas catálogo/login/register).
- `usuarios`: persistencia y lectura de `Usuario` + `UsuarioRol` usados por `auth` (crear usuario con rol CLIENT por defecto, buscar por email, recuperar usuario con sus roles).
- `refresh-tokens`: persistencia de refresh tokens como hash SHA-256 con expiración, revocación individual y revocación masiva por usuario ante replay.

### Modified Capabilities
- (ninguna — `openspec/specs/` está vacío; todas las capabilities se crean desde cero)

## Impact

- **Backend código**:
  - `app/modules/auth/{schemas,repository,service,router}.py` — nuevos.
  - `app/modules/usuarios/{schemas,repository,service,router}.py` — nuevos (router mínimo, sólo `/me` vive en auth).
  - `app/modules/refreshtokens/{schemas,repository,service}.py` — nuevos.
  - `app/core/security.py` — ampliar: `create_refresh_token`, `hash_refresh_token`, `decode_access_token` con manejo de `JWTError`, claims estándar.
  - `app/core/deps.py` — nuevo: `get_current_user`, `require_roles`.
  - `app/core/uow.py` — registrar `self.usuarios`, `self.roles`, `self.refresh_tokens`.
  - `app/main.py` — registrar `slowapi Limiter` y router de auth.
  - `app/db/seed.py` — nuevo: semilla de roles + admin.
  - `alembic/versions/xxxx_initial.py` — primera migración con `rol`, `usuario`, `usuario_rol`, `refresh_token`.
  - `requirements.txt` — agregar/confirmar `passlib[bcrypt]`, `python-jose[cryptography]`, `slowapi`, `email-validator`.
- **Frontend código** (FSD):
  - `src/features/auth/api/authApi.ts`, `types.ts`, `hooks/{useLogin,useRegister,useLogout,useMe}.ts`.
  - `src/features/auth/pages/{LoginPage,RegisterPage}.tsx`.
  - `src/features/auth/components/RequireAuth.tsx`.
  - `src/store/authStore.ts` — Zustand con `persist` (sólo `accessToken`).
  - `src/api/axiosClient.ts` — interceptor request (Authorization) + response (401 → refresh con queue singleton).
- **Base de datos**: primera migración; tablas `rol`, `usuario`, `usuario_rol`, `refresh_token`; semilla obligatoria antes del primer arranque.
- **Variables de entorno**: `SECRET_KEY`, `ALGORITHM=HS256`, `ACCESS_TOKEN_EXPIRE_MINUTES=30`, `REFRESH_TOKEN_EXPIRE_DAYS=7`, `CORS_ORIGINS`.
- **Dependencias desbloqueadas**: toda historia que requiera `get_current_user` o `require_roles` (US-006, US-007+ admin, US-029 carrito server-side, US-040+ pedidos, etc.).
- **No-BREAKING**: es la primera implementación de auth; no rompe contratos porque no había ninguno.
