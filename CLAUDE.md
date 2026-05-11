# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Food Store is a full-stack e-commerce system for food products. Backend: FastAPI + SQLModel + PostgreSQL + Alembic. Frontend: React + TypeScript + Vite + TanStack Query + TanStack Form + Zustand + Tailwind CSS + Recharts. Payment integration via MercadoPago Checkout API.

The project is **fully implemented** — all 9 user stories (us-000 → us-008) are complete and archived. Current focus: frontend redesign and UX improvements.

## Source of Truth

Before proposing or implementing anything, read:
- `docs/Descripcion.txt` — vision, actors, full tech stack details
- `docs/Integrador.txt` — ERD v5, layered architecture, FSM, API spec, Pydantic schemas, patterns
- `docs/Historias_de_usuario.txt` — US-000 to US-076 with acceptance criteria
- `CHANGES.md` — full changelog of everything implemented and all fixes applied

## Dev Commands

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Linux/Mac
.venv\Scripts\activate           # Windows

pip install -r requirements.txt
alembic upgrade head             # run migrations
python -m app.db.seed            # load seed data (required before first run)
uvicorn app.main:app --reload    # API at http://localhost:8000, docs at /docs
```

Single test:
```bash
pytest tests/test_pedidos.py::test_crear_pedido -v
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # App at http://localhost:5173
npm run build
npm run lint
```

## Backend Architecture

Strict unidirectional layered architecture per module. **No layer may import from a layer above it.**

```
Router → Service → Unit of Work → Repository → Model
```

| Layer | File | Responsibility |
|-------|------|----------------|
| Router | `router.py` | HTTP only: parse request, validate Pydantic schema, call service, return response. Zero business logic. |
| Service | `service.py` | All business logic. Stateless. Receives `uow` as parameter. Raises `HTTPException`. Never calls `session.commit()` directly. |
| Unit of Work | `app/core/uow.py` | Opens DB session, exposes repositories as attributes, auto-commits on success, auto-rollbacks on exception. Used as context manager. |
| Repository | `repository.py` | DB access only. Inherits from `BaseRepository[T]`. No business logic. Receives session from UoW via injection. |
| Model | `model.py` | SQLModel table definitions. No imports from upper layers. |

Code is organized **feature-first**:
```
app/modules/
├── auth/
├── refreshtokens/
├── usuarios/
├── direcciones/
├── categorias/
├── productos/
├── pedidos/
├── pagos/
└── admin/
```

Each module contains: `model.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`.

## Frontend Architecture

Feature-Sliced Design (FSD). Imports flow top-down only — never cross-feature imports.

```
Pages → Features → Hooks/Stores → API → Types
```

Features: `auth`, `store` (catalog + cart + checkout), `pedidos`, `admin`.

**Critical separation — never mix these:**
- **Zustand** = client-side state only: cart, auth session, payment flow, UI state
- **TanStack Query** = server state only: products, orders, dashboard data

### Zustand Stores

| Store | File | Persists |
|-------|------|----------|
| `authStore` | `store/authStore.ts` | Only `accessToken` — user reconstructed via `GET /api/v1/auth/me` on reload |
| `cartStore` | `store/cartStore.ts` | Full `items` array |
| `paymentStore` | `store/paymentStore.ts` | No |
| `uiStore` | `store/uiStore.ts` | No |

Always subscribe by slice: `useCartStore(s => s.itemCount())` — never `useCartStore()`.

Access stores outside React (Axios interceptors): `useAuthStore.getState().accessToken`.

## Key Domain Rules

### Order FSM (enforced in Service layer — never in Router)

| From | To | Who |
|------|----|-----|
| PENDIENTE | CONFIRMADO | System (webhook only — automatic on MP `approved`) |
| CONFIRMADO | EN_PREP | PEDIDOS / ADMIN |
| EN_PREP | EN_CAMINO | PEDIDOS / ADMIN |
| EN_CAMINO | ENTREGADO | PEDIDOS / ADMIN |
| PENDIENTE / CONFIRMADO | CANCELADO | CLIENT (own) / PEDIDOS / ADMIN |
| EN_PREP | CANCELADO | ADMIN only |

- `ENTREGADO` and `CANCELADO` are terminal (`es_terminal = true`) — no further transitions
- `motivo` is required when transitioning to CANCELADO (RN-05)
- `HistorialEstadoPedido` is **append-only** — never UPDATE or DELETE (RN-03)
- First history record always has `estado_desde = NULL` (RN-02)

### Snapshot Pattern

`DetallePedido.nombre_snapshot` and `DetallePedido.precio_snapshot` capture product name/price at order creation time. They are immutable. Do not reflect post-creation changes to the product.

### Stock

- Decremented atomically when order reaches CONFIRMADO
- Restored atomically if a CONFIRMADO order is cancelled
- Both operations must run inside the UoW transaction

## Data Model Highlights

- **Soft delete**: `deleted_at TIMESTAMPTZ` on all business entities. All GET queries filter `WHERE deleted_at IS NULL`.
- **Hierarchical categories**: `Categoria.parent_id` (self-referential FK). Query full tree with recursive CTEs.
- **Personalization**: `DetallePedido.personalizacion INTEGER[]` — array of ingredient IDs to exclude.
- **Idempotency**: `Pago.idempotency_key UUID` (unique) prevents duplicate payment processing from MP webhook retries.
- **RefreshToken**: stored as `SHA-256(token)` in `token_hash CHAR(64)`. `revoked_at NULL` = active.

## API Conventions

- All routes prefixed with `/api/v1`
- Errors follow RFC 7807: `{ "detail": "...", "code": "ERROR_CODE", "field": "optional" }`
- Pagination: `?page=1&size=20` → `{ "items": [...], "total": N, "page": 1, "size": 20, "pages": P }`
- Pydantic schemas: always define separate `Create`, `Update`, and `Read` variants. Never expose SQLModel models directly as responses.

## MercadoPago Integration

- Backend uses the official Python SDK. Always generate a UUID `idempotency_key` per payment.
- Frontend uses `@mercadopago/sdk-react` (`CardPayment` component). Card data is tokenized client-side — **never passes through Food Store's server** (PCI SAQ-A).
- Webhook endpoint (`POST /api/v1/pagos/webhook`) must respond HTTP 200 immediately, then process asynchronously to avoid MP retries.
- Always verify payment status by calling the MP API — never trust webhook payload alone.

Sandbox test cards:
- Approved: `4509 9535 6623 3704` / CVV `123` / exp `11/25`
- Rejected: `4000 0000 0000 0002` / CVV `123` / exp `11/25`

## Seed Data (Required)

`python -m app.db.seed` must run after every fresh migration. It loads:
- Roles: `ADMIN`, `STOCK`, `PEDIDOS`, `CLIENT`
- EstadoPedido: `PENDIENTE`, `CONFIRMADO`, `EN_PREP`, `EN_CAMINO`, `ENTREGADO`, `CANCELADO` (with `es_terminal`)
- FormaPago: `MERCADOPAGO`, `EFECTIVO`, `TRANSFERENCIA`
- Admin user: `admin@foodstore.com` / `Admin1234!` with role ADMIN

## Environment Variables

Backend (`backend/.env`):
```
DATABASE_URL=postgresql://user:pass@localhost:5432/foodstore_db
SECRET_KEY=your-super-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=["http://localhost:5173"]
MP_ACCESS_TOKEN=TEST-xxxx
MP_PUBLIC_KEY=TEST-xxxx
MP_NOTIFICATION_URL=https://domain.com/api/v1/pagos/webhook
```

Frontend (`frontend/.env`):
```
VITE_API_URL=http://localhost:8000
VITE_MP_PUBLIC_KEY=TEST-xxxx
```

## Implementation Order

All changes are complete and archived under `openspec/changes/archive/`.

```
us-000-setup → us-001-auth → us-002-categorias → us-003-productos →
us-004-carrito → us-005-pedidos → us-006-pagos-mercadopago →
us-007-admin → us-008-direcciones  ✓ all done
```

---

## Skills Reference

When to invoke each skill via the `Skill` tool. Skills are loaded automatically by context — this table tells you WHEN to trigger them explicitly.

### Frontend Skills

| Skill | Trigger it when... | NOT when... |
|-------|-------------------|-------------|
| `frontend-design` | Rediseñando o creando cualquier componente, página o layout. Mejoras visuales, e-commerce UI, landing pages. **Primera opción para cualquier trabajo de UI.** | El cambio es puramente lógico (hooks, stores, API calls) sin impacto visual. |
| `vercel-react-best-practices` | Revisando o refactorizando componentes React. Optimización de performance (re-renders, bundle, lazy loading). Cualquier duda sobre patrones modernos de React. | Trabajando en backend o en archivos de configuración. |
| `web-design-guidelines` | Auditando accesibilidad, revisando UX, verificando que una página sigue estándares de diseño web. Antes de dar por terminado un rediseño. | Implementación inicial — úsala para revisar, no para construir. |
| `tailwind-design-system` | Construyendo o estandarizando un design system con tokens, variables CSS, componentes con variantes (CVA). Referencia para patrones Tailwind avanzados. | Agregando clases Tailwind sueltas a un componente existente. |
| `dashboard-crud-page` | Creando o refactorizando cualquier página CRUD del admin (`/admin/*`). Tablas con modal de creación/edición + confirm de delete. | Páginas del catálogo cliente (store, pedidos, perfil). |
| `recharts` | Trabajando en cualquier gráfico del dashboard admin: `VentasLineChart`, `PedidosPieChart`, `TopProductosBarChart`, `KpiCard`. | Visualizaciones fuera del admin o que no usan Recharts. |
| `data-visualizer` | Diseñando nuevas visualizaciones o dashboards complejos desde cero. Segunda opción si `recharts` no cubre el caso. | Modificaciones menores a charts ya existentes. |

### Backend Skills

| Skill | Trigger it when... | NOT when... |
|-------|-------------------|-------------|
| `python-backend` | Escribiendo o revisando cualquier capa del backend: routers FastAPI, services, repositories, schemas Pydantic, migraciones Alembic, JWT/auth. **Primera opción para cualquier trabajo de backend.** | Trabajando exclusivamente en frontend. |
| `payment-gateway-integration` | Modificando la integración con MercadoPago: webhook, idempotencia, preferences API, flujo de pago end-to-end. | Cambios en la lógica de negocio de pedidos sin tocar el flujo de pago. |

### OPSX Workflow Skills

| Comando / Skill | Cuándo usarlo |
|-----------------|---------------|
| `/opsx:explore` | Antes de empezar un change grande — explorar opciones, clarificar requisitos, pensar tradeoffs. Sin implementación. |
| `/opsx:propose` | Cuando el usuario describe una feature o mejora nueva. Genera proposal + design + tasks en un paso. |
| `/opsx:apply` | Para implementar las tasks de un change ya propuesto. Delega a sub-agente con todo el contexto. |
| `/opsx:archive` | Cuando el change está completo (tasks done, tests verdes). Cierra y archiva los artefactos. |

### Calidad y Revisión

| Skill | Trigger it when... |
|-------|-------------------|
| `judgment-day` | Cuando el usuario dice "judgment day", "revisión adversarial", "que lo juzguen". Lanza dos jueces ciegos en paralelo. |
| `simplify` | Después de implementar — revisar el código para detectar duplicación, abstracciones prematuras, y oportunidades de simplificación. |
| `security-review` | Antes de cualquier cambio que toque auth, tokens, permisos, o inputs externos. |
| `review` | Al revisar un PR completo. |
| `web-design-guidelines` | Al auditar la UI antes de cerrar un change de frontend. |

### Gestión del Proyecto

| Skill | Trigger it when... |
|-------|-------------------|
| `issue-creation` | Creando un issue en GitHub — reportar bug, solicitar feature. |
| `branch-pr` | Abriendo un PR — genera título, descripción y checklist automáticamente. |
| `find-skills` | El usuario pregunta "¿hay una skill para X?" o quiere buscar nuevas capacidades. |
| `engram:memory` | Consultar o forzar guardado de memoria. El sistema la usa automáticamente — invocar solo si hay un problema con la memoria. |

### Configuración

| Skill | Trigger it when... |
|-------|-------------------|
| `update-config` | Automatizar comportamientos ("cada vez que X, hacé Y"), cambiar permisos, configurar hooks en `settings.json`. |
| `fewer-permission-prompts` | Hay demasiados prompts de permisos en la sesión — escanea y agrega allowlist. |

---

### Combinaciones frecuentes para este proyecto

**Rediseño de una página del catálogo (store):**
`/opsx:propose` → aplica → `frontend-design` + `vercel-react-best-practices` → `web-design-guidelines` para auditar → `judgment-day` si querés doble revisión → `/opsx:archive`

**Nueva feature en el admin:**
`/opsx:propose` → aplica → `dashboard-crud-page` + `python-backend` → `simplify` → `/opsx:archive`

**Mejora del dashboard de métricas:**
`/opsx:explore` → `/opsx:propose` → aplica → `recharts` + `frontend-design` → `web-design-guidelines` → `/opsx:archive`
