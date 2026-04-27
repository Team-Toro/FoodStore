## ADDED Requirements

### Requirement: Listar árbol completo de categorías
El sistema SHALL exponer un endpoint público `GET /api/v1/categorias` que retorne todas las categorías activas (`deleted_at IS NULL`) organizadas en estructura de árbol anidado. El query SHALL usar CTE recursivo de PostgreSQL para evitar N+1. Los nodos raíz (sin padre) SHALL aparecer como elementos de nivel superior. Cada nodo SHALL incluir sus hijos directos en un campo `hijos` (array recursivo).

#### Scenario: Árbol con categorías raíz e hijos
- **WHEN** existen categorías con relaciones padre-hijo en la DB
- **THEN** `GET /api/v1/categorias` retorna HTTP 200 con array de nodos raíz, cada uno con `id`, `nombre`, `parent_id` (null), `hijos` (array con sus subcategorías anidadas)

#### Scenario: Sin categorías
- **WHEN** la tabla `Categoria` no tiene registros activos
- **THEN** `GET /api/v1/categorias` retorna HTTP 200 con array vacío `[]`

#### Scenario: Categorías con soft delete excluidas
- **WHEN** existen categorías con `deleted_at` no nulo
- **THEN** esas categorías no aparecen en el árbol retornado

---

### Requirement: Obtener detalle de una categoría
El sistema SHALL exponer un endpoint público `GET /api/v1/categorias/{id}` que retorne la categoría con el id dado (si `deleted_at IS NULL`) junto con sus hijos directos. No es necesario devolver el árbol completo de descendientes.

#### Scenario: Categoría existente
- **WHEN** `GET /api/v1/categorias/5` y la categoría id=5 existe y no fue eliminada
- **THEN** retorna HTTP 200 con `id`, `nombre`, `parent_id`, `hijos` (hijos directos activos)

#### Scenario: Categoría no encontrada
- **WHEN** el id no existe o la categoría tiene `deleted_at` no nulo
- **THEN** retorna HTTP 404 con `code: "CATEGORIA_NOT_FOUND"`

---

### Requirement: Crear categoría
El sistema SHALL permitir a usuarios con rol ADMIN crear una nueva categoría via `POST /api/v1/categorias`. El campo `parent_id` es opcional (NULL = raíz). El nombre SHALL ser único dentro del mismo nivel jerárquico (mismo `parent_id`).

#### Scenario: Creación exitosa de categoría raíz
- **WHEN** un ADMIN envía `POST /api/v1/categorias` con `{"nombre": "Pizzas"}` (sin `parent_id`)
- **THEN** retorna HTTP 201 con la categoría creada incluyendo `id`, `nombre`, `parent_id: null`

#### Scenario: Creación exitosa de subcategoría
- **WHEN** un ADMIN envía `POST /api/v1/categorias` con `{"nombre": "Pizzas Clásicas", "parent_id": 5}` y la categoría 5 existe
- **THEN** retorna HTTP 201 con la subcategoría creada con `parent_id: 5`

#### Scenario: Nombre duplicado en mismo nivel
- **WHEN** ya existe una categoría activa con el mismo nombre en el mismo nivel (`parent_id` igual)
- **THEN** retorna HTTP 409 con `code: "CATEGORIA_NOMBRE_DUPLICADO"`

#### Scenario: `parent_id` inválido
- **WHEN** se envía un `parent_id` que no existe o está eliminado
- **THEN** retorna HTTP 404 con `code: "CATEGORIA_PADRE_NOT_FOUND"`

#### Scenario: Acceso sin autenticación
- **WHEN** se intenta crear sin token JWT
- **THEN** retorna HTTP 401

#### Scenario: Acceso con rol insuficiente
- **WHEN** se intenta crear con token de usuario sin rol ADMIN
- **THEN** retorna HTTP 403

---

