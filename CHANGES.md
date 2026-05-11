# Changelog — Food Store TPI

Todo lo notable implementado en este proyecto está documentado aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [v1.0.0] — 2026-04-27

Implementación completa del sistema e-commerce Food Store, desde el setup inicial hasta el panel de administración con métricas. La implementación se realizó en 9 changes OPSX en orden de dependencias.

---

### 🏗 Setup e Infraestructura (us-000) — 2026-04-20

**Objetivo:** Establecer el monorepo desde cero con toda la infraestructura base necesaria para que los sprints funcionales puedan construirse encima.

#### Backend
- Creado `backend/requirements.txt` con versiones fijadas: `fastapi`, `uvicorn[standard]`, `sqlmodel`, `alembic`, `passlib[bcrypt]`, `python-jose[cryptography]`, `slowapi`, `mercadopago`, `pydantic[email-validator]`, `pydantic-settings`, `httpx`, `asyncpg`, `greenlet`
- Creado `backend/app/core/config.py` con clase `Settings(BaseSettings)` que lee todas las variables de entorno desde `.env`
- Creado `backend/app/core/database.py` con async engine (`create_async_engine`), session factory `AsyncSessionLocal` y función `get_session` para `Depends()`
- Creado `backend/app/core/security.py` con funciones `hash_password`, `verify_password`, `create_access_token`, `decode_access_token` usando HS256
- Creado `backend/app/core/uow.py` — clase `UnitOfWork` como async context manager: abre sesión, expone repositorios como atributos, auto-commit en éxito y auto-rollback en excepción
- Creado `backend/app/core/base_repository.py` — `BaseRepository[T](Generic[T])` con métodos async: `get_by_id`, `list_all`, `count`, `create`, `update`, `soft_delete`, `hard_delete`
- Creado `backend/app/core/models.py` — clase base `TimestampModel` con `creado_en` y `actualizado_en`; clase `SoftDeleteModel` con `eliminado_en`; event listener SQLAlchemy para auto-actualizar `actualizado_en` en UPDATE
- Scaffoldeados 10 módulos bajo `backend/app/modules/`: `auth/`, `usuarios/`, `productos/`, `categorias/`, `ingredientes/`, `pedidos/`, `pagos/`, `direcciones/`, `admin/`, `refreshtokens/` — cada uno con `__init__.py`, `model.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`
- Definidos 16 modelos SQLModel completos según ERD v5: `Rol`, `Usuario`, `UsuarioRol`, `RefreshToken`, `DireccionEntrega`, `Categoria`, `Ingrediente`, `Producto`, `ProductoCategoria`, `ProductoIngrediente`, `FormaPago`, `EstadoPedido`, `Pedido`, `DetallePedido`, `HistorialEstadoPedido`, `Pago`
- Inicializado Alembic con `env.py` configurado para importar todos los modelos y leer `DATABASE_URL` desde `settings`
- Creado `backend/app/main.py` con CORS middleware, SlowAPI middleware, handler global RFC 7807 y endpoint de health check en `/health`
- Creado `backend/app/db/seed.py` — script idempotente que carga: 4 roles (`ADMIN`, `STOCK`, `PEDIDOS`, `CLIENT`), 6 estados de pedido con `es_terminal`, formas de pago (`MERCADOPAGO`, `EFECTIVO`), usuario admin `admin@foodstore.com / Admin1234!`

#### Frontend
- Creado `frontend/package.json` con dependencias declaradas: `@tanstack/react-query`, `@tanstack/react-form`, `zustand`, `axios`, `react-router-dom`, `recharts`, `@mercadopago/sdk-react`
- Configurado Tailwind CSS v3 con PostCSS y `tailwind.config.js`
- Configurado `tsconfig.json` con `strict: true`
- Creada estructura Feature-Sliced Design: `src/app/`, `src/pages/`, `src/widgets/`, `src/features/auth/`, `src/features/store/`, `src/features/pedidos/`, `src/features/admin/`, `src/entities/`, `src/shared/api/`, `src/shared/ui/`, `src/shared/lib/`
- Creado `src/shared/api/client.ts` — instancia Axios con `baseURL = VITE_API_URL`, interceptor de request (adjunta `Authorization: Bearer`) e interceptor de response (maneja 401 con refresh automático)
- Creados 4 stores Zustand con tipos TypeScript: `authStore` (persiste solo `accessToken`), `cartStore` (persiste `items` completos), `paymentStore` (sin persist), `uiStore` (sin persist)
- Creado `src/app/providers.tsx` con `QueryClientProvider` de TanStack Query

