from __future__ import annotations

from datetime import datetime, timedelta, timezone  # timezone kept for rotate()
from typing import TYPE_CHECKING

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token

if TYPE_CHECKING:
    from app.modules.usuarios.model import Usuario


def _make_expires_at() -> datetime:
    return datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)


def _build_access_claims(usuario: "Usuario") -> dict:
    """Build the access token claims dict from a Usuario with roles loaded."""
    roles = [ur.rol.codigo for ur in usuario.usuario_roles if ur.rol is not None]
    return {
        "sub": str(usuario.id),
        "email": usuario.email,
        "roles": roles,
    }


async def emit_pair(uow: object, usuario: "Usuario") -> tuple[str, str]:
    """Create a new refresh token in the DB and issue an access token.

    Returns:
        (access_token, refresh_token_uuid) tuple.
    """
    refresh_uuid = create_refresh_token()
    expires_at = _make_expires_at()

    await uow.refresh_tokens.create(  # type: ignore[attr-defined]
        usuario_id=usuario.id,
        token_uuid=refresh_uuid,
        expires_at=expires_at,
    )

    access_token = create_access_token(_build_access_claims(usuario))
    return access_token, refresh_uuid


async def rotate(uow: object, token_uuid: str) -> tuple[str, str, "Usuario"]:
    """Rotate a refresh token: validate, revoke old, issue new pair.

    Implements the full replay-detection logic (Design decision 3):
    1. Hash token, find with FOR UPDATE.
    2. Not found → 401 INVALID.
    3. Found but revoked → revoke ALL active tokens for user → 401 REUSED.
    4. Found, active but expired → 401 EXPIRED.
    5. Found, active, valid → revoke old, create new, emit pair.

    Returns:
        (access_token, new_refresh_token_uuid, usuario) tuple.

    Raises:
        HTTPException 401 on any token problem.
    """
    token_row = await uow.refresh_tokens.get_by_token_with_lock(token_uuid)  # type: ignore[attr-defined]

    if token_row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
            headers={"X-Error-Code": "REFRESH_TOKEN_INVALID"},
        )

    if token_row.revoked_at is not None:
        # Replay attack — revoke all active tokens for this user
        await uow.refresh_tokens.revoke_all_for_user(token_row.usuario_id)  # type: ignore[attr-defined]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token reusado",
            headers={"X-Error-Code": "REFRESH_TOKEN_REUSED"},
        )

    now = datetime.now(timezone.utc)
    # Make expires_at timezone-aware if it isn't (DB may return naive datetime)
    expires_at = token_row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expirado",
            headers={"X-Error-Code": "REFRESH_TOKEN_EXPIRED"},
        )

    # Load user with roles
    usuario = await uow.usuarios.get_with_roles(token_row.usuario_id)  # type: ignore[attr-defined]
    if usuario is None or usuario.eliminado_en is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
            headers={"X-Error-Code": "REFRESH_TOKEN_INVALID"},
        )

    # Revoke old token
    await uow.refresh_tokens.revoke(token_row)  # type: ignore[attr-defined]

    # Issue new pair
    access_token, new_refresh_uuid = await emit_pair(uow, usuario)
    return access_token, new_refresh_uuid, usuario
