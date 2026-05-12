## 1. Backend: OAuth2 form token endpoint (ReDoc)

- [ ] 1.1 Identificar la implementación actual de `/api/v1/auth/login` (router/service) y definir la función de service reutilizable para autenticar y emitir `{access_token, refresh_token, token_type, expires_in}`.
- [ ] 1.2 Implementar `POST /api/v1/auth/token` usando `OAuth2PasswordRequestForm` (form-encoded) y mapear `username` al identificador de login (email).
- [ ] 1.3 Asegurar que `/api/v1/auth/token` replica comportamiento de errores de login (401 con `INVALID_CREDENTIALS`, timing constante, rate limit si corresponde).
- [ ] 1.4 Actualizar el esquema OAuth2 del OpenAPI para que `tokenUrl` apunte a `/api/v1/auth/token` y verificar que ReDoc/Swagger UI muestran el flujo correctamente.

## 2. Frontend: Limpieza de navegación “menu/inicio”

- [ ] 2.1 Localizar dónde se define la navegación (sidebar/navbar/routes) y enumerar entradas que redirigen a “gestión” o rutas obsoletas.
- [ ] 2.2 Remover/ocultar las entradas “menu” e “inicio” (y equivalentes) que no correspondan, asegurando que “inicio” apunte al home correcto (store/público).
- [ ] 2.3 Revisar guards por rol para accesos a admin/gestión (links y rutas) y ajustar redirects para evitar caer en pantallas no autorizadas.

## 3. Seed data: Dataset más grande y útil

- [ ] 3.1 Identificar el/los scripts de seed actuales y su comportamiento (idempotencia, volumen, entidades cubiertas).
- [ ] 3.2 Expandir seed con más categorías y productos (incluyendo jerarquía de categorías si aplica) manteniendo consistencia y evitando duplicados.
- [ ] 3.3 Agregar/expandir usuarios de prueba con roles relevantes (además de admin), direcciones y pedidos en varios estados para facilitar exploración.
- [ ] 3.4 Verificar que el seed ampliado no requiere migraciones y que puede ejecutarse repetidamente sin romper constraints.

## 4. Verificación rápida (manual)

- [ ] 4.1 Probar autenticación desde ReDoc: obtener token con credenciales existentes y ejecutar un endpoint protegido.
- [ ] 4.2 Navegar el frontend y confirmar que ya no existen accesos “menu/inicio” erróneos y que el flujo principal no envía a “gestión” inesperadamente.
- [ ] 4.3 Ejecutar seed en una BD limpia y comprobar que hay datos suficientes para recorrer catálogo, pedidos y métricas.