**Archivos clave:** `backend/app/core/`, `backend/app/modules/*/model.py`, `backend/app/db/seed.py`, `frontend/src/app/store/`

---

### 🔐 Autenticación JWT (us-001) — 2026-04-20

**Objetivo:** Implementar el sistema completo de autenticación y autorización para desbloquear todas las historias de usuario que requieren identificar al actor y aplicar RBAC.

#### Backend
- Ampliado `backend/app/core/security.py` con `create_refresh_token()` (UUID v4), `hash_refresh_token(token)` (SHA-256 hex) y claims completos en `create_access_token` (`sub`, `email`, `roles`, `exp`, `iat`, `type="access"`)
- Creado `backend/app/core/deps.py` con `CurrentUser` (Pydantic BaseModel), `get_current_user` (OAuth2PasswordBearer + decode + validación `type == "access"` + filtro soft-deleted) y factory `require_roles(*codigos)`
- Actualizado `backend/app/core/uow.py` para instanciar `self.usuarios`, `self.roles`, `self.refresh_tokens`
- Implementado `backend/app/modules/usuarios/repository.py` — `UsuarioRepository` con `get_by_email`, `get_with_roles` (usando `selectinload`), `email_exists`; `RolRepository` con `get_by_codigo`
- Implementado `backend/app/modules/usuarios/service.py` — `crear_cliente` (lanza 409 si email existe, hashea password, crea `Usuario + UsuarioRol(CLIENT)`), `get_user_response`
- Implementado `backend/app/modules/refreshtokens/repository.py` — `RefreshTokenRepository` con `create`, `get_by_token`, `revoke`, `revoke_all_for_user`
- Implementado `backend/app/modules/refreshtokens/service.py` — `emit_pair` y `rotate` con detección de replay attack (si el token llega con `revoked_at != NULL`, revocar TODOS los tokens activos del usuario y retornar 401)
- Implementado `backend/app/modules/auth/service.py` — `register`, `login` (respuesta neutral si email no existe para mitigar enumeración), `refresh`, `logout`
- Implementado `backend/app/modules/auth/router.py` con 5 endpoints: `POST /register` (201, rate limit 3/1h), `POST /login` (200, rate limit 5/15min), `POST /refresh`, `POST /logout`, `GET /me` — todos bajo `/api/v1/auth`
- Rate limiting con SlowAPI: `Limiter(key_func=get_remote_address)`, handler de `RateLimitExceeded` que retorna 429 con `Retry-After` y `code="RATE_LIMIT_EXCEEDED"`

#### Frontend
- Creado `frontend/src/store/authStore.ts` con Zustand + `persist` (solo `accessToken`), acciones `setAccessToken` y `clearAuth`
- Creado `frontend/src/api/axiosClient.ts` — interceptor de 401 que dispara refresh con cola singleton (dos requests 401 concurrentes comparten la misma promesa); si el refresh falla, `clearAuth()` y redirect a `/login`
- Creada feature `auth` completa: tipos, `authApi.ts`, hooks `useLogin`, `useRegister`, `useLogout`, `useMe`
- Creadas páginas `LoginPage.tsx` y `RegisterPage.tsx` con TanStack Form, validación client-side y manejo de errores por código (`INVALID_CREDENTIALS`, `EMAIL_ALREADY_EXISTS`, `RATE_LIMIT_EXCEEDED`)
- Creado `RequireAuth.tsx` — guard que dispara `useMe()` si hay `accessToken`; muestra loader mientras carga; redirige a `/login` en 401

**Archivos clave:** `backend/app/core/deps.py`, `backend/app/core/security.py`, `backend/app/modules/auth/`, `backend/app/modules/refreshtokens/`, `frontend/src/store/authStore.ts`, `frontend/src/api/axiosClient.ts`

---

### 📁 Categorías con Jerarquía (us-002) — 2026-04-20

**Objetivo:** Implementar el sistema de categorías jerárquicas que estructura el catálogo de productos. Prerequisito directo de `us-003-productos` por la FK en `ProductoCategoria`.

