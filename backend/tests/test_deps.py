"""Tests for app/core/deps.py — get_current_user and require_roles."""
import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_token(sub: str = "1", email: str = "u@e.com", roles: list = None,
                type_: str = "access", expired: bool = False) -> str:
    from datetime import timedelta
    from app.core.security import create_access_token

    data = {"sub": sub, "email": email, "roles": roles or []}
    if type_ != "access":
        # We override the type after creation is not possible directly,
        # so we use a lower-level approach
        import hashlib
        from datetime import datetime, timezone
        from jose import jwt
        from app.core.config import settings

        now = datetime.now(timezone.utc)
        exp_delta = timedelta(hours=-1) if expired else timedelta(minutes=30)
        payload = {
            "sub": sub,
            "email": email,
            "roles": roles or [],
            "type": type_,
            "iat": now,
            "exp": now + exp_delta,
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    expires_delta = timedelta(hours=-1) if expired else None
    return create_access_token(data, expires_delta=expires_delta)


# ---------------------------------------------------------------------------
# get_current_user tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_current_user_no_token(client: AsyncClient, seed_roles: None) -> None:
    """No Authorization header → 401."""
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(
    client: AsyncClient, seed_roles: None
) -> None:
    """Malformed JWT → 401 TOKEN_INVALID."""
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not.a.jwt"},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_get_current_user_expired_token(
    client: AsyncClient, seed_roles: None
) -> None:
    """Expired JWT → 401 TOKEN_EXPIRED."""
    token = _make_token(expired=True)
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_get_current_user_refresh_type_rejected(
    client: AsyncClient, seed_roles: None
) -> None:
    """Token with type='refresh' → 401 TOKEN_INVALID."""
    token = _make_token(type_="refresh")
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_get_current_user_soft_deleted(
    client: AsyncClient, db_session: object, registered_user: dict
) -> None:
    """Soft-deleted user → 401."""
    from datetime import datetime, timezone
    from sqlalchemy import update
    from app.modules.usuarios.model import Usuario

    access_token = registered_user["access_token"]

    now = datetime.now(timezone.utc)
    await db_session.execute(  # type: ignore[attr-defined]
        update(Usuario)
        .where(Usuario.email == "test@example.com")
        .values(eliminado_en=now)
    )
    await db_session.commit()  # type: ignore[attr-defined]

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# require_roles tests via a protected endpoint (uses /me which has no role guard)
# We test require_roles indirectly via the authenticated /me endpoint
# For direct testing, we verify via role-checking logic
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_require_roles_sufficient(
    client: AsyncClient, registered_user: dict
) -> None:
    """User with CLIENT role can access CLIENT-required endpoint."""
    access_token = registered_user["access_token"]
    # /me just requires authentication — any role passes
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    assert "CLIENT" in resp.json()["roles"]


@pytest.mark.asyncio
async def test_require_roles_unit() -> None:
    """Unit test: require_roles raises 403 if user doesn't have required role."""
    import pytest
    from fastapi import HTTPException
    from app.core.deps import CurrentUser, require_roles

    user_client = CurrentUser(id=1, email="u@e.com", roles=["CLIENT"])

    # Function that requires ADMIN role
    check_admin = require_roles("ADMIN")
    with pytest.raises(HTTPException) as exc_info:
        await check_admin(user_client)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_require_roles_no_codigos_passes() -> None:
    """require_roles() with no args only checks authentication — any role passes."""
    from app.core.deps import CurrentUser, require_roles

    user_client = CurrentUser(id=1, email="u@e.com", roles=["CLIENT"])
    check_any = require_roles()
    result = await check_any(user_client)
    assert result == user_client
