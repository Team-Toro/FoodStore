## ADDED Requirements

### Requirement: Agregar producto al carrito
El sistema SHALL agregar un producto al carrito con la cantidad indicada. Si el producto ya existe en el carrito, SHALL incrementar la cantidad en lugar de crear un nuevo ítem (RN-CR03). La cantidad mínima SHALL ser 1.

#### Scenario: Agregar producto nuevo
- **WHEN** el cliente hace clic en "Agregar al carrito" con cantidad >= 1
- **THEN** el ítem aparece en el carrito con subtotal = precio × cantidad y el badge del ícono se incrementa

#### Scenario: Agregar producto ya existente
- **WHEN** el cliente agrega un producto que ya está en el carrito
- **THEN** la cantidad del ítem existente se incrementa por la cantidad indicada (no se crea duplicado)

#### Scenario: Cantidad inválida bloqueada
- **WHEN** el cliente intenta agregar con cantidad < 1
- **THEN** el botón "Agregar" permanece deshabilitado

#### Scenario: Persistencia tras recarga
- **WHEN** el cliente recarga la página o cierra y reabre el navegador
- **THEN** el carrito mantiene todos los ítems tal como estaban (RN-CR02)

---

### Requirement: Personalización de producto por exclusión de ingredientes
El sistema SHALL permitir seleccionar ingredientes a excluir antes de agregar un producto al carrito. Solo se podrán excluir ingredientes que el producto efectivamente tiene (RN-CR04). Las exclusiones SHALL almacenarse como array de IDs numéricos (RN-CR05).

#### Scenario: Selección de exclusiones en modal
- **WHEN** el cliente abre el detalle del producto y selecciona ingredientes a excluir mediante checkboxes
- **THEN** los IDs de ingredientes seleccionados se almacenan en `CartItem.exclusiones`

#### Scenario: Exclusiones visibles en resumen
- **WHEN** el carrito muestra un ítem con exclusiones
- **THEN** se listan los nombres de los ingredientes excluidos debajo del nombre del producto

#### Scenario: Solo ingredientes del producto disponibles para excluir
- **WHEN** el modal de personalización muestra los ingredientes
- **THEN** solo aparecen ingredientes asociados al producto (no la lista global de ingredientes)

---

### Requirement: Modificar cantidad de ítem en el carrito
El sistema SHALL permitir cambiar la cantidad de un ítem en el carrito. Si la nueva cantidad es 0, el ítem SHALL eliminarse automáticamente. Los cambios SHALL persistir en localStorage inmediatamente.

#### Scenario: Incrementar cantidad
- **WHEN** el cliente incrementa la cantidad de un ítem a un valor >= 1
- **THEN** el subtotal del ítem se recalcula y el total del carrito se actualiza

#### Scenario: Reducir cantidad a cero
- **WHEN** el cliente establece la cantidad de un ítem en 0
- **THEN** el ítem se elimina del carrito automáticamente

---

### Requirement: Eliminar ítem del carrito
El sistema SHALL permitir quitar un producto individual del carrito. El total SHALL recalcularse inmediatamente y el cambio SHALL persistir en localStorage.

#### Scenario: Eliminar ítem
- **WHEN** el cliente hace clic en el ícono de eliminar de un ítem
- **THEN** el ítem desaparece del carrito y el total se recalcula

---

### Requirement: Ver resumen del carrito
El sistema SHALL mostrar un drawer lateral con todos los ítems del carrito, incluyendo: nombre del producto, cantidad, precio unitario, exclusiones activas, subtotal por ítem, costo de envío y total general. Los precios SHALL mostrarse con 2 decimales.

#### Scenario: Drawer con ítems
- **WHEN** el cliente abre el carrito
- **THEN** se muestran todos los ítems con sus subtotales y el total general al pie

#### Scenario: Carrito vacío
- **WHEN** el cliente abre el carrito y no hay ítems
- **THEN** se muestra mensaje "Tu carrito está vacío" con botón que lleva al catálogo

#### Scenario: Badge de cantidad en navbar
- **WHEN** el carrito tiene al menos un ítem
- **THEN** el ícono del carrito en la navbar muestra un badge con el número total de unidades

---

### Requirement: Vaciar carrito completo
El sistema SHALL permitir vaciar todos los ítems del carrito con confirmación previa mediante un diálogo modal.

#### Scenario: Vaciar con confirmación
- **WHEN** el cliente hace clic en "Vaciar carrito" y confirma en el diálogo
- **THEN** todos los ítems se eliminan, el total pasa a $0.00 y el localStorage se actualiza

#### Scenario: Cancelar vaciado
- **WHEN** el cliente hace clic en "Vaciar carrito" pero cancela en el diálogo
- **THEN** el carrito permanece sin cambios

---

### Requirement: Cálculo reactivo de totales
El sistema SHALL calcular `subtotal()`, `costoEnvio()` y `total()` como selectores derivados del estado del carrito. El `itemCount()` SHALL reflejar la suma de cantidades de todos los ítems.

#### Scenario: Recálculo tras modificación
- **WHEN** se agrega, modifica o elimina cualquier ítem
- **THEN** `total()` se recalcula automáticamente y la UI se actualiza sin acción adicional del usuario

#### Scenario: Total con costo de envío
- **WHEN** el carrito tiene al menos un ítem
- **THEN** `total()` = `subtotal()` + `costoEnvio()` y ambos valores se muestran desglosados en el drawer
