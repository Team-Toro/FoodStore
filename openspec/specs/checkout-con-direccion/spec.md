## ADDED Requirements

### Requirement: Selector de dirección de entrega en el checkout frontend
El sistema SHALL mostrar las direcciones guardadas del usuario en el flujo de checkout, permitiendo seleccionar una antes de crear el pedido.
Si el usuario no tiene direcciones, el sistema SHALL permitir continuar sin seleccionar dirección (retiro en local / `direccion_id = null`).

#### Scenario: Usuario con direcciones ve el selector
- **WHEN** un CLIENT autenticado con al menos una dirección navega al checkout
- **THEN** el sistema muestra sus direcciones y preselecciona la marcada como principal (`es_principal = true`)

#### Scenario: Usuario sin direcciones puede continuar sin dirección
- **WHEN** un CLIENT autenticado sin ninguna dirección guardada navega al checkout
- **THEN** el sistema no muestra selector y permite crear el pedido con `direccion_id = null`

#### Scenario: Usuario puede cambiar dirección en el checkout
- **WHEN** un CLIENT selecciona una dirección diferente a la preseleccionada en el checkout
- **THEN** el `paymentStore` almacena el nuevo `direccionSeleccionadaId` y se usa al crear el pedido

---

### Requirement: Página de gestión de direcciones del perfil
El sistema SHALL proveer una página en `/perfil/direcciones` donde el usuario pueda ver, crear, editar, eliminar y marcar como principal sus direcciones de entrega.

#### Scenario: Ver listado de direcciones
- **WHEN** un CLIENT autenticado navega a `/perfil/direcciones`
- **THEN** la página muestra todas sus direcciones activas con indicador visual de cuál es la principal

#### Scenario: Crear nueva dirección desde la página
- **WHEN** el usuario hace clic en "Agregar dirección" y completa el formulario modal con campos válidos
- **THEN** la nueva dirección aparece en el listado sin recargar la página (invalidación de TanStack Query)

#### Scenario: Editar dirección existente
- **WHEN** el usuario hace clic en "Editar" sobre una dirección y modifica campos en el modal
- **THEN** los cambios se reflejan inmediatamente en el listado

#### Scenario: Eliminar dirección sin pedidos activos
- **WHEN** el usuario hace clic en "Eliminar" y confirma en el diálogo
- **THEN** la dirección desaparece del listado; si tenía pedidos activos se muestra error descriptivo

#### Scenario: Marcar dirección como principal desde la página
- **WHEN** el usuario hace clic en "Marcar como principal" sobre una dirección no-principal
- **THEN** el indicador de principal se mueve a la dirección seleccionada
