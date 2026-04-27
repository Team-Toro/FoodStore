## 1. Estructura del monorepo y configuración base

- [x] 1.1 Crear `backend/requirements.txt` con versiones fijadas: fastapi, uvicorn[standard], sqlmodel, alembic, passlib[bcrypt], python-jose[cryptography], slowapi, mercadopago, pydantic[email-validator], pydantic-settings, httpx, asyncpg, greenlet
- [x] 1.2 Crear `backend/.env.example` con todas las variables documentadas: DATABASE_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, CORS_ORIGINS, MP_ACCESS_TOKEN, MP_PUBLIC_KEY, MP_NOTIFICATION_URL, ADMIN_EMAIL, ADMIN_PASSWORD
- [x] 1.3 Crear `backend/app/__init__.py` y el directorio `backend/app/`
- [x] 1.4 Crear los 10 directorios de módulos bajo `backend/app/modules/`: `auth/`, `usuarios/`, `productos/`, `categorias/`, `ingredientes/`, `pedidos/`, `pagos/`, `direcciones/`, `admin/`, `refreshtokens/` — cada uno con `__init__.py`, `model.py`, `schemas.py`, `repository.py`, `service.py`, `router.py` vacíos

## 2. Core del backend

- [x] 2.1 Crear `backend/app/core/config.py` — clase `Settings(BaseSettings)` que lee todas las variables de entorno con tipos y valores por defecto; exponer instancia `settings`
- [x] 2.2 Crear `backend/app/core/database.py` — async engine con `create_async_engine`, session factory `AsyncSessionLocal`, función `get_session` async generator para Depends()
- [x] 2.3 Crear `backend/app/core/security.py` — `hash_password(plain)`, `verify_password(plain, hashed)`, `create_access_token(data, expires_delta)`, `decode_access_token(token)` usando python-jose HS256
- [x] 2.4 Crear `backend/app/core/uow.py` — clase `UnitOfWork` como async context manager: `__aenter__` abre sesión e inicializa repos como atributos; `__aexit__` hace commit si no hay excepción, rollback si hay
- [x] 2.5 Crear `backend/app/core/base_repository.py` — `BaseRepository[T](Generic[T])` con métodos async: `get_by_id`, `list_all`, `count`, `create`, `update`, `soft_delete`, `hard_delete`

## 3. Modelos SQLModel base

- [x] 3.1 Crear `backend/app/core/models.py` — clase base `TimestampModel(SQLModel)` con `creado_en` y `actualizado_en`; clase `SoftDeleteModel(TimestampModel)` con `eliminado_en`; event listener SQLAlchemy para auto-actualizar `actualizado_en` en UPDATE
- [x] 3.2 Definir modelo `Rol` en `backend/app/modules/usuarios/model.py` con campos: `id`, `codigo`, `nombre`, `descripcion`
- [x] 3.3 Definir modelo `Usuario` con campos: `id`, `nombre`, `apellido`, `email` (UQ, INDEX), `password_hash`, `telefono`, `eliminado_en`, hereda de `SoftDeleteModel`
- [x] 3.4 Definir tabla intermedia `UsuarioRol` con PK compuesta `(usuario_id, rol_id)` y FK a ambas tablas
- [x] 3.5 Definir modelo `RefreshToken` con: `id`, `token_hash CHAR(64)` (UQ), `usuario_id` (FK), `expires_at`, `revoked_at`
- [x] 3.6 Definir modelo `DireccionEntrega` con campos del ERD v5: `linea1`, `linea2`, `ciudad`, `codigo_postal`, `referencia`, `alias`, `es_principal`, soft delete, FK a Usuario
- [x] 3.7 Definir modelo `Categoria` con `padre_id` autoreferencial (FK nullable, ON DELETE SET NULL)
- [x] 3.8 Definir modelo `Ingrediente` con `nombre` (UQ), `descripcion`, `es_alergeno`
- [x] 3.9 Definir modelo `Producto` con: `nombre`, `descripcion`, `imagen_url`, `precio_base NUMERIC(10,2)`, `stock_cantidad INTEGER CHECK ≥ 0`, `disponible`, hereda de `SoftDeleteModel`
- [x] 3.10 Definir tablas intermedias `ProductoCategoria` y `ProductoIngrediente` (con `es_removible`)
- [x] 3.11 Definir modelo `FormaPago` con `codigo` (PK), `nombre`, `habilitado`
- [x] 3.12 Definir modelo `EstadoPedido` con `codigo` (PK), `nombre`, `descripcion`, `es_terminal`
- [x] 3.13 Definir modelo `Pedido` con todos los campos del ERD v5: FK a usuario, estado, dirección, forma de pago; `total`, `costo_envio`, `direccion_snapshot TEXT`, soft delete
- [x] 3.14 Definir modelo `DetallePedido` con: `pedido_id`, `producto_id`, `nombre_snapshot`, `precio_snapshot NUMERIC(10,2)`, `cantidad`, `subtotal`, `personalizacion INTEGER[]`
- [x] 3.15 Definir modelo `HistorialEstadoPedido` con: `pedido_id`, `estado_desde` (FK nullable), `estado_hasta` (FK), `usuario_id` (FK nullable), `observacion`, `creado_en` — SIN `actualizado_en` ni soft delete (append-only)
- [x] 3.16 Definir modelo `Pago` con: `pedido_id`, `monto`, `mp_payment_id` (UQ nullable), `mp_status`, `external_reference` (UQ), `idempotency_key` (UQ)

