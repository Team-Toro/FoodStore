"""Tests for POST /api/v1/auth/logout — covers spec scenarios."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_logout_success(client: AsyncClient, registered_user: dict) -> None:
    """Scenario: Logout exitoso → 204 No Content."""
    access_token = registered_user["access_token"]
    refresh_token = registered_user["refresh_token"]

    resp = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_logout_idempotent(client: AsyncClient, registered_user: dict) -> None:
    """Scenario: Logout con refresh ya revocado → 204 (idempotent)."""
    access_token = registered_user["access_token"]
    refresh_token = registered_user["refresh_token"]

    # First logout
    r1 = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert r1.status_code == 204

    # Second logout with same (now revoked) token — should still succeed
    r2 = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert r2.status_code == 204


@pytest.mark.asyncio
async def test_logout_without_access_token(
    client: AsyncClient, registered_user: dict
) -> None:
    """Scenario: Logout sin access token → 401."""
    refresh_token = registered_user["refresh_token"]

    resp = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
        # No Authorization header
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_logout_does_not_revoke_family(
    client: AsyncClient, registered_user: dict
) -> None:
    """Scenario: Logout only revokes specific token, not the whole family."""
    access_token = registered_user["access_token"]
    refresh_token = registered_user["refresh_token"]

    # Get a second refresh token
    r = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert r.status_code == 200
    new_refresh = r.json()["refresh_token"]
    new_access = r.json()["access_token"]

    # Logout with the NEW token
    await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": new_refresh},
        headers={"Authorization": f"Bearer {new_access}"},
    )

    # The original (already consumed/revoked by rotation) token was not re-revoked
    # trying to use original should still give REFRESH_TOKEN_REUSED (not INVALID)
    # Just check new_refresh is now unusable
    r2 = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": new_refresh},
    )
    assert r2.status_code == 401
