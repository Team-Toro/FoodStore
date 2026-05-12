## Context

Este change combina tres mejoras de “higiene” que hoy degradan la experiencia:

1) UI: existen accesos (“menu”, “inicio” u otros) que terminan llevando a la sección de gestión/admin, o a rutas que no corresponden al usuario actual.
2) Datos: el seed actual no alcanza para ejercitar listados, filtros, dashboard y flujos de pedidos/pagos con variedad realista.
3) Docs: ReDoc no puede autenticarse porque el flujo OAuth2 que espera (form-encoded) no coincide con el login JSON pensado para el frontend.

Restricciones relevantes:
- Mantener compatibilidad con el frontend actual (login JSON) y con las convenciones del backend (router → service → repository).
- No cambiar el esquema de BD para el seed; solo agregar más registros.
- ReDoc/OpenAPI debe poder obtener un access token con las mismas credenciales que el login “normal”.

## Goals / Non-Goals

**Goals:**
- Eliminar/ocultar entradas de navegación que lleven a “gestión” cuando no corresponda y asegurar que “inicio” no apunte a rutas de admin.
- Ampliar el seed para cubrir escenarios típicos: múltiples categorías y productos, usuarios con roles, direcciones, pedidos en distintos estados, y datos suficientes para métricas.
- Habilitar autenticación desde ReDoc agregando `POST /api/v1/auth/token` con `OAuth2PasswordRequestForm`.
- Configurar el esquema OAuth2 en OpenAPI para que `tokenUrl` apunte a `/api/v1/auth/token`.

**Non-Goals:**
- Rediseño visual completo del frontend o re-arquitectura de routing (solo corrección/limpieza focalizada).
- Cambiar el mecanismo de autenticación (seguimos con JWT + refresh tokens tal como está).
- Cambios de modelo de datos o migraciones Alembic.

## Decisions

1) **Agregar endpoint OAuth2 form sin romper login JSON**
   - Decisión: crear `POST /api/v1/auth/token` que acepte `application/x-www-form-urlencoded` vía `OAuth2PasswordRequestForm` y devuelva el mismo payload de tokens que `/api/v1/auth/login`.
   - Rationale: ReDoc (y herramientas OAuth2 estándar) esperan un token endpoint form-based. Mantener `/auth/login` JSON evita impactar al frontend.
   - Alternativas:
     - Cambiar `/auth/login` a form-based (rechazado: rompe frontend/clients).
     - Duplicar lógica en router (rechazado: la lógica debe vivir en service).

2) **Credenciales consistentes entre login y token**
   - Decisión: usar la misma verificación que el login actual. Interpretar `OAuth2PasswordRequestForm.username` como `email` (o mapear a “email o username” si el sistema lo soporta) para que el usuario use las mismas credenciales.
   - Rationale: el usuario pidió “mismas credenciales”. El campo se llama `username` por spec OAuth2, pero el sistema puede tratarlo como email.
   - Alternativas:
     - Forzar username real (si no existe en el sistema, no aplica).

3) **OpenAPI security scheme apunta a /auth/token**
   - Decisión: mantener el esquema Bearer para proteger endpoints y configurar el `OAuth2PasswordBearer(tokenUrl=...)` (o equivalente) con `/api/v1/auth/token`.
   - Rationale: habilita “Authorize” en ReDoc sin afectar el backend runtime.

4) **Seed data más grande pero determinista**
   - Decisión: expandir el seeding con datos repetibles (IDs estables donde aplique, o inserciones idempotentes) y cobertura de entidades clave.
   - Rationale: permite demo y pruebas manuales consistentes; evita duplicados al re-ejecutar.
   - Alternativas:
     - Generación aleatoria (rechazado: dificulta reproducibilidad).

5) **Navegación: remover accesos y asegurar rutas correctas por rol**
   - Decisión: ajustar la definición de navegación (componentes de menú, rutas, redirects) para que:
     - “inicio” apunte al home público/store, no a gestión.
     - entradas de admin/gestión se muestren solo a roles que correspondan.
     - se eliminen links obsoletos (“menu”) si no tienen destino válido.
   - Rationale: reduce confusión y evita que usuarios terminen en pantallas incorrectas.

## Risks / Trade-offs

- **[Riesgo]** ReDoc sigue sin autenticar si el OpenAPI no expone el security scheme correctamente → **Mitigación**: verificar en `/docs` y `/redoc` que el botón Authorize usa `/api/v1/auth/token` y que el header `Authorization: Bearer` se envía.
- **[Riesgo]** Divergencia entre `/auth/login` y `/auth/token` (dos caminos) → **Mitigación**: centralizar la autenticación en el service y reutilizar la misma función para ambos.
- **[Riesgo]** Seed demasiado pesado o lento → **Mitigación**: balancear volumen (suficiente para UI) y mantener inserciones eficientes; evitar relaciones explosivas.
- **[Riesgo]** Cambios de navegación rompen rutas existentes → **Mitigación**: mantener redirects compatibles si hay bookmarks y ajustar guards por rol.
