## ADDED Requirements

### Requirement: All ERD v5 tables created by migration
The system SHALL create all 16 tables of the ERD v5 when `alembic upgrade head` is executed on an empty PostgreSQL database. The migration SHALL be reversible via `alembic downgrade -1`.

#### Scenario: Fresh migration succeeds
- **WHEN** `alembic upgrade head` is run on an empty database
- **THEN** the following tables exist: `usuario`, `rol`, `usuario_rol`, `refresh_token`, `direccion_entrega`, `categoria`, `producto`, `ingrediente`, `producto_categoria`, `producto_ingrediente`, `forma_pago`, `estado_pedido`, `pedido`, `detalle_pedido`, `historial_estado_pedido`, `pago`

#### Scenario: Migration is reversible
- **WHEN** `alembic downgrade -1` is run after `upgrade head`
- **THEN** no errors occur and the database returns to its previous state

---

### Requirement: Audit fields on all business tables
Every business entity table SHALL have `creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()` and `actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()`. `actualizado_en` SHALL be updated automatically on every row UPDATE.

#### Scenario: Insert sets creado_en
- **WHEN** a new row is inserted into any business table
- **THEN** `creado_en` is set to the current UTC timestamp

#### Scenario: Update refreshes actualizado_en
- **WHEN** a row is updated
- **THEN** `actualizado_en` reflects the time of the update, not the original insert time

---

### Requirement: Soft delete field on deletable entities
The tables `usuario`, `categoria`, `producto`, `ingrediente`, `pedido` SHALL have `eliminado_en TIMESTAMPTZ NULL`. A NULL value means the record is active.

#### Scenario: Soft-deleted record is excluded from standard queries
- **WHEN** `list_all()` is called on any soft-delete-capable repository
- **THEN** rows where `eliminado_en IS NOT NULL` are not returned

---

### Requirement: Correct data types for domain fields
The system SHALL enforce precise data types as specified in the ERD v5.

#### Scenario: Price fields use NUMERIC precision
- **WHEN** the `producto` table is inspected
- **THEN** `precio_base` is of type `NUMERIC(10, 2)`, not `FLOAT` or `DOUBLE PRECISION`

#### Scenario: Personalization uses PostgreSQL array
- **WHEN** the `detalle_pedido` table is inspected
- **THEN** `personalizacion` is of type `INTEGER[]` (PostgreSQL array)

#### Scenario: RefreshToken hash is fixed-length char
- **WHEN** the `refresh_token` table is inspected
- **THEN** `token_hash` is of type `CHAR(64)`

---

### Requirement: Referential integrity constraints
All foreign key relationships defined in the ERD v5 SHALL be enforced at the database level with appropriate ON DELETE behavior.

#### Scenario: Categoria self-reference allows NULL parent
- **WHEN** a root category is inserted with `padre_id = NULL`
- **THEN** the insert succeeds and the category exists as a root node

#### Scenario: UsuarioRol composite unique constraint
- **WHEN** an attempt is made to insert a duplicate `(usuario_id, rol_id)` pair into `usuario_rol`
- **THEN** the database raises a unique constraint violation

---

### Requirement: Email uniqueness index
The `usuario.email` column SHALL have a UNIQUE constraint and a B-tree index to optimize login queries.

#### Scenario: Duplicate email rejected
- **WHEN** two users are inserted with the same email
- **THEN** the second insert raises a unique constraint violation