#### Backend
- Implementado `backend/app/modules/categorias/model.py` — tabla `Categoria` con `id BIGSERIAL PK`, `nombre VARCHAR(100) NN`, `parent_id BIGINT FK self-ref NULL ON DELETE SET NULL`, `deleted_at`
- Implementado `backend/app/modules/categorias/repository.py` con CTE recursivo PostgreSQL (`get_all_flat`), `get_direct_children`, `get_by_nombre_and_parent` (unicidad por nivel), `has_active_children`, `get_ancestors` (para validación anti-ciclo), `soft_delete`
- Implementado `backend/app/modules/categorias/service.py` — `get_tree` (construye árbol anidado en Python desde filas planas), `create` (valida padre existente + unicidad de nombre en el nivel), `update` (valida anti-ciclo + unicidad), `delete` (valida no tener hijos activos ni productos activos)
- Implementado `backend/app/modules/categorias/router.py` con 5 endpoints bajo `/api/v1/categorias`:
  - `GET /` — público, retorna árbol completo como `CategoriaTree[]`
  - `GET /{id}` — público, retorna categoría con hijos directos
  - `POST /` — requiere ADMIN, retorna HTTP 201
  - `PUT /{id}` — requiere ADMIN
  - `DELETE /{id}` — requiere ADMIN, retorna HTTP 204
- Schemas Pydantic: `CategoriaCreate`, `CategoriaUpdate`, `CategoriaRead`, `CategoriaTree` (recursivo con `hijos: list['CategoriaTree']`)
- Tests: 7 casos cubriendo creación de raíz, subcategoría, nombre duplicado (409), árbol anidado, soft delete, rechazo de delete con hijos, detección de ciclo

**Archivos clave:** `backend/app/modules/categorias/`

---

### 🛒 Productos y Catálogo (us-003) — 2026-04-21

**Objetivo:** Implementar el núcleo del e-commerce — catálogo de productos con ingredientes personalizables, stock atómico, soft delete e integridad histórica.

#### Backend — Módulo Ingredientes
- Implementado `backend/app/modules/ingredientes/` completo — CRUD con `es_alergeno`, soft delete, paginación y validación de unicidad de nombre (409 `INGREDIENTE_DUPLICADO`)
- Endpoints bajo `/api/v1/ingredientes`: listado (público), detalle (público), crear/editar/eliminar (ADMIN o STOCK)

#### Backend — Módulo Productos
- Implementado `backend/app/modules/productos/schemas.py` con `ProductoCreate`, `ProductoUpdate`, `ProductoRead`, `ProductoDetail` (con `categorias: list[CategoriaRead]` e `ingredientes: list[IngredienteConRemovible]`), schemas de sincronización M2M y de stock/disponibilidad
- Implementado `backend/app/modules/productos/repository.py` con `list_paginated` (ILIKE para nombre), `get_categorias`, `get_ingredientes`, `sync_categorias` (DELETE+INSERT), `sync_ingredientes`, `update_stock_atomico` (`UPDATE ... SET stock = stock + :delta WHERE stock + :delta >= 0`)
- Implementado `backend/app/modules/productos/service.py` con lógica completa de catálogo: crear, listar (paginado y filtrado), detalle, actualizar, soft delete, disponibilidad, stock, sync de categorías e ingredientes
- Implementados 10 endpoints bajo `/api/v1/productos`:
  - `GET /` y `GET /{id}` — públicos con filtros `categoria_id`, `nombre`, `disponible`
  - `GET /{id}/ingredientes` — público
  - `POST /`, `PUT /{id}`, `PATCH /{id}/disponibilidad`, `PATCH /{id}/stock`, `PUT /{id}/categorias`, `PUT /{id}/ingredientes` — requieren ADMIN o STOCK
  - `DELETE /{id}` — requiere ADMIN únicamente
- Registrados `self.productos` y `self.ingredientes` en `UnitOfWork`
- Añadidos datos de seed de ingredientes y productos de ejemplo en `backend/app/db/seed.py`

**Archivos clave:** `backend/app/modules/productos/`, `backend/app/modules/ingredientes/`

---

### 🛍 Carrito de Compras (us-004) — 2026-04-21

**Objetivo:** Implementar el carrito de compras client-side (RN-CR01 — no persiste en servidor) con catálogo navegable, personalización de ingredientes y drawer lateral.

**Decisión de diseño:** El carrito es 100% cliente usando Zustand + localStorage. No hay endpoints nuevos de backend — se consumen los de `us-003-productos` ya implementados.

