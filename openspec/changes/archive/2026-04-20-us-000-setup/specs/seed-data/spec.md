## ADDED Requirements

### Requirement: Idempotent seed script
The system SHALL provide a script at `backend/app/db/seed.py` (invocable as `python -m app.db.seed`) that loads all required catalog data. Running the script multiple times SHALL NOT duplicate any record.

#### Scenario: First run loads all catalog data
- **WHEN** `python -m app.db.seed` is executed on a fresh database
- **THEN** all roles, order states, payment methods, and the admin user are inserted

#### Scenario: Repeated run is safe
- **WHEN** `python -m app.db.seed` is executed a second time on a populated database
- **THEN** no duplicate records are created and no errors are raised

---

### Requirement: Four RBAC roles with stable IDs
The system SHALL insert exactly 4 roles with explicit IDs that match the constants used in application code.

#### Scenario: Roles exist with correct IDs
- **WHEN** the seed runs successfully
- **THEN** the `rol` table contains: `id=1 ADMIN`, `id=2 STOCK`, `id=3 PEDIDOS`, `id=4 CLIENT`

---

### Requirement: Six order states with es_terminal flag
The system SHALL insert exactly 6 order states. `ENTREGADO` and `CANCELADO` SHALL have `es_terminal = TRUE`.

#### Scenario: Terminal states are flagged
- **WHEN** the seed runs successfully
- **THEN** `ENTREGADO` and `CANCELADO` have `es_terminal = TRUE`; all others have `es_terminal = FALSE`

#### Scenario: States exist with stable codes
- **WHEN** the seed runs successfully
- **THEN** the `estado_pedido` table contains codes: `PENDIENTE`, `CONFIRMADO`, `EN_PREP`, `EN_CAMINO`, `ENTREGADO`, `CANCELADO`

---

### Requirement: Payment methods
The system SHALL insert at least 2 enabled payment methods: `MERCADOPAGO` and `EFECTIVO`.

#### Scenario: Payment methods are enabled
- **WHEN** the seed runs successfully
- **THEN** both `MERCADOPAGO` and `EFECTIVO` exist in `forma_pago` with `habilitado = TRUE`

---

### Requirement: Admin user with ADMIN role
The system SHALL create one admin user with credentials configurable via environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). The user SHALL be assigned the ADMIN role.

#### Scenario: Admin user exists after seed
- **WHEN** the seed runs successfully
- **THEN** a user with `email = settings.ADMIN_EMAIL` exists and has the ADMIN role assigned

#### Scenario: Admin password is hashed
- **WHEN** the admin user is inspected in the database
- **THEN** `password_hash` starts with `$2b$` and does not contain the plaintext password
