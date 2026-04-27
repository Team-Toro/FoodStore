"""Tests for POST /api/v1/auth/register — covers spec scenarios."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, seed_roles: None) -> None:
    """Scenario: Registro exitoso con datos válidos → 201 + token pair."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "nombre": "Juan",
            "apellido": "Perez",
            "email": "juan@example.com",
            "password": "securepassword",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 1800


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, seed_roles: None) -> None:
    """Scenario: Email ya registrado → 409 EMAIL_ALREADY_EXISTS."""
    payload = {
        "nombre": "Ana",
        "apellido": "García",
        "email": "ana@example.com",
        "password": "securepassword",
    }
    # First registration succeeds
    r1 = await client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201

    # Second registration with same email
    r2 = await client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409
    body = r2.json()
    assert body["code"] == "EMAIL_ALREADY_EXISTS"
    assert body.get("field") == "email"


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient, seed_roles: None) -> None:
    """Scenario: Contraseña menor a 8 caracteres → 422."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "nombre": "Carlos",
            "apellido": "Lopez",
            "email": "carlos@example.com",
            "password": "short",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient, seed_roles: None) -> None:
    """Scenario: Email con formato inválido → 422."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "nombre": "Maria",
            "apellido": "Torres",
            "email": "not-an-email",
            "password": "securepassword",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_extra_rol_field_ignored(
    client: AsyncClient, seed_roles: None
) -> None:
    """Scenario: Rol enviado en el body es ignorado — user gets CLIENT role only."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "nombre": "Hacker",
            "apellido": "Attempt",
            "email": "hacker@example.com",
            "password": "securepassword",
            "rol": "ADMIN",  # should be ignored
        },
    )
    assert resp.status_code == 201
    # Verify the user only has CLIENT role via /me
    access_token = resp.json()["access_token"]
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["roles"] == ["CLIENT"]
