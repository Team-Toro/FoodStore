## ADDED Requirements

### Requirement: Modelo Usuario con soft delete
La tabla `usuario` SHALL contener las columnas `id` (BIGSERIAL PK), `nombre` (VARCHAR(100) NN), `apellido` (VARCHAR(100) NN), `email` (VARCHAR(254) UNIQUE NN indexada), `password_hash` (VARCHAR(255) NN), `telefono` (VARCHAR(30) NULL), `created_at` (TIMESTAMPTZ default now()), `updated_at` (TIMESTAMPTZ default now()), `deleted_at` (TIMESTAMPTZ NULL). Todas las queries GET MUST filtrar `WHERE deleted_at IS NULL`.

#### Scenario: Email único con índice
- **WHEN** se intenta insertar un segundo `Usuario` con el mismo `email` (incluso con capitalización distinta normalizada)
- **THEN** PostgreSQL rechaza con violación de `UNIQUE (email)`.

#### Scenario: GET filtra soft-deleted
- **WHEN** el repositorio ejecuta `get_by_email("x@y.com")` y existe una fila con ese email pero `deleted_at IS NOT NULL`
- **THEN** el método retorna `None`.

### Requirement: Repositorio de usuarios
El módulo `app/modules/usuarios/repository.py` SHALL proveer `UsuarioRepository(BaseRepository[Usuario])` con al menos: `get_by_email(email) -> Usuario | None`, `get_with_roles(usuario_id) -> Usuario | None`, `email_exists(email) -> bool`. Ningún método SHALL contener lógica de negocio.

#### Scenario: get_with_roles carga roles eager
- **WHEN** se invoca `get_with_roles(uid)` sobre un usuario con 2 roles
- **THEN** el método retorna el `Usuario` con atributo `roles` pre-cargado (sin N+1, usando `selectinload` o `joinedload` por la relación `usuario_rol → rol`).

#### Scenario: email_exists filtra soft-deleted
- **WHEN** existe una fila con `email = "x@y.com"` y `deleted_at IS NOT NULL`
- **THEN** `email_exists("x@y.com")` retorna `False` (permite re-registro tras purga lógica).

### Requirement: Servicio de usuarios
El módulo `app/modules/usuarios/service.py` SHALL orquestar:
- `crear_cliente(uow, data: RegisterRequest) -> Usuario` — crea `Usuario` + `UsuarioRol(CLIENT)` en una transacción, hasheando la contraseña.
- `get_current_user_dto(uow, usuario_id: int) -> UserResponse` — lee usuario con roles y mapea a Pydantic `UserResponse`.
Ningún servicio SHALL llamar `session.commit()` directamente; la UoW se encarga.

#### Scenario: Registro crea usuario y rol en misma transacción
- **WHEN** `crear_cliente(uow, data)` se ejecuta dentro de `async with UnitOfWork() as uow`
- **THEN** al salir del bloque SIN excepciones se han persistido una fila en `usuario` y una en `usuario_rol` apuntando al rol CLIENT.

#### Scenario: Rollback por email duplicado
- **WHEN** `crear_cliente` se ejecuta con un email ya existente y el servicio lanza `HTTPException(409)`
- **THEN** `UnitOfWork.__aexit__` hace rollback y no queda ninguna fila persistida.

#### Scenario: UserResponse nunca expone password_hash
- **WHEN** cualquier endpoint retorna un `UserResponse`
- **THEN** el JSON serializado no contiene la clave `password_hash` (verificado por el schema Pydantic).

### Requirement: Repositorio de roles
El módulo `app/modules/usuarios/` SHALL incluir `RolRepository(BaseRepository[Rol])` con al menos `get_by_codigo(codigo: str) -> Rol | None`, usado por el servicio de usuarios para resolver el ID del rol CLIENT al registrar.

#### Scenario: Resolver CLIENT por código
- **WHEN** se invoca `get_by_codigo("CLIENT")` tras la semilla
- **THEN** retorna el `Rol` con `id=4, codigo="CLIENT"`.

#### Scenario: Código inexistente
- **WHEN** se invoca `get_by_codigo("NOEXISTE")`
- **THEN** retorna `None`.

### Requirement: Unión M2M UsuarioRol
La tabla `usuario_rol` SHALL ser el pivot (`usuario_id` FK → `usuario.id`, `rol_id` FK → `rol.id`) con PK compuesta y restricción UNIQUE sobre `(usuario_id, rol_id)`. Un usuario MUST poder tener múltiples roles simultáneamente.

#### Scenario: Mismo par (usuario, rol) no puede repetirse
- **WHEN** se intenta insertar dos filas `(usuario_id=5, rol_id=1)`
- **THEN** PostgreSQL rechaza con violación UNIQUE.

#### Scenario: Mismo usuario con múltiples roles
- **WHEN** se insertan `(5, 1)` y `(5, 3)`
- **THEN** el `Usuario(id=5)` tiene roles `["ADMIN", "PEDIDOS"]`.