#### Frontend
- Creado `frontend/src/types/cart.ts` con interfaz `CartItem { productoId, nombre, precio, cantidad, imagenUrl, exclusiones: number[] }`
- Implementado `frontend/src/app/store/cartStore.ts` completo:
  - Acciones: `addItem` (fusiona si producto ya existe, incrementando cantidad), `removeItem`, `updateCantidad` (llama `removeItem` si cantidad <= 0), `clearCart`
  - Selectores derivados: `subtotal()`, `costoEnvio()` (constante `SHIPPING_COST = 500` si subtotal > 0), `total()`, `itemCount()`
  - Middleware `persist` con `name: 'cart-storage'`, `version: 1`
- Creados hooks TanStack Query: `useProductos` (con params `page`, `size`, `nombre`, `categoria_id`, staleTime 60s), `useProductoDetalle`, `useCategorias`
- Creados componentes del catálogo:
  - `ProductCard` — nombre, imagen, precio, categorías, badge "Sin stock", botón "Agregar"
  - `ProductGrid` — grid CSS con skeleton loaders y manejo de error con "Reintentar"
  - `CatalogoFilters` — input con debounce 300ms + selector de categoría
  - `PaginationControls` — botones prev/next con total de páginas
  - `CatalogoPage` — ensambla todos los componentes anteriores
- Creado `ProductDetailModal` — carga detalle con `useProductoDetalle`, muestra ingredientes con checkboxes (ícono de alérgeno para `es_alergeno=true`), input de cantidad; al confirmar llama `cartStore.addItem`
- Creado `CartDrawer` — drawer lateral controlado por `uiStore.cartOpen`, `CartItemRow` con stepper de cantidad, estado vacío, footer con desglose subtotal/envío/total, modal de confirmación de vaciado
- Badge de carrito en Navbar mostrando `itemCount` reactivo

**Archivos clave:** `frontend/src/app/store/cartStore.ts`, `frontend/src/features/store/components/`

---

### 📦 Pedidos con FSM de Estados (us-005) — 2026-04-20

**Objetivo:** Implementar el sistema de pedidos como entidad central que conecta carrito → pago, con máquina de estados finita, snapshot de precios, audit trail y control de stock atómico.

#### Backend
- Implementados modelos `Pedido`, `DetallePedido`, `HistorialEstadoPedido` en `backend/app/modules/pedidos/model.py` según ERD v5 (incluyendo `personalizacion INTEGER[]` y campos de snapshot de dirección)
- Implementado `backend/app/modules/pedidos/repository.py`:
  - `PedidoRepository` con `get_by_id`, `list_paginated(usuario_id, estado, page, size)`
  - `DetallePedidoRepository` con `create_bulk`
  - `HistorialEstadoPedidoRepository` con `append` (solo INSERT, nunca UPDATE/DELETE) y `get_by_pedido_id`
  - `ProductoRepository.get_for_update` con `SELECT ... FOR UPDATE` para validación de stock atómica
- Implementado `backend/app/modules/pedidos/service.py` con FSM completa:
  - Constantes `TRANSICIONES_PERMITIDAS` y `ROLES_POR_TRANSICION` según especificación
  - `crear_pedido` — valida stock (`SELECT FOR UPDATE`), crea `Pedido`, `DetallePedido[]` con snapshots de nombre y precio, `HistorialEstadoPedido` inicial con `estado_desde=NULL` (RN-02)
  - `cambiar_estado` — valida FSM + rol actor, ejecuta efecto de stock (decremento al CONFIRMAR, restauración al CANCELAR desde CONFIRMADO), registra en historial (append-only, RN-03)
  - `motivo` requerido cuando `nuevo_estado == "CANCELADO"` (RN-05)
  - Estados terminales `ENTREGADO` y `CANCELADO` no admiten transiciones posteriores
- Implementado `backend/app/modules/pedidos/router.py` con 5 endpoints bajo `/api/v1/pedidos`:
  - `POST /` — requiere CLIENT, crea pedido desde carrito
  - `GET /` — CLIENT ve solo los suyos; PEDIDOS y ADMIN ven todos; filtro por estado
  - `GET /{id}` — detalle con ítems, snapshots e historial
  - `PATCH /{id}/estado` — avanza FSM según rol
  - `GET /{id}/historial` — historial append-only ordenado por `created_at ASC`
- Tests: 11 casos incluyendo stock insuficiente, cancelación con restauración de stock, historial append-only, cancelación en EN_PREP solo por ADMIN, cancelación sin motivo

