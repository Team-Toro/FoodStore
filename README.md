# Food Store — Repositorio Base

Sistema de e-commerce de productos alimenticios desarrollado con **Spec-Driven Development (SDD)** usando OPSX y Claude Code.

---

## Documentación del sistema

Antes de escribir una línea de código, leé los tres documentos en `docs/`:

| Archivo | Contenido |
|---------|-----------|
| `docs/Descripcion.txt` | Visión general, actores del sistema y stack tecnológico |
| `docs/Integrador.txt` | Arquitectura en capas, ERD, API REST y patrones de diseño |
| `docs/Historias_de_usuario.txt` | US-000 a US-076 con criterios de aceptación y reglas de negocio |

Estos documentos son la fuente de verdad del sistema. El agente los lee antes de cada propuesta.

---

## Stack tecnológico

**Backend**: FastAPI · SQLModel · PostgreSQL · Alembic · bcrypt · python-jose · slowapi · MercadoPago SDK  
**Frontend**: React · TypeScript · Vite · TanStack Query · TanStack Form · Zustand · Axios · Tailwind CSS · Recharts

---

## Setup del entorno de desarrollo

### Requisitos previos
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Claude Code: `npm install -g @anthropic-ai/claude-code`
- OpenSpec CLI: `npm install -g @fission-ai/openspec`

### 1. Clonar e inicializar

```bash
git clone <url-del-repo> food-store
cd food-store
```

### 2. Inicializar OpenSpec

```bash
npx @fission-ai/openspec@latest init
```

Esto genera la carpeta `openspec/` donde van a vivir todos los artefactos del proyecto.

### 3. Backend

```bash
cd backend
cp .env.example .env
# Completar las variables de entorno en .env

python -m venv .venv
source .venv/bin/activate   # Linux/Mac
.venv\Scripts\activate      # Windows

pip install -r requirements.txt
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload
```

API disponible en `http://localhost:8000`  
Documentación Swagger en `http://localhost:8000/docs`

### 4. Frontend

```bash
cd frontend
cp .env.example .env
# Completar VITE_API_URL=http://localhost:8000

npm install
npm run dev
```

App disponible en `http://localhost:5173`

---

## Flujo de desarrollo con OPSX

Todo cambio al sistema sigue este ciclo:

```
/opsx:explore   →  pensar antes de comprometerse (opcional)
/opsx:propose   →  generar propuesta + diseño + tareas
/opsx:apply     →  implementar tarea por tarea
/opsx:archive   →  sincronizar specs y cerrar el change
```

### Orden de implementación

```
us-000-setup               ← infraestructura base (Sprint 0)
us-001-auth                ← JWT · RBAC · refresh tokens
us-002-categorias          ← catálogo jerárquico
us-003-productos           ← CRUD · stock · ingredientes
us-004-carrito             ← estado client-side con Zustand
us-005-pedidos             ← UoW · FSM · audit trail
us-006-pagos-mercadopago   ← checkout · webhooks IPN
us-007-admin               ← panel · métricas
us-008-direcciones         ← direcciones de entrega
```

---

## Variables de entorno

Crear `backend/.env` a partir de `backend/.env.example`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/foodstore
SECRET_KEY=tu-clave-secreta-de-64-caracteres-minimo
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
MP_ACCESS_TOKEN=TEST-tu-token-de-mercadopago
MP_PUBLIC_KEY=TEST-tu-public-key-de-mercadopago
CORS_ORIGINS=http://localhost:5173
```

Crear `frontend/.env` a partir de `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:8000
VITE_MP_PUBLIC_KEY=TEST-tu-public-key-de-mercadopago
```

---

## Auth — us-001-auth

### Endpoints implementados

| Método | Ruta | Auth | Rate limit | Descripción |
|--------|------|------|------------|-------------|
| POST | `/api/v1/auth/register` | No | 3/hora | Crea cuenta CLIENT y retorna token pair |
| POST | `/api/v1/auth/login` | No | 5/15 min | Valida credenciales y retorna token pair |
| POST | `/api/v1/auth/refresh` | No | — | Rota refresh token, retorna nuevo par |
| POST | `/api/v1/auth/logout` | Bearer | — | Revoca refresh token (idempotente) |
| GET | `/api/v1/auth/me` | Bearer | — | Retorna perfil del usuario autenticado |

### Flujo de tokens

```
1. /register o /login → {access_token (JWT, 30 min), refresh_token (UUID v4, 7 días)}
2. Requests protegidos → Authorization: Bearer <access_token>
3. Access token expirado → POST /auth/refresh con {refresh_token}
   → nuevo par {access_token, refresh_token} + token anterior revocado
4. Logout → POST /auth/logout con {refresh_token} + Bearer
   → refresh_token revocado (access sigue válido hasta exp, diseño stateless)
5. Recarga de página → access_token desde localStorage → GET /auth/me rehidrata el usuario
```

### Seguridad

- Contraseñas: bcrypt con cost factor 12 (≥250ms intencional)
- Refresh token: almacenado como SHA-256(uuid) en BD; UUID enviado al cliente
- Replay attack: detectado en `/refresh`; revoca TODOS los tokens activos del usuario
- Timing attack: `/login` siempre ejecuta `verify_password` aunque el email no exista
- SECRET_KEY: validado al arranque — mínimo 32 caracteres

### Frontend — almacenamiento de tokens

| Token | Almacenamiento | Clave |
|-------|---------------|-------|
| access_token | Zustand (memoria) + localStorage | `food-store-auth` |
| refresh_token | localStorage | `food-store-refresh` |

> Nota: refresh token en localStorage es vulnerable a XSS. Migración a cookie httpOnly es deuda técnica documentada.

---

## Convenciones de commits

```
feat(modulo): descripción del cambio
fix(modulo): descripción del bug corregido
refactor(modulo): descripción del refactor
test(modulo): descripción de los tests
docs(modulo): descripción del cambio en docs
```