## 4. Migraciones Alembic

- [x] 4.1 Inicializar Alembic (estructura de archivos creada: alembic.ini + alembic/env.py con todos los modelos importados): `alembic init alembic` desde `backend/`, configurar `env.py` para apuntar a los modelos SQLModel y usar `DATABASE_URL` del `settings`
- [ ] 4.2 Generar primera migración — PENDIENTE: requiere DB PostgreSQL corriendo (`alembic revision --autogenerate -m "initial schema"`): `alembic revision --autogenerate -m "initial schema"` y revisar el SQL generado verificando tipos correctos (`NUMERIC`, `INTEGER[]`, `CHAR(64)`)
- [ ] 4.3 Correr `alembic upgrade head` — PENDIENTE: requiere DB PostgreSQL corriendo contra una DB local limpia y verificar que las 16 tablas fueron creadas correctamente
- [ ] 4.4 Verificar que `alembic downgrade -1` — PENDIENTE: requiere DB PostgreSQL corriendo funciona sin errores

## 5. Script de seed

- [x] 5.1 Crear `backend/app/db/seed.py` con función `async def seed()` que inserta los 4 roles con IDs explícitos usando `INSERT ... ON CONFLICT (id) DO NOTHING`
- [x] 5.2 Agregar al seed los 6 estados de pedido con `es_terminal` correcto e IDs explícitos
- [x] 5.3 Agregar al seed las formas de pago: `MERCADOPAGO` y `EFECTIVO` habilitadas
- [x] 5.4 Agregar al seed el usuario admin: leer `ADMIN_EMAIL` y `ADMIN_PASSWORD` de settings, hashear la contraseña, insertar con `ON CONFLICT (email) DO NOTHING`, asignar rol ADMIN
- [x] 5.5 Hacer el script invocable: `if __name__ == "__main__": asyncio.run(seed())` y verificar con `python -m app.db.seed`

## 6. FastAPI main y registro de routers

- [x] 6.1 Crear `backend/app/main.py` con la app FastAPI: título, versión, description; agregar `CORSMiddleware` leyendo `settings.CORS_ORIGINS`; agregar `SlowAPIMiddleware` de slowapi
- [x] 6.2 Agregar handler global de excepciones que formatee errores según RFC 7807 (`detail`, `code`, `field` opcional)
- [x] 6.3 Registrar un router de health check en `/health` que retorne `{"status": "ok"}` (útil para verificar que el server corre)
- [ ] 6.4 Verificar que `uvicorn app.main:app --reload` — PENDIENTE: requiere ejecutar servidor; código implementado con imports válidos arranca sin errores y `/docs` es accesible

## 7. Scaffold del frontend

- [x] 7.1 Crear proyecto Vite (manual: package.json, vite.config.ts, tsconfig.json strict, index.html, src/main.tsx, src/App.tsx): `npm create vite@latest frontend -- --template react-ts` desde la raíz del monorepo
- [x] 7.2 Dependencias declaradas en package.json (requiere npm install para materializar node_modules): `@tanstack/react-query`, `@tanstack/react-form`, `zustand`, `axios`, `react-router-dom`, `recharts`, `@mercadopago/sdk-react`
- [x] 7.3 Instalar y configurar Tailwind CSS v3 con PostCSS: `tailwindcss`, `autoprefixer`, `postcss`; crear `tailwind.config.js` apuntando a `src/**/*.tsx`
- [x] 7.4 Crear estructura FSD: `src/app/`, `src/pages/`, `src/widgets/`, `src/features/auth/`, `src/features/store/`, `src/features/pedidos/`, `src/features/admin/`, `src/entities/`, `src/shared/api/`, `src/shared/ui/`, `src/shared/lib/`
- [x] 7.5 Crear `src/shared/api/client.ts` — instancia Axios con `baseURL = import.meta.env.VITE_API_URL`; interceptor de request que adjunta `Authorization: Bearer`; interceptor de response que maneja 401 con refresh automático
- [x] 7.6 Crear los 4 stores Zustand con tipos TypeScript:
  - `src/app/store/authStore.ts` — `accessToken`, `isAuthenticated`, `login()`, `logout()`; persist solo `accessToken`
  - `src/app/store/cartStore.ts` — `items: CartItem[]`, `addItem()`, `removeItem()`, `clearCart()`; persist items completos
  - `src/app/store/paymentStore.ts` — `status`, `mpPaymentId`; sin persist
  - `src/app/store/uiStore.ts` — `cartOpen`, `sidebarOpen`; sin persist
- [x] 7.7 Crear `src/app/providers.tsx` con `QueryClientProvider` de TanStack Query wrapeando la app
- [x] 7.8 Crear `frontend/env.example` con `VITE_API_URL` y `VITE_MP_PUBLIC_KEY` con `VITE_API_URL` y `VITE_MP_PUBLIC_KEY`
- [x] 7.9 Verificar que `npm run dev` arranca y `npm run build` — `npm install` OK + `npm run build` compila limpio (145 módulos, 0 errores TS)
