## Context

El modelo `DireccionEntrega` ya existe en `backend/app/modules/direcciones/model.py` con los campos correctos del ERD v5: `linea1`, `linea2`, `ciudad`, `codigo_postal`, `referencia`, `alias`, `es_principal`, `usuario_id` y soft delete via `SoftDeleteModel`. Los otros archivos del módulo (schemas, repository, service, router) son stubs vacíos.

El campo `direccion_id` ya está presente en `CrearPedidoRequest` (Integrador.txt §6.2) pero el service de pedidos no valida ownership. El snapshot de dirección (`RN-PE03`) requiere copiar campos de la dirección al pedido en el momento de creación — la tabla `Pedido` ya tiene `direccion_id` como FK nullable (SET NULL), pero no hay columnas de snapshot explícitas en el ERD v5; el Integrador menciona copiar datos directamente al pedido.

## Goals / Non-Goals

**Goals:**
- Implementar los 5 endpoints REST del módulo direcciones con auth JWT y ownership enforcement.
- Garantizar que solo una dirección sea principal por usuario (transacción atómica en el cambio de principal).
- Primera dirección creada se marca como principal automáticamente.
- Soft delete con guardia: no eliminar si hay pedidos activos.
- Conectar `direccion_id` al service de pedidos con validación de ownership.
- Frontend: página de gestión `/perfil/direcciones` y selector en checkout.

**Non-Goals:**
- Geocodificación o validación de direcciones contra APIs externas.
- Gestión de zonas de entrega o cálculo de costo de envío por dirección.
- Historial de cambios de direcciones (audit trail propio).
- ADMIN panel para gestionar direcciones de todos los usuarios (no requerido en US-024/028).

## Decisions

### D1: Snapshot de dirección en pedido — FK vs. columnas de texto

**Opciones:**
- A) FK `direccion_id` + columnas snapshot (`direccion_linea1`, `direccion_ciudad`, etc.) en `Pedido`.
- B) FK `direccion_id` únicamente (si la dirección se soft-delete, se pierde el dato).
- C) JSON serializado en `direccion_snapshot TEXT`.

**Decisión: Opción A — FK nullable + 3 columnas de snapshot en `Pedido`.**

Rationale: El ERD v5 establece `RN-PE03` y `RN-DA06` — los snapshots son inmutables. La FK se pone a `SET NULL` (ya definido en ERD) pero los campos snapshot persisten aunque la dirección sea eliminada. Las columnas son: `direccion_snapshot_linea1 TEXT`, `direccion_snapshot_ciudad VARCHAR(100)`, `direccion_snapshot_alias VARCHAR(100)`. Esto es suficiente para mostrar la dirección de entrega en el historial del pedido sin necesidad de join.

**Impacto**: Requiere migración Alembic para agregar las 3 columnas de snapshot a la tabla `pedido`.

### D2: Atomicidad del cambio de dirección principal

**Opciones:**
- A) Dos UPDATEs secuenciales dentro del UoW (quitar flag viejo → setear nuevo).
- B) UPDATE masivo `WHERE usuario_id = X AND es_principal = true` → luego setear nuevo.

**Decisión: Opción B — UPDATE masivo + setear nuevo, dentro del mismo UoW.**

Rationale: Evita race condition si un usuario tiene múltiples direcciones principales por algún bug; el UPDATE masivo normaliza el estado. Ambos UPDATE corren en la misma transacción del UoW, con rollback automático si cualquiera falla.

### D3: Guardia de eliminación — verificación de pedidos activos

**Opciones:**
- A) Query en `PedidoRepository` desde `DireccionService` (violación de capas).
- B) Query directa en `DireccionRepository.tiene_pedidos_activos(direccion_id)` — solo cuenta pedidos.
- C) Inyectar `PedidoRepository` en `DireccionService` vía UoW.

**Decisión: Opción C — exponer `pedido_repository` en el UoW.**

Rationale: El UoW ya expone múltiples repositories (`pedido_repo`, `detalle_repo`, etc.). Agregar `pedido_repo` al UoW de direcciones es consistente con el patrón existente. `DireccionService` llama `uow.pedido_repo.count_activos_por_direccion(id)` — no hay violación de capas porque todo pasa por el UoW.

### D4: Frontend — estado de selección de dirección en checkout

**Opciones:**
- A) Guardar `direccionSeleccionadaId` en `cartStore` (Zustand, persiste).
- B) Estado local en el componente de checkout.
- C) Campo en `paymentStore` (Zustand, no persiste).

**Decisión: Opción C — `paymentStore`.**

Rationale: La dirección seleccionada es parte del flujo de pago, no del carrito. Debe sobrevivir la navegación dentro del flujo de checkout pero no persistir entre sesiones. `paymentStore` ya existe para este tipo de estado efímero de flujo.

## Risks / Trade-offs

- **Migración de columnas snapshot en `pedido`**: Si ya existen pedidos en la BD (entorno de desarrollo con seed), las nuevas columnas nullable no rompen datos existentes. Rollback: hacer las columnas nullable desde el inicio. Mitigación: default `NULL` para las 3 columnas.

- **Primera dirección como principal automática**: La lógica vive en `DireccionService.crear()`. Si se crea via script/seed directamente en BD sin pasar por el service, no se aplica esta regla. Mitigación: documentado en seed; no es un caso de uso del sistema.

- **Soft delete + guardia**: La query de pedidos activos introduce un JOIN adicional al eliminar. Con volumen bajo de direcciones por usuario, el impacto es negligible.

- **Selector de dirección en checkout**: Si el usuario no tiene direcciones, el pedido puede crearse con `direccion_id = null` (retiro en local). El frontend debe manejar este estado explícitamente para no confundir al usuario.

## Migration Plan

1. Crear migración Alembic: agregar `direccion_snapshot_linea1`, `direccion_snapshot_ciudad`, `direccion_snapshot_alias` a tabla `pedido` (nullable).
2. Implementar módulo backend completo.
3. Actualizar `PedidoService.crear_pedido()` para validar `direccion_id` y copiar snapshot.
4. Implementar frontend: feature `direcciones`, página, selector en checkout.
5. Rollback: las columnas snapshot son nullable → no rompen funcionalidad existente si se revierten.

## Open Questions

- ¿El ADMIN debería poder listar/editar direcciones de cualquier usuario? (US-003 solo menciona ownership del CLIENT; no hay US explícito para admin de direcciones). **Decisión tomada**: ADMIN puede eliminar cualquier dirección (mencionado en scope del task), pero no hay endpoint de listado por usuario para admin — se puede agregar en una iteración futura.