#### Frontend
- Definidos tipos en `frontend/src/types/pedido.ts` y API client en `frontend/src/api/pedidosApi.ts`
- Implementados hooks: `useListarPedidos`, `useObtenerPedido`, `useCrearPedido` (vacía `cartStore` y redirige a `/pedidos/{id}` en éxito), `useCambiarEstado`
- Creado `HistorialTimeline` — lista cronológica con íconos de estado y timestamps
- Creadas páginas: `MisPedidos` (listado paginado con filtro por estado), `DetallePedido` (detalle completo con `HistorialTimeline`), `GestionPedidos` (para roles PEDIDOS y ADMIN con avance de estado)
- Implementado `mapCartToCrearPedidoRequest(items, formaPago, direccionId)` como helper de transformación
- Integrado botón "Confirmar Pedido" en `CartDrawer`

**Archivos clave:** `backend/app/modules/pedidos/service.py`, `backend/app/modules/pedidos/repository.py`, `frontend/src/features/pedidos/`

---

### 💳 Pagos con MercadoPago (us-006) — 2026-04-23

**Objetivo:** Integrar MercadoPago como puerta de pago para completar el ciclo compra → cobro → confirmación automática de pedido, con idempotencia y procesamiento asíncrono del webhook.

#### Backend
- Creado `backend/app/core/mp_client.py` — factory `get_mp_sdk()` que retorna instancia del SDK MercadoPago leyendo `MP_ACCESS_TOKEN` desde `settings`
- Implementado `backend/app/modules/pagos/schemas.py` con `CrearPagoRequest`, `PagoResponse`, `WebhookPayload`
- Implementado `backend/app/modules/pagos/repository.py` — `PagoRepository` con `get_by_pedido_id`, `get_by_idempotency_key`, `get_by_mp_payment_id`, `list_by_pedido_id`
- Implementado `backend/app/modules/pagos/service.py` con:
  - `crear_pago` — verifica propiedad del pedido + estado PENDIENTE, genera `idempotency_key = uuid4()`, crea preferencia en MP Preferences API con `external_reference = str(pedido_id)` y `back_urls`, persiste `Pago` con `mp_status = "pending"`, retorna `init_point`
  - `procesar_webhook` — idempotente: si pago ya figura como `approved`, retorna sin procesar; verifica estado real en API de MP (`sdk.payment().get()`); si `approved`, transiciona pedido a CONFIRMADO y decrementa stock vía `pedidos.service.cambiar_estado` con `actor_rol="SISTEMA"`; para `rejected/pending/cancelled`, solo actualiza `Pago.mp_status`
  - `obtener_pago` — verifica propiedad o rol ADMIN
- Implementado `backend/app/modules/pagos/router.py` con 3 endpoints:
  - `POST /api/v1/pagos/crear` — requiere CLIENT, retorna HTTP 201
  - `POST /api/v1/pagos/webhook` — endpoint público, responde HTTP 200 inmediatamente, procesa con `BackgroundTask` para evitar retries de MP
  - `GET /api/v1/pagos/{pedido_id}` — requiere CLIENT o ADMIN
- Extendida tabla `TRANSITION_ACTORS` en `pedidos.service` para aceptar `actor_rol="SISTEMA"` en transición `PENDIENTE → CONFIRMADO`

**Patrón de seguridad PCI SAQ-A:** Los datos de tarjeta se tokenizan en el browser mediante `@mercadopago/sdk-react` — nunca atraviesan el servidor de Food Store.

#### Frontend
- Actualizado `paymentStore` con `mp_status`, `mp_payment_id`, `setPagoResult`, `resetPayment`
- Creada `pagosApi.ts` con `crearPago(pedidoId)` y `obtenerPago(pedidoId)`
- Actualizado flujo de checkout: tras crear el pedido, llama `crearPago` y redirige a `init_point` de MP
- Creada `ResultadoPagoPage` — lee query params `status` y `payment_id` del retorno de MP; si `approved`, hace polling con TanStack Query cada 3s hasta confirmar `mp_status="approved"` o timeout de 30s; si `rejected`, muestra botón "Reintentar pago"

**Tarjetas sandbox:** Aprobada `4509 9535 6623 3704` / Rechazada `4000 0000 0000 0002`

**Archivos clave:** `backend/app/modules/pagos/`, `backend/app/core/mp_client.py`, `frontend/src/features/store/pages/ResultadoPagoPage.tsx`

---

### 🛠 Panel de Administración con Dashboard (us-007) — 2026-04-23

**Objetivo:** Implementar el módulo de administración completo con métricas en Recharts, gestión de usuarios/productos/pedidos y control de acceso por rol ADMIN.

