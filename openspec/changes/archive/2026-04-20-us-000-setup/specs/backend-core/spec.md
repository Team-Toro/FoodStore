## ADDED Requirements

### Requirement: FastAPI application entry point
The system SHALL expose a FastAPI application in `backend/app/main.py` that starts without errors and serves the API under the prefix `/api/v1`.

#### Scenario: Server starts successfully
- **WHEN** `uvicorn app.main:app --reload` is executed from the `backend/` directory
- **THEN** the server starts on port 8000 with no errors and Swagger UI is accessible at `http://localhost:8000/docs`

#### Scenario: CORS allows frontend origin
- **WHEN** a request arrives from `http://localhost:5173`
- **THEN** the response includes the appropriate CORS headers permitting the request

---

### Requirement: Environment configuration via Pydantic Settings
The system SHALL read all configuration from environment variables using a `Settings` class in `backend/app/core/config.py`. If a required variable is missing at startup, the application SHALL fail immediately with a descriptive error.

#### Scenario: Valid environment
- **WHEN** all required variables are present in `.env`
- **THEN** `settings` object is instantiated with correct typed values

#### Scenario: Missing required variable
- **WHEN** `DATABASE_URL` is absent
- **THEN** the application raises a `ValidationError` at import time and does not start

---

### Requirement: Database session factory
The system SHALL provide an async SQLAlchemy engine and session factory in `backend/app/core/database.py`. A `get_session` async generator SHALL be available for FastAPI dependency injection.

#### Scenario: Session opens and closes
- **WHEN** a request handler uses `Depends(get_session)`
- **THEN** a session is opened at the start of the request and closed (with rollback on error) at the end

---

### Requirement: Unit of Work context manager
The system SHALL implement `UnitOfWork` in `backend/app/core/uow.py` as an async context manager. On normal exit it SHALL commit; on exception it SHALL rollback.

#### Scenario: Successful transaction commits
- **WHEN** all operations inside `async with UnitOfWork() as uow:` succeed
- **THEN** `session.commit()` is called exactly once and all changes are persisted

#### Scenario: Exception triggers rollback
- **WHEN** any operation inside the UoW raises an exception
- **THEN** `session.rollback()` is called and no partial data is persisted

---

### Requirement: BaseRepository[T] generic CRUD
The system SHALL provide `BaseRepository[T]` in `backend/app/core/base_repository.py` with the following methods: `get_by_id`, `list_all`, `count`, `create`, `update`, `soft_delete`, `hard_delete`. All methods SHALL be async.

#### Scenario: create returns entity with assigned ID
- **WHEN** `create(entity)` is called within a UoW context
- **THEN** the entity is flushed and returned with a non-null `id`

#### Scenario: soft_delete sets eliminado_en
- **WHEN** `soft_delete(entity)` is called on a model with `eliminado_en`
- **THEN** `eliminado_en` is set to the current UTC timestamp and the entity is NOT physically deleted

#### Scenario: list_all excludes soft-deleted records
- **WHEN** `list_all()` is called
- **THEN** records with `eliminado_en IS NOT NULL` are excluded from results

---

### Requirement: Security utilities
The system SHALL provide in `backend/app/core/security.py`: password hashing with bcrypt (cost ≥ 12), password verification, JWT access token creation (HS256, 30 min), and JWT decoding with signature verification.

#### Scenario: Hash is not plaintext
- **WHEN** `hash_password("secret")` is called
- **THEN** the result does not contain the original string and starts with `$2b$`

#### Scenario: Token decodes to correct claims
- **WHEN** `create_access_token({"sub": "1", "roles": ["CLIENT"]})` is called and the result is decoded
- **THEN** the payload contains `sub = "1"` and `roles = ["CLIENT"]`
