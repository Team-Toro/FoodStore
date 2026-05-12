## 1. Alinear UI por rol (ADMIN sin carrito/checkout)

- [ ] 1.1 Identificar rutas y entrypoints de carrito/checkout en frontend y ajustar navegación para ocultarlas cuando el usuario tenga rol `ADMIN`
- [ ] 1.2 Implementar guard de routing para bloquear acceso directo de `ADMIN` a rutas de carrito/checkout y redirigir a `/admin`
- [ ] 1.3 Agregar/ajustar tests de routing/visibilidad para asegurar que `ADMIN` no ve ni accede a carrito/checkout

## 2. Admin Productos — crear/editar + stock

- [ ] 2.1 Auditar `/admin/productos` actual y confirmar que el formulario permite `stock_cantidad` y persiste correctamente (create + update)
- [ ] 2.2 Alinear permisos backend para operaciones de productos/categorías (guards `require_roles("ADMIN", "STOCK")`) si hay endpoints que devuelven 403 a `ADMIN`
- [ ] 2.3 Implementar/ajustar UX de creación de producto (modal/sheet): validaciones, estados loading/error, e invalidación/refetch de lista
- [ ] 2.4 Implementar/ajustar UX de edición de producto (modal/sheet): precarga de detalle, edición de `stock_cantidad`, y actualización de tabla
- [ ] 2.5 Verificar que cambios de stock desde admin no rompen reglas existentes (stock por confirmación/cancelación de pedidos) con tests existentes o nuevos

## 3. Admin Ingredientes — nueva página CRUD

- [ ] 3.1 Crear página `/admin/ingredientes` en `features/admin/pages` siguiendo el page-chrome stack estándar
- [ ] 3.2 Implementar listado paginado consumiendo `GET /api/v1/ingredientes` y renderizar columnas `Nombre`, `Es alérgeno`, `Acciones`
- [ ] 3.3 Implementar creación (Dialog) llamando `POST /api/v1/ingredientes` y manejar 409 `INGREDIENTE_DUPLICADO` sin cerrar el diálogo
- [ ] 3.4 Implementar edición (Dialog) llamando `PUT /api/v1/ingredientes/{id}` con manejo de errores
- [ ] 3.5 Implementar eliminación (confirm) llamando `DELETE /api/v1/ingredientes/{id}` e invalidar/refetch
- [ ] 3.6 Agregar entrada "Ingredientes" en el sidebar del admin y route wiring

## 4. Verificación final

- [ ] 4.1 Revisar que specs del change están cubiertas (productos: create/edit/stock; ingredientes: CRUD; admin sin carrito)
- [ ] 4.2 Ejecutar el set mínimo de tests relevante (frontend + backend) y corregir fallas
