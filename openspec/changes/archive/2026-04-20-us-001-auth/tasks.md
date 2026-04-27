## 1. Configuración base y dependencias

- [x] 1.1 Revisar `backend/requirements.txt` y agregar si faltan: `passlib[bcrypt]`, `python-jose[cryptography]`, `slowapi`, `email-validator`, `pydantic[email]`.
- [x] 1.2 Confirmar en `backend/app/core/config.py` que existen y se validan `SECRET_KEY` (len >= 32), `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `CORS_ORIGINS`. Agregar validator que falle el arranque si `SECRET_KEY` es débil.
- [x] 1.3 Crear/completar `backend/.env.example` con las variables auth (`SECRET_KEY`, `ALGORITHM=HS256`, `ACCESS_TOKEN_EXPIRE_MINUTES=30`, `REFRESH_TOKEN_EXPIRE_DAYS=7`).

## 2. Migración y semilla

- [x] 2.1 Verificar que `backend/app/db/` incluye todos los modelos en el metadata de Alembic (`env.py` importa `rol`, `usuario`, `usuario_rol`, `refresh_token`).
- [x] 2.2 Generar migración inicial: `alembic revision --autogenerate -m "initial: rol, usuario, usuario_rol, refresh_token"`. Revisar el diff y confirmar índices (`ix_usuario_email`, UNIQUE en `refresh_token.token_hash`, PK compuesta en `usuario_rol`).
- [x] 2.3 Aplicar migración: `alembic upgrade head`.
- [x] 2.4 Crear `backend/app/db/seed.py` con función `async def seed()` que upsertea los 4 roles (IDs fijos 1..4) por `codigo` y crea el admin `admin@foodstore.com / Admin1234!` con rol ADMIN. Idempotente.
- [ ] 2.5 Ejecutar `python -m app.db.seed` y verificar filas esperadas en `rol`, `usuario`, `usuario_rol`.

## 3. Core: security, deps, UoW

- [x] 3.1 Ampliar `backend/app/core/security.py`: agregar `create_refresh_token() -> str` (UUID v4), `hash_refresh_token(token: str) -> str` (SHA-256 hex), incluir claims `type="access"`, `iat`, `email`, `roles` en `create_access_token`, manejar `JWTError` y `ExpiredSignatureError` en `decode_access_token`.
- [x] 3.2 Crear `backend/app/core/deps.py` con `CurrentUser` (Pydantic BaseModel: `id`, `email`, `roles: list[str]`), `get_current_user` (OAuth2PasswordBearer, decode, consulta `uow.usuarios.get_with_roles`, filtra soft-deleted, valida `type == "access"`), y factory `require_roles(*codigos: str)`.
- [x] 3.3 Actualizar `backend/app/core/uow.py` para instanciar en `__aenter__`: `self.usuarios = UsuarioRepository(self.session)`, `self.roles = RolRepository(self.session)`, `self.refresh_tokens = RefreshTokenRepository(self.session)`.

## 4. Módulo usuarios (repositorio y servicio)

- [x] 4.1 Crear `backend/app/modules/usuarios/schemas.py` con `RegisterRequest`, `UserResponse`, `UserUpdate` (Pydantic v2, `EmailStr`, validadores min_length password=8, nombre/apellido min=2 max=80).
- [x] 4.2 Crear `backend/app/modules/usuarios/repository.py` con `UsuarioRepository(BaseRepository[Usuario])`: `get_by_email`, `get_with_roles` (usar `selectinload`), `email_exists`, todas filtrando `deleted_at IS NULL`.
- [x] 4.3 Crear `RolRepository(BaseRepository[Rol])` en el mismo módulo o en `usuarios/repository.py`: `get_by_codigo`.
- [x] 4.4 Crear `backend/app/modules/usuarios/service.py` con `crear_cliente(uow, data) -> Usuario` (lanza 409 si email existe, hashea password, crea `Usuario` + `UsuarioRol(CLIENT)`), `get_user_response(uow, usuario_id) -> UserResponse`.

## 5. Módulo refreshtokens (repositorio y servicio)

- [x] 5.1 Crear `backend/app/modules/refreshtokens/schemas.py` con `RefreshRequest` y `LogoutRequest` (ambos con `refresh_token: str`).
- [x] 5.2 Crear `backend/app/modules/refreshtokens/repository.py` con `RefreshTokenRepository(BaseRepository[RefreshToken])`: `create(usuario_id, token_uuid, expires_at)`, `get_by_token(token_uuid)`, `revoke(token)`, `revoke_all_for_user(usuario_id)`.
- [x] 5.3 Crear `backend/app/modules/refreshtokens/service.py` con `emit_pair(uow, usuario: Usuario) -> tuple[str, str]` (crea refresh en BD + access token con claims) y `rotate(uow, token_uuid) -> tuple[str, str, Usuario]` (flujo completo con detección de replay según decisión 3 del design).

## 6. Módulo auth (schemas, service, router)

- [x] 6.1 Crear `backend/app/modules/auth/schemas.py` con `LoginRequest`, `TokenResponse` (`access_token, refresh_token, token_type="bearer", expires_in`), importar `RegisterRequest` y `UserResponse` desde `usuarios.schemas`.
- [x] 6.2 Crear `backend/app/modules/auth/service.py` con: `register(uow, data) -> TokenResponse`, `login(uow, data) -> TokenResponse` (verifica password con hash dummy si no existe el email, respuesta neutral), `refresh(uow, token) -> TokenResponse` (delega a `refreshtokens.service.rotate`), `logout(uow, token, current_user) -> None` (revoca sólo ese token, idempotente).
- [x] 6.3 Configurar `slowapi.Limiter(key_func=get_remote_address)` en `backend/app/main.py` y exponerlo como `app.state.limiter`. Registrar `SlowAPIMiddleware` y handler de `RateLimitExceeded` que retorna 429 con header `Retry-After` y `code="RATE_LIMIT_EXCEEDED"`.
- [x] 6.4 Crear `backend/app/modules/auth/router.py` con `APIRouter(prefix="/auth", tags=["auth"])` y los 5 endpoints: `POST /register` (201, rate limit 3/1h), `POST /login` (200, rate limit 5/15min), `POST /refresh` (200), `POST /logout` (204, protegido), `GET /me` (200, protegido). Cada handler abre `async with UnitOfWork() as uow` y delega al service.
- [x] 6.5 Montar el router en `backend/app/main.py` bajo el prefijo `/api/v1`: `app.include_router(auth_router, prefix="/api/v1")`.

## 7. Tests backend

- [x] 7.1 Crear `backend/tests/conftest.py` con fixtures: BD de tests (SQLite async o Postgres dedicado), client `httpx.AsyncClient`, fixture `seed_roles`, fixture `registered_user`.
- [x] 7.2 Crear `backend/tests/test_auth_register.py` cubriendo los 5 scenarios de `auth/spec.md → Registro`.
- [x] 7.3 Crear `backend/tests/test_auth_login.py` cubriendo los 5 scenarios de Login (incluye test de respuesta neutral y test de rate limit que simula 6 intentos).
- [x] 7.4 Crear `backend/tests/test_auth_refresh.py` cubriendo los 4 scenarios (válido, expirado, inexistente, replay con revocación masiva).
- [x] 7.5 Crear `backend/tests/test_auth_logout.py` y `backend/tests/test_auth_me.py` cubriendo sus scenarios.
- [x] 7.6 Crear `backend/tests/test_deps.py` verificando `get_current_user` (sin token, token inválido, token expirado, token `type="refresh"`, usuario soft-deleted) y `require_roles` (rol suficiente, insuficiente, sin argumentos).
- [ ] 7.7 Correr `pytest -v` y alcanzar >= 80% cobertura en `app/modules/auth`, `app/modules/usuarios`, `app/modules/refreshtokens`, `app/core/{security,deps,uow}.py`.

## 8. Frontend: store, cliente HTTP, hooks

- [x] 8.1 Crear `frontend/src/store/authStore.ts` con Zustand + `persist({ partialize: s => ({ accessToken: s.accessToken }) })`. Estado: `accessToken: string | null`, acciones `setAccessToken`, `clearAuth`. Clave: `"food-store-auth"`.
- [x] 8.2 Crear `frontend/src/features/auth/types.ts` con tipos `LoginRequest`, `RegisterRequest`, `TokenResponse`, `User`.
- [x] 8.3 Crear `frontend/src/api/axiosClient.ts`: baseURL desde `VITE_API_URL`, interceptor request (lee `useAuthStore.getState().accessToken` y setea `Authorization: Bearer ...`), interceptor response que intercepta 401 y dispara refresh con cola singleton (ver decisión 11 del design). Si el refresh falla, `clearAuth()` y `window.location.href = "/login"`.
- [x] 8.4 Crear `frontend/src/features/auth/api/authApi.ts` con funciones `register`, `login`, `refresh`, `logout`, `me` que usan `axiosClient`.
- [x] 8.5 Crear hooks en `frontend/src/features/auth/hooks/`: `useLogin` (useMutation, en success guarda token y refresh en store/localStorage y setea query `me`), `useRegister` (análogo), `useLogout` (mutation que llama backend y limpia estado), `useMe` (useQuery con `enabled = !!accessToken`).
- [x] 8.6 Crear `frontend/src/features/auth/components/RequireAuth.tsx` que lee `accessToken`, dispara `useMe()` si existe; mientras carga muestra loader; si no hay token o `/me` retorna 401 redirige a `/login`.

## 9. Frontend: páginas y wiring

- [x] 9.1 Crear `frontend/src/features/auth/pages/LoginPage.tsx` con formulario TanStack Form (email + password, validación client-side min 8 chars), integra `useLogin`, muestra errores (`code === "INVALID_CREDENTIALS"`, `code === "RATE_LIMIT_EXCEEDED"` con mensaje de reintento).
- [x] 9.2 Crear `frontend/src/features/auth/pages/RegisterPage.tsx` con formulario (nombre, apellido, email, password, confirmPassword), validaciones, integra `useRegister`, navega a home tras éxito. Maneja `code === "EMAIL_ALREADY_EXISTS"`.
- [x] 9.3 Registrar rutas en el router principal del frontend: `/login` (público), `/register` (público), y envolver rutas privadas futuras con `<RequireAuth>`.
- [x] 9.4 Agregar botón Logout en un header mínimo que llama `useLogout`.

## 10. Tests frontend

- [x] 10.1 Configurar Vitest + Testing Library si no está (`npm i -D vitest @testing-library/react @testing-library/jest-dom msw`).
- [x] 10.2 Tests de `authStore`: persistencia del accessToken tras reload simulado, `clearAuth()` limpia localStorage.
- [x] 10.3 Tests del interceptor: 401 dispara refresh y reintenta; dos requests 401 concurrentes comparten la misma promesa de refresh.
- [x] 10.4 Tests de `LoginPage` y `RegisterPage`: render, validación, submit feliz y manejo de errores (mockear red con MSW).

## 11. Verificación end-to-end manual

- [ ] 11.1 Arrancar backend (`uvicorn app.main:app --reload`) y frontend (`npm run dev`).
- [ ] 11.2 Flujo manual en el browser: registrarse → recibir tokens → recargar (usuario rehidratado vía `/me`) → refresh automático (forzar access expirado) → logout → intentar rutas protegidas devuelve 401.
- [ ] 11.3 Verificar en `/docs` (Swagger) que los 5 endpoints de auth están listados con schemas correctos y que `/me`, `/logout` muestran el candado (requieren Bearer).
- [ ] 11.4 Verificar en la BD: tras login hay una fila en `refresh_token`; tras logout esa fila tiene `revoked_at != NULL`; tras refresh hay una fila nueva activa y la vieja revocada.

> NOTA: Routes confirmed via automated check: /api/v1/auth/{register,login,refresh,logout,me} all registered.

## 12. Cierre

- [x] 12.1 Actualizar `README.md` con sección "Auth" describiendo los 5 endpoints y el flujo de refresh.
- [ ] 12.2 Commit convencional: `feat(auth): implement register, login, refresh rotation, logout and /me with RBAC deps` y push.
- [ ] 12.3 Correr `openspec status --change us-001-auth` y confirmar que todos los artifacts figuran como `done` y la change está lista para `/opsx:archive`.
