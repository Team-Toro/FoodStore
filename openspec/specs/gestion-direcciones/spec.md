## ADDED Requirements

### Requirement: Cliente puede crear una dirección de entrega
El sistema SHALL permitir a un usuario autenticado con rol CLIENT crear una nueva dirección de entrega asociada a su cuenta.
Los campos obligatorios son `linea1` y `ciudad`. Los campos opcionales son `linea2`, `codigo_postal`, `referencia` y `alias`.
Si es la primera dirección del usuario, el sistema SHALL marcarla automáticamente como `es_principal = true`.

#### Scenario: Crear primera dirección (se marca como principal)
- **WHEN** un CLIENT autenticado hace `POST /api/v1/direcciones` con `linea1` y `ciudad` válidos y no tiene ninguna dirección previa
- **THEN** el sistema crea la dirección con `es_principal = true` y retorna HTTP 201 con el objeto creado

#### Scenario: Crear dirección adicional (no se marca como principal)
- **WHEN** un CLIENT autenticado hace `POST /api/v1/direcciones` y ya tiene al menos una dirección
- **THEN** el sistema crea la dirección con `es_principal = false` y retorna HTTP 201

#### Scenario: Campos obligatorios ausentes
- **WHEN** un CLIENT hace `POST /api/v1/direcciones` sin el campo `linea1` o `ciudad`
- **THEN** el sistema retorna HTTP 422 con detalle de validación

#### Scenario: Usuario no autenticado
- **WHEN** una petición sin token JWT hace `POST /api/v1/direcciones`
- **THEN** el sistema retorna HTTP 401

---

### Requirement: Cliente puede listar sus propias direcciones
El sistema SHALL retornar únicamente las direcciones activas (no eliminadas) que pertenecen al usuario autenticado.

#### Scenario: Listar direcciones propias
- **WHEN** un CLIENT autenticado hace `GET /api/v1/direcciones`
- **THEN** el sistema retorna HTTP 200 con la lista de sus direcciones no eliminadas; la dirección principal aparece con `es_principal = true`

#### Scenario: Lista vacía
- **WHEN** un CLIENT autenticado sin ninguna dirección hace `GET /api/v1/direcciones`
- **THEN** el sistema retorna HTTP 200 con una lista vacía `[]`

#### Scenario: No se ven direcciones de otros usuarios
- **WHEN** un CLIENT autenticado hace `GET /api/v1/direcciones`
- **THEN** el sistema NO incluye direcciones cuyo `usuario_id` sea diferente al del JWT

---

### Requirement: Cliente puede editar una dirección propia
El sistema SHALL permitir actualizar los campos de una dirección existente que pertenece al usuario autenticado.

#### Scenario: Edición exitosa
- **WHEN** un CLIENT autenticado hace `PUT /api/v1/direcciones/{id}` con la dirección siendo suya y no eliminada
- **THEN** el sistema actualiza los campos provistos y retorna HTTP 200 con la dirección actualizada

#### Scenario: Editar dirección de otro usuario
- **WHEN** un CLIENT hace `PUT /api/v1/direcciones/{id}` y la dirección no pertenece a su cuenta
- **THEN** el sistema retorna HTTP 403

#### Scenario: Dirección inexistente o eliminada
- **WHEN** un CLIENT hace `PUT /api/v1/direcciones/{id}` con un ID que no existe o fue soft-deleted
- **THEN** el sistema retorna HTTP 404

---

### Requirement: Cliente puede eliminar una dirección propia (soft delete)
El sistema SHALL marcar la dirección como eliminada (`deleted_at` con timestamp actual) sin borrarla físicamente.
El propietario o un ADMIN pueden eliminarla.
El sistema NO SHALL permitir eliminar una dirección que tiene pedidos activos (estado PENDIENTE, CONFIRMADO, EN_PREP o EN_CAMINO).

#### Scenario: Eliminación exitosa
- **WHEN** un CLIENT autenticado hace `DELETE /api/v1/direcciones/{id}` siendo la dirección suya y sin pedidos activos asociados
- **THEN** el sistema setea `deleted_at` con la fecha actual y retorna HTTP 204

#### Scenario: Eliminar con pedidos activos
- **WHEN** un CLIENT hace `DELETE /api/v1/direcciones/{id}` y la dirección tiene al menos un pedido en estado activo
- **THEN** el sistema retorna HTTP 409 con código `DIRECCION_CON_PEDIDOS_ACTIVOS`

#### Scenario: ADMIN puede eliminar dirección de cualquier usuario
- **WHEN** un ADMIN hace `DELETE /api/v1/direcciones/{id}` y la dirección no tiene pedidos activos
- **THEN** el sistema realiza el soft delete y retorna HTTP 204

#### Scenario: Eliminar dirección de otro usuario (sin ser ADMIN)
- **WHEN** un CLIENT hace `DELETE /api/v1/direcciones/{id}` y la dirección no le pertenece
- **THEN** el sistema retorna HTTP 403

---

### Requirement: Cliente puede marcar una dirección como principal
El sistema SHALL permitir al usuario marcar una dirección como su dirección principal.
El cambio SHALL ser atómico: la dirección anteriormente principal pierde el flag y la nueva lo obtiene en la misma transacción.
Solo puede haber una dirección principal activa por usuario en todo momento.

#### Scenario: Cambio de dirección principal exitoso
- **WHEN** un CLIENT autenticado hace `PATCH /api/v1/direcciones/{id}/predeterminada` con una dirección propia activa
- **THEN** el sistema desactiva `es_principal` en todas las demás direcciones del usuario y activa `es_principal` en la especificada, retornando HTTP 200 con la dirección actualizada

#### Scenario: Marcar dirección ya principal
- **WHEN** un CLIENT hace `PATCH /api/v1/direcciones/{id}/predeterminada` y la dirección ya es la principal
- **THEN** el sistema retorna HTTP 200 sin cambios (idempotente)

#### Scenario: Marcar dirección de otro usuario como principal
- **WHEN** un CLIENT hace `PATCH /api/v1/direcciones/{id}/predeterminada` con una dirección que no le pertenece
- **THEN** el sistema retorna HTTP 403
