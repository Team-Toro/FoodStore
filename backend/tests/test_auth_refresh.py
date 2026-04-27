"""Tests for POST /api/v1/auth/refresh — covers spec scenarios."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_refresh_valid(client: AsyncClient, registered_user: dict) -> None:
    """Scenario: Refresh válido → 200 + new token pair, old token revoked."""
    old_refresh = registered_user["refresh_token"]
    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    # New refresh token must be different from old
    assert data["refresh_token"] != old_refresh


@pytest.mark.asyncio
async def test_refresh_expired_token(
    client: AsyncClient, db_session: object, registered_user: dict
) -> None:
    """Scenario: Refresh token expirado → 401 REFRESH_TOKEN_EXPIRED."""
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import update
    from app.modules.refreshtokens.model import RefreshToken
    from app.core.security import hash_refresh_token

    old_refresh = registered_user["refresh_token"]
    token_hash = hash_refresh_token(old_refresh)

    # Expire the token by setting expires_at in the past
    past = datetime.now(timezone.utc) - timedelta(days=1)
    await db_session.execute(  # type: ignore[attr-defined]
        update(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .values(expires_at=past)
    )
    await db_session.commit()  # type: ignore[attr-defined]

    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "REFRESH_TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_refresh_nonexistent_token(
    client: AsyncClient, seed_roles: None
) -> None:
    """Scenario: Refresh token inexistente → 401 REFRESH_TOKEN_INVALID."""
    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "00000000-0000-0000-0000-000000000000"},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "REFRESH_TOKEN_INVALID"


@pytest.mark.asyncio
async def test_refresh_replay_revokes_family(
    client: AsyncClient, registered_user: dict
) -> None:
    """Scenario: Replay de refresh token ya revocado → 401 REFRESH_TOKEN_REUSED + family revoked."""
    old_refresh = registered_user["refresh_token"]

    # First use — legitimate
    r1 = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert r1.status_code == 200
    new_refresh = r1.json()["refresh_token"]

    # Replay the old token — should detect reuse
    r2 = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert r2.status_code == 401
    assert r2.json()["code"] == "REFRESH_TOKEN_REUSED"

    # The new token should also be revoked (family revocation)
    r3 = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": new_refresh},
    )
    assert r3.status_code == 401