#### Backend — Migración y Modelo
- Añadido campo `activo: bool` a modelo `Usuario` con migración Alembic correspondiente
- Implementado `backend/app/modules/admin/repository.py` con `AdminRepository` y `AdminMetricasRepository`

#### Backend — Gestión de Usuarios (Admin)
- Endpoints bajo `/api/v1/admin/usuarios`: listado paginado, actualizar roles, activar/desactivar usuario
- Validación en login: si `usuario.activo == False`, retorna HTTP 403 `USUARIO_INACTIVO`

#### Backend — Métricas
- Implementado `AdminMetricasService` con endpoints:
  - `GET /api/v1/admin/metricas/resumen` — KPIs: total usuarios, pedidos del período, ventas totales (suma de `pedido.total`), productos activos
  - `GET /api/v1/admin/metricas/ventas-por-periodo` — ventas agrupadas por día con `SUM(pedido.total)`
  - `GET /api/v1/admin/metricas/top-productos` — top N productos por cantidad vendida
  - `GET /api/v1/admin/metricas/pedidos-por-estado` — distribución de pedidos por estado
- Parámetros de filtro por rango de fechas: `desde` y `hasta` (tipo `date`)

#### Frontend — Recharts Dashboard
- Implementados 4 componentes de visualización:
  - `VentasLineChart` — gráfico de línea de ventas por período con `LineChart` de Recharts
  - `PedidosPieChart` — distribución de pedidos por estado con `PieChart` (filtra estados con cantidad 0)
  - `TopProductosBarChart` — top productos por unidades vendidas con `BarChart`
  - `KpiCard` — tarjeta de KPI con valor, label e icono
- `AdminDashboard` — ensambla todos los componentes con selector de rango de fechas
- Página `/admin/productos` — listado con toggle de disponibilidad e indicador de soft-delete
- Página `/admin/usuarios` — editor de roles, toggle activo/inactivo, display de errores API
- Página `/admin/pedidos` — vista de todos los pedidos con avance de estado por rol
- Rutas `/admin/*` protegidas por `require_roles("ADMIN")`

**Tests:** 107/107 tests pasando (backend + frontend)

**Archivos clave:** `backend/app/modules/admin/`, `frontend/src/features/admin/components/`

---

### 📍 Gestión de Direcciones de Entrega (us-008) — 2026-04-20

**Objetivo:** Implementar el CRUD completo de direcciones de entrega y su integración con el checkout, para que los clientes puedan guardar, seleccionar y gestionar sus domicilios. Prerequisito para el snapshot de dirección en pedidos.

#### Backend — Módulo Direcciones
- Implementado `backend/app/modules/direcciones/schemas.py` con `DireccionCreate`, `DireccionUpdate` (todos opcionales), `DireccionRead` (con `es_principal`)
- Implementado `backend/app/modules/direcciones/repository.py`:
  - `list_by_usuario(usuario_id)` — filtra por `usuario_id` y `deleted_at IS NULL`
  - `get_by_id_and_usuario(id, usuario_id)` — enforcement de ownership
  - `clear_principal(usuario_id)` — UPDATE masivo: `es_principal = false` para todas las del usuario
  - `count_for_usuario(usuario_id)` — para detectar primera dirección creada
- Implementado `backend/app/modules/direcciones/service.py`:
  - `crear_direccion` — si es la primera del usuario, auto-marca como principal
  - `marcar_como_principal` — atomic: `clear_principal` + set `es_principal=true` en la nueva
  - `eliminar_direccion` — valida que no tiene pedidos activos (estados `PENDIENTE`, `CONFIRMADO`, `EN_PREP`, `EN_CAMINO`); lanza 409 `DIRECCION_CON_PEDIDOS_ACTIVOS` si los tiene
- Implementados 5 endpoints bajo `/api/v1/direcciones`:
  - `GET /` — lista propias del usuario autenticado
  - `POST /` — crea dirección (la primera se marca automáticamente como principal)
  - `PUT /{id}` — actualiza con validación de ownership (403 si ajena)
  - `DELETE /{id}` — soft delete con guardia de pedidos activos
  - `PATCH /{id}/predeterminada` — marca como dirección principal

#### Backend — Integración con Pedidos (Snapshot)
- Agregada migración Alembic para columnas de snapshot en tabla `pedido`: `direccion_snapshot_linea1 TEXT`, `direccion_snapshot_ciudad VARCHAR(100)`, `direccion_snapshot_alias VARCHAR(100)`
- Actualizado `pedidos/service.py` en `crear_pedido`: valida que `direccion_id` (cuando se provee) pertenece al usuario autenticado (403 si no); copia snapshot: `pedido.direccion_snapshot_linea1 = direccion.linea1`, etc.
- Actualizado schema `PedidoDetail` para incluir los campos de snapshot de dirección

