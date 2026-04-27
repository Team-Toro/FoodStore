"""Tests for GET /api/v1/auth/me — covers spec scenarios."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_me_with_valid_token(
    client: AsyncClient, registered_user: dict
) -> None:
    """Scenario: /me con access token válido → 200 + user data with roles."""
    access_token = registered_user["access_token"]

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert data["nombre"] == "Test"
    assert data["apellido"] == "User"
    assert "roles" in data
    assert "CLIENT" in data["roles"]
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_me_without_token(client: AsyncClient, seed_roles: None) -> None:
    """Scenario: /me sin token → 401."""
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_with_expired_token(
    client: AsyncClient, seed_roles: None
) -> None:
    """Scenario: /me con token expirado → 401 TOKEN_EXPIRED."""
    from datetime import datetime, timezone, timedelta
    from app.core.security import create_access_token

    # Create a token that expired 1 hour ago
    expired_token = create_access_token(
        data={"sub": "999", "email": "x@x.com", "roles": []},
        expires_delta=timedelta(hours=-1),
    )
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_me_with_invalid_token(
    client: AsyncClient, seed_roles: None
) -> None:
    """Scenario: /me con token inválido (firma mal) → 401 TOKEN_INVALID."""
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this.is.not.a.valid.jwt"},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "TOKEN_INVALID"
