# Skill Registry — Food Store

This file tells sub-agents which domain skills to load and apply for each type of task.
Read this file at the start of any delegated task and self-resolve the relevant skills.

## Frontend Tasks

If the task involves React components, pages, UI, styling, or Tailwind:
- Load `frontend-design` — production-grade UI, avoid generic AI aesthetics
- Load `vercel-react-best-practices` — React patterns, performance, memoization
- Load `web-design-guidelines` — accessibility, hierarchy, spacing

If the task involves admin CRUD pages (`/admin/*`):
- Load `dashboard-crud-page` — useFormModal, useConfirmDialog, usePagination, Zustand useShallow

If the task involves charts or the admin dashboard:
- Load `recharts` — LineChart, PieChart, BarChart patterns for this project

If the task involves building or reviewing a design system or Tailwind tokens:
- Load `tailwind-design-system`

## Skill Availability

Project-local skills live under:
- `.agents/skills/<skill-name>/SKILL.md` (agent runner)
- `.claude/skills/<skill-name>/SKILL.md` (Claude Code)

When adding a new skill, keep both locations in sync and update this registry with the trigger rules.

## Backend Tasks

If the task involves FastAPI routers, services, repositories, Pydantic schemas, or Alembic:
- Load `python-backend` — layered architecture, async patterns, SQLModel, security

If the task involves MercadoPago, payments, or webhooks:
- Load `payment-gateway-integration`

## Quality Tasks

If the task is a code review or simplification pass:
- Load `simplify`

If the task involves auth, tokens, or external inputs:
- Load `security-review`

## Project Conventions (always apply)

### Backend — Layered Architecture
```
Router → Service → UnitOfWork → Repository → Model
```
- Routers: HTTP only, zero business logic
- Services: all business logic, raise HTTPException, never call session.commit()
- UoW: context manager, auto-commit/rollback
- Repositories: inherit BaseRepository[T], DB access only
- Models: SQLModel tables, no imports from upper layers

### Frontend — Feature-Sliced Design
```
Pages → Features → Hooks/Stores → API → Types
```
- Zustand = client state only (cart, auth, UI)
- TanStack Query = server state only (products, orders, dashboard)
- Never cross-feature imports
- Always subscribe by slice: `useStore(s => s.field)` — never `useStore()`
- Filtered arrays: use `useShallow` from zustand, not inline filter in selector

### API Conventions
- All routes: `/api/v1/...`
- Errors: RFC 7807 `{ detail, code, field? }`
- Pagination: `?page=1&size=20` → `{ items, total, page, size, pages }`
- Schemas: always separate Create / Update / Read — never expose SQLModel models directly

### Soft Delete
All business entities have `deleted_at TIMESTAMPTZ`. Always filter `WHERE deleted_at IS NULL`.

### Datetime
Use `datetime.utcnow()` — NOT `datetime.now(timezone.utc)`. PostgreSQL columns are TIMESTAMP WITHOUT TIME ZONE; asyncpg rejects timezone-aware datetimes.

### Zustand Selector Bug (known)
Selecting a function from a store (`s => s.myFn`) is not reactive. Always select a value:
```ts
// Wrong — never re-renders:
useCartStore(s => s.itemCount)
// Correct:
useCartStore(s => s.items.reduce((acc, i) => acc + i.cantidad, 0))
```