#### Frontend
- Creada feature `direcciones` completa: tipos, `api.ts`, hooks TanStack Query (`useDirecciones`, `useCreateDireccion`, `useUpdateDireccion`, `useDeleteDireccion`, `useSetPredeterminada`)
- Componentes: `DireccionCard` (con badge "Principal"), `DireccionFormModal` (TanStack Form), `ConfirmDeleteModal`, `DireccionSelector` (para checkout — lista con radio buttons, opción "Retiro en local")
- Página `/perfil/direcciones` con listado de tarjetas y botón "Agregar dirección"
- Integrado `DireccionSelector` en el flujo de checkout (CartDrawer)
- Actualizado `paymentStore` con `direccionSeleccionadaId: number | null` y setter `setDireccionSeleccionada`

**Archivos clave:** `backend/app/modules/direcciones/`, `backend/app/modules/pedidos/service.py`, `frontend/src/features/direcciones/`

---

## 🔧 Fixes & Patches

### [Fix 1] datetime timezone mismatch con asyncpg — 2026-04-27

**Problema:** Todas las columnas de PostgreSQL son `TIMESTAMP WITHOUT TIME ZONE`. El uso de `datetime.now(timezone.utc)` (timezone-aware) generaba un error de tipo en asyncpg al intentar insertar en columnas naive.

**Causa raíz:** `asyncpg` rechaza datetimes con tzinfo cuando el tipo de columna es `TIMESTAMP WITHOUT TIME ZONE`.

**Solución:** Reemplazar `datetime.now(timezone.utc)` por `datetime.utcnow()` en todos los puntos donde se generan timestamps en el backend.

**Archivos modificados:**
- `backend/app/core/models.py`
- `backend/app/modules/refreshtokens/service.py`
- `backend/app/modules/refreshtokens/repository.py`
- `backend/app/core/base_repository.py`
- `backend/app/modules/categorias/repository.py`
- `backend/app/modules/admin/repository.py`
- `backend/app/modules/admin/service.py`

---

### [Fix 2] Schema mismatch en ProductCard — 2026-04-27

**Problema:** El backend devolvía `precio_base` y `stock_cantidad` en `ProductoRead`, pero el frontend esperaba `precio` y `stock`. La UI mostraba `undefined` para precio y el badge de stock nunca aparecía.

**Solución:**
- Añadido `@computed_field` en `backend/app/modules/productos/schemas.py` dentro de `ProductoRead`: `precio: float` (alias de `precio_base`) y `stock: int` (alias de `stock_cantidad`)
- Agregado guard en `frontend/src/features/store/components/ProductCard.tsx`: `(producto.categorias ?? [])` para evitar crash cuando `categorias` es `undefined`

**Archivos modificados:**
- `backend/app/modules/productos/schemas.py`
- `frontend/src/features/store/components/ProductCard.tsx`

---

### [Fix 3] Badge del carrito no se actualizaba (Zustand) — 2026-04-27

**Problema:** El badge de cantidad en el ícono del carrito no re-renderizaba al agregar o quitar productos. El selector era `useCartStore((s) => s.itemCount)` que devuelve la referencia a la función — no un valor derivado — por lo que Zustand nunca detectaba cambios.

**Causa raíz:** Seleccionar una función del store no crea una suscripción reactiva al resultado de esa función.

**Solución:** Cambiar el selector a un valor derivado calculado inline:
```ts
// Antes (no reactivo):
useCartStore((s) => s.itemCount)

// Después (reactivo):
useCartStore((s) => s.items.reduce((acc, i) => acc + i.cantidad, 0))
```

**Archivo modificado:** `frontend/src/shared/ui/Header.tsx`

---

### [Fix 4] ventas_totales siempre $0 en dashboard admin — 2026-04-27

**Problema:** El KPI de ventas totales y el gráfico de ventas por período siempre mostraban $0. La query original hacía un LEFT JOIN con la tabla `pago` filtrando `mp_status = 'approved'`, pero en entornos sin pagos reales confirmados, el resultado era siempre cero.

**Solución:** Reemplazar el JOIN con `pago` por `SUM(pedido.total)` directamente desde la tabla `pedido`. Los pedidos confirmados ya tienen el total correcto.

