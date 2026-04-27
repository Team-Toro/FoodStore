## MODIFIED Requirements

### Requirement: Creación de pedido valida dirección de entrega
Al crear un pedido con `direccion_id` provisto, el sistema SHALL verificar que la dirección existe, no está eliminada, y pertenece al usuario autenticado.
El sistema SHALL copiar los datos relevantes de la dirección como snapshot inmutable en el pedido (`direccion_snapshot_linea1`, `direccion_snapshot_ciudad`, `direccion_snapshot_alias`).
El campo `direccion_id = null` es válido e indica retiro en local.

#### Scenario: Pedido con dirección propia válida
- **WHEN** un CLIENT autenticado hace `POST /api/v1/pedidos` con un `direccion_id` que le pertenece y no está eliminada
- **THEN** el sistema crea el pedido, copia el snapshot de dirección, y retorna HTTP 201

#### Scenario: Pedido con dirección de otro usuario
- **WHEN** un CLIENT hace `POST /api/v1/pedidos` con un `direccion_id` que no pertenece a su cuenta
- **THEN** el sistema retorna HTTP 403 con código `DIRECCION_NO_PERTENECE_AL_USUARIO`

#### Scenario: Pedido con direccion_id inexistente o eliminada
- **WHEN** un CLIENT hace `POST /api/v1/pedidos` con un `direccion_id` de una dirección que no existe o fue soft-deleted
- **THEN** el sistema retorna HTTP 404 con código `DIRECCION_NOT_FOUND`

#### Scenario: Pedido sin dirección (retiro en local)
- **WHEN** un CLIENT hace `POST /api/v1/pedidos` con `direccion_id = null` o sin el campo
- **THEN** el sistema crea el pedido normalmente sin snapshot de dirección; los campos snapshot quedan `null`

#### Scenario: Snapshot inmutable ante cambios posteriores en la dirección
- **WHEN** un pedido ha sido creado con una dirección y luego el usuario edita o elimina esa dirección
- **THEN** el snapshot del pedido (`direccion_snapshot_linea1`, etc.) NO cambia