### Requirement: Actualizar categoría
El sistema SHALL permitir a usuarios con rol ADMIN actualizar `nombre` y/o `parent_id` de una categoría existente via `PUT /api/v1/categorias/{id}`. El sistema SHALL validar que el cambio de `parent_id` no genere un ciclo en la jerarquía (una categoría no puede ser descendiente de sí misma).

#### Scenario: Actualización exitosa de nombre
- **WHEN** un ADMIN envía `PUT /api/v1/categorias/5` con `{"nombre": "Pizzas Artesanales"}`
- **THEN** retorna HTTP 200 con la categoría actualizada

#### Scenario: Cambio de padre válido
- **WHEN** un ADMIN mueve una categoría a un nuevo padre válido (sin ciclo)
- **THEN** retorna HTTP 200 con la categoría actualizada con el nuevo `parent_id`

#### Scenario: Ciclo detectado al cambiar padre
- **WHEN** un ADMIN intenta asignar como padre a una subcategoría descendiente de la categoría actual
- **THEN** retorna HTTP 422 con `code: "CATEGORIA_CICLO_DETECTADO"`

#### Scenario: Auto-referencia
- **WHEN** se intenta asignar `parent_id` igual al `id` de la propia categoría
- **THEN** retorna HTTP 422 con `code: "CATEGORIA_CICLO_DETECTADO"`

#### Scenario: Nombre duplicado en destino
- **WHEN** el nuevo nombre ya existe en el nivel destino
- **THEN** retorna HTTP 409 con `code: "CATEGORIA_NOMBRE_DUPLICADO"`

---

### Requirement: Eliminar categoría (soft delete)
El sistema SHALL permitir a usuarios con rol ADMIN realizar soft delete de una categoría via `DELETE /api/v1/categorias/{id}`. El sistema SHALL rechazar la eliminación si la categoría tiene subcategorías activas o productos activos asociados.

#### Scenario: Soft delete exitoso
- **WHEN** un ADMIN elimina una categoría sin subcategorías activas ni productos activos
- **THEN** se setea `deleted_at = now()` y retorna HTTP 204

#### Scenario: Bloqueo por subcategorías activas
- **WHEN** la categoría tiene al menos una subcategoría con `deleted_at IS NULL`
- **THEN** retorna HTTP 422 con `code: "CATEGORIA_TIENE_HIJOS"`, sin modificar la DB

#### Scenario: Bloqueo por productos activos
- **WHEN** la categoría tiene productos activos asociados via `ProductoCategoria`
- **THEN** retorna HTTP 422 con `code: "CATEGORIA_TIENE_PRODUCTOS"`, sin modificar la DB

#### Scenario: Categoría no encontrada
- **WHEN** el id no existe o ya fue eliminado
- **THEN** retorna HTTP 404 con `code: "CATEGORIA_NOT_FOUND"`

---

### Requirement: Acceso de solo lectura público
El sistema SHALL permitir acceso sin autenticación a `GET /api/v1/categorias` y `GET /api/v1/categorias/{id}`. No se requiere token JWT para estos endpoints.

#### Scenario: Lectura sin token
- **WHEN** un cliente no autenticado realiza `GET /api/v1/categorias`
- **THEN** retorna HTTP 200 con el árbol de categorías (sin requerir Authorization header)

---

### Requirement: Unicidad de nombre por nivel jerárquico
El sistema SHALL garantizar que no existan dos categorías activas con el mismo nombre en el mismo nivel (mismo valor de `parent_id`, incluido NULL para el nivel raíz).

#### Scenario: Dos raíces con mismo nombre
- **WHEN** ya existe una categoría raíz llamada "Bebidas" y se intenta crear otra raíz "Bebidas"
- **THEN** retorna HTTP 409 con `code: "CATEGORIA_NOMBRE_DUPLICADO"`

#### Scenario: Mismo nombre en niveles distintos es válido
- **WHEN** existe "Especiales" como raíz y se crea "Especiales" como hijo de otra categoría
- **THEN** la creación es exitosa (HTTP 201), porque son niveles distintos
