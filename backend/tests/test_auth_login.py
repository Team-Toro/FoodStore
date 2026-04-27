"""Tests for POST /api/v1/auth/login — covers spec scenarios."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, registered_user: dict) -> None:
    """Scenario: Login exitoso con credenciales válidas → 200 + token pair."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_nonexistent_email(client: AsyncClient, seed_roles: None) -> None:
    """Scenario: Credenciales inválidas — email inexistente → 401 INVALID_CREDENTIALS."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "anypassword"},
    )
    assert resp.status_code == 401
    body = resp.json()
    assert body["code"] == "INVALID_CREDENTIALS"
    assert body["detail"] == "Credenciales inválidas"


@pytest.mark.asyncio
async def test_login_wrong_password(
    client: AsyncClient, registered_user: dict
) -> None:
    """Scenario: Credenciales inválidas — contraseña incorrecta → 401 INVALID_CREDENTIALS."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "wrongpassword"},
    )
    assert resp.status_code == 401
    body = resp.json()
    assert body["code"] == "INVALID_CREDENTIALS"
    # Same detail as non-existent email (neutral response)
    assert body["detail"] == "Credenciales inválidas"


@pytest.mark.asyncio
async def test_login_soft_deleted_user(
    client: AsyncClient, db_session: object, registered_user: dict
) -> None:
    """Scenario: Usuario soft-deleted → 401 INVALID_CREDENTIALS."""
    from datetime import datetime, timezone
    from sqlalchemy import update
    from app.modules.usuarios.model import Usuario

    # Soft-delete the user
    now = datetime.now(timezone.utc)
    await db_session.execute(  # type: ignore[attr-defined]
        update(Usuario)
        .where(Usuario.email == "test@example.com")
        .values(eliminado_en=now)
    )
    await db_session.commit()  # type: ignore[attr-defined]

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_usuario_desactivado(
    client: AsyncClient, db_session: object, registered_user: dict
) -> None:
    """Scenario: Usuario con activo=False → 403 ACCOUNT_DISABLED."""
    from sqlalchemy import update
    from app.modules.usuarios.model import Usuario

    await db_session.execute(  # type: ignore[attr-defined]
        update(Usuario)
        .where(Usuario.email == "test@example.com")
        .values(activo=False)
    )
    await db_session.commit()  # type: ignore[attr-defined]

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert resp.status_code == 403
    body = resp.json()
    assert body["code"] == "ACCOUNT_DISABLED"
    assert "desactivada" in body["detail"].lower()


@pytest.mark.asyncio
async def test_login_neutral_response_same_detail(
    client: AsyncClient, registered_user: dict
) -> None:
    """Verify that bad email and bad password return identical response shape."""
    bad_email = await client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "password123"},
    )
    bad_pw = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "wrongpassword"},
    )
    assert bad_email.status_code == bad_pw.status_code == 401
    assert bad_email.json()["detail"] == bad_pw.json()["detail"]
    assert bad_email.json()["code"] == bad_pw.json()["code"]
