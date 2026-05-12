## Context

El proyecto ya cuenta con un panel `/admin` protegido por rol `ADMIN` y con páginas existentes como `/admin/productos` (listado + toggle disponibilidad + soft-delete/restaurar) y `/admin/categorias`/`/admin/usuarios`.

En la práctica, el rol `ADMIN` hoy queda desalineado en dos frentes:

1) Experiencia de UI: el Admin ve partes del flujo de cliente (carrito/checkout) o entrypoints que no corresponden a su rol.
2) Capacidades de gestión: faltan operaciones necesarias para administrar el catálogo (crear/editar producto, ajustar stock) y una página CRUD para ingredientes.

La solución debe mantener las convenciones del repo:
- Frontend FSD: Pages → Features → Hooks/Stores → API → Types.
- Separación estricta: Zustand (estado cliente/UI) vs TanStack Query (estado servidor).
- Backend por capas (router → service → uow → repository → model) y RBAC con `require_roles`.

## Goals / Non-Goals

**Goals:**
- Alinear la UI del rol `ADMIN` eliminando acceso/entrypoints a carrito/checkout.
- Completar la gestión de productos en `/admin/productos`: crear, editar y actualizar stock desde el panel.
- Introducir `/admin/ingredientes` con CRUD completo y consistente con el “page-chrome stack” del admin.
- Alinear permisos backend para que `ADMIN` pueda ejecutar las mismas operaciones de gestión de catálogo que `STOCK` donde corresponda.

**Non-Goals:**
- Cambiar el modelo de roles (códigos/IDs) o el mecanismo de autenticación.
- Re-diseñar visualmente todo el admin; sólo ajustes necesarios para navegación/flujo y nuevas pantallas.
- Implementar nuevas reglas de negocio de stock (más allá de permitir la edición administrativa explícita).

## Decisions

1) **Ocultar (y proteger) carrito/checkout para ADMIN**
   - Decisión: para usuarios con rol `ADMIN`, la UI no renderiza entrypoints de carrito/checkout y los guards de rutas bloquean el acceso directo.
   - Alternativas:
     - A) Sólo ocultar links (insuficiente: acceso directo por URL).
     - B) Redirigir ADMIN fuera de rutas de cliente y no montar esos layouts (preferido).

2) **CRUD de productos en la misma página `/admin/productos`**
   - Decisión: mantener una única página con tabla + acciones (crear/editar) usando el mismo patrón UI que otras páginas admin (Toolbar + DataTable + Dialog/Sheet).
   - Alternativas:
     - A) Pantallas separadas `/admin/productos/nuevo` y `/admin/productos/:id` (más routing, más complejidad).
     - B) Dialog/Sheet sobre la tabla (preferido: consistencia y rapidez operativa).

3) **Edición de stock como acción explícita**
   - Decisión: exponer en UI un campo de “stock” editable (en formulario de producto y/o acción rápida) que llama al endpoint de actualización de producto/stock.
   - Alternativas:
     - A) Endpoint dedicado `PATCH /productos/{id}/stock` (claro, menor riesgo de colisiones con otros updates).
     - B) Reusar `PUT/PATCH /productos/{id}` con `stock` (si ya existe) (menos endpoints, requiere confirmar validaciones).
   - Se elegirá en implementación según estado actual del backend; el objetivo es que ADMIN pueda ajustar stock con `require_roles("ADMIN", "STOCK")`.

4) **Nueva capacidad `admin-ingredientes`**
   - Decisión: crear un módulo admin para ingredientes con CRUD completo y soft-delete/restaurar, accesible sólo por `ADMIN`.
   - Alternativas:
     - A) Reusar endpoints públicos de ingredientes (si existen) con guards adicionales.
     - B) Crear endpoints bajo `/api/v1/admin/ingredientes` (más explícito, pero puede duplicar patrones). Preferir el patrón ya existente en el backend.

## Risks / Trade-offs

- **Riesgo:** “Ocultar carrito” rompe casos donde un usuario tiene múltiples roles (p.ej. `ADMIN` + `CLIENT`).
  → **Mitigación:** definir la regla: si incluye `ADMIN`, se comporta como admin (prioridad de rol) o permitir switch de “modo”. Se confirmará con el usuario antes de implementar.

- **Riesgo:** Cambios de permisos pueden abrir operaciones de gestión de catálogo a ADMIN sin la UI adecuada.
  → **Mitigación:** cubrir con specs claros + tests/validaciones de API y asegurar guards `require_roles` correctos.

- **Riesgo:** Actualización de stock puede interferir con reglas existentes (descuento atómico en confirmación de pedido).
  → **Mitigación:** mantener la edición administrativa como set explícito (no delta) y asegurar que la lógica de pedido sigue siendo transaccional e independiente.
