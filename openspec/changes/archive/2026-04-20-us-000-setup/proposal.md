## Why

El repositorio está vacío — no existe ninguna estructura de código, configuración ni base de datos. Sin este sprint 0, ninguna historia de usuario posterior puede implementarse. Es la fundación obligatoria.

## What Changes

- Scaffolding del monorepo con carpetas `/backend` y `/frontend` separadas
- Estructura feature-first del backend: 10 módulos (`auth`, `usuarios`, `productos`, `categorias`, `ingredientes`, `pedidos`, `pagos`, `direcciones`, `admin`, `refreshtokens`), cada uno con `model.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`
- Estructura Feature-Sliced Design del frontend: `app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`
- Configuración FastAPI: `main.py` con CORS, rate limiting, registro de routers bajo prefijo `/api/v1`
- Módulo `core/`: `config.py` (variables de entorno), `database.py` (engine + session), `security.py` (bcrypt + JWT), `uow.py` (Unit of Work), `base_repository.py` (genérico)
- Configuración Alembic + 1 migración inicial con todas las tablas del ERD v5
- Script de seed idempotente: 4 roles, 6 estados de pedido, formas de pago, usuario admin
- `requirements.txt` con versiones fijadas
- `package.json` + `vite.config.ts` + `tsconfig.json` con `strict: true`
- `.gitignore`, `.env.example` para backend y frontend

## Capabilities

### New Capabilities

- `backend-core`: Infraestructura transversal del backend — configuración, sesión de BD, UoW, BaseRepository, seguridad JWT/bcrypt
- `database-schema`: Esquema completo PostgreSQL (ERD v5) vía Alembic: todas las tablas, constraints, índices, soft delete, audit fields
- `seed-data`: Script idempotente que carga datos catálogo obligatorios (roles, estados, formas de pago, admin)
- `frontend-scaffold`: Estructura FSD del frontend con Vite + TypeScript strict, dependencias instaladas, Axios configurado

### Modified Capabilities

_(ninguna — proyecto greenfield)_

## Impact

- Crea todos los archivos de configuración base que los sprints posteriores extienden
- La migración de Alembic debe correrse antes de cualquier arranque del backend
- El seed debe correrse después de la migración — sin él el sistema no tiene roles ni estados de pedido
- El `core/uow.py` y `core/base_repository.py` son dependencias de todos los módulos funcionales