**Afecta funciones:** `resumen()` y `ventas_por_periodo()` en `AdminMetricasRepository`

**Archivo modificado:** `backend/app/modules/admin/repository.py`

---

### [Fix 5] costoEnvio hardcodeado — ignoraba retiro en local — 2026-04-27

**Problema:** Al crear un pedido desde el checkout, `mapCartToCrearPedidoRequest` siempre enviaba `costo_envio: 500` sin considerar si el usuario había seleccionado retiro en local (sin dirección). El selector `costoEnvio()` del `cartStore` tampoco consideraba este caso.

**Solución:**
- `frontend/src/features/store/components/CartDrawer.tsx` calcula `costoEnvio` condicionalmente: si `direccionSeleccionadaId === null` → `0`, si hay dirección → `500`
- `mapCartToCrearPedidoRequest` recibe `costoEnvio` como parámetro explícito con default `0`

**Archivos modificados:**
- `frontend/src/features/store/components/CartDrawer.tsx`
- `frontend/src/shared/helpers/mapCartToPedido.ts`

---

### [Fix 6] Labels superpuestos en PedidosPieChart — 2026-04-27

**Problema:** El gráfico de torta de estados de pedido mostraba labels superpuestos y confusos porque la query devuelve los 6 estados incluyendo aquellos con cantidad 0, y el label incluía tanto el nombre del estado como el porcentaje.

**Solución:**
- Filtrar sectores con `d.cantidad > 0` antes de pasar los datos a Recharts
- Simplificar el label a solo el porcentaje (sin nombre, evita superposición en sectores pequeños)

**Archivo modificado:** `frontend/src/features/admin/components/PedidosPieChart.tsx`

---

### [Fix 7] Dashboard admin excluía pedidos del día "hasta" — 2026-04-27

**Problema:** El selector de rango de fechas del dashboard enviaba `hasta=YYYY-MM-DD` (sin horario). FastAPI parseaba esto como `T00:00:00`, dejando fuera todos los pedidos creados durante ese día (por ejemplo, pedidos de las 14hs de `2026-04-24` no aparecían en un filtro `hasta=2026-04-24`).

**Solución:** La función `_default_dates()` en el servicio hace `replace(hour=23, minute=59, second=59)` sobre el valor de `hasta` para incluir todos los pedidos del día seleccionado.

**Archivo modificado:** `backend/app/modules/admin/service.py`

---

## Información Técnica

### Stack completo

| Capa | Tecnología |
|------|-----------|
| Backend framework | FastAPI + Uvicorn |
| ORM / Modelos | SQLModel (SQLAlchemy 2.x + Pydantic v2) |
| Base de datos | PostgreSQL (asyncpg driver) |
| Migraciones | Alembic |
| Autenticación | JWT HS256 (python-jose) + bcrypt (passlib) |
| Rate limiting | SlowAPI |
| Pagos | MercadoPago SDK Python v2 |
| Frontend | React 18 + TypeScript (strict) + Vite |
| Estado cliente | Zustand (persist middleware) |
| Estado servidor | TanStack Query v5 |
| Formularios | TanStack Form |
| Estilos | Tailwind CSS v3 |
| Gráficos | Recharts |
| HTTP client | Axios |
| Tokenización MP | @mercadopago/sdk-react |

### Patrones arquitectónicos implementados

- **Arquitectura en capas unidireccional:** Router → Service → Unit of Work → Repository → Model
- **Unit of Work pattern:** Transacciones gestionadas por contexto, auto-commit/rollback
- **Repository pattern:** `BaseRepository[T]` genérico extendido por cada módulo
- **Feature-Sliced Design (FSD):** Frontend organizado en capas con flujo de importación top-down
- **Snapshot pattern:** `DetallePedido.nombre_snapshot` y `precio_snapshot` inmutables al momento de creación
- **FSM (Finite State Machine):** Transiciones de estado de pedido validadas en Service con tabla de actores permitidos
- **Soft delete:** `deleted_at TIMESTAMPTZ` en todas las entidades de negocio; queries filtran `WHERE deleted_at IS NULL`
- **Append-only audit trail:** `HistorialEstadoPedido` nunca recibe UPDATE ni DELETE
- **Idempotencia:** `Pago.idempotency_key UUID` único previene doble procesamiento del webhook
- **Replay attack detection:** Refresh token revocado detectado → revocación masiva de todos los tokens del usuario
- **PCI SAQ-A compliance:** Datos de tarjeta tokenizados en browser, nunca pasan por el servidor de Food Store
