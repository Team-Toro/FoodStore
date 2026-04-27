from __future__ import annotations

from typing import Callable, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError
from pydantic import BaseModel

from app.core.security import decode_access_token
from app.core.uow import UnitOfWork

# auto_error=False so we can return custom TOKEN_MISSING code
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


class CurrentUser(BaseModel):
    """DTO representing the authenticated user injected via FastAPI dependency."""

    id: int
    email: str
    roles: list[str]


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
) -> CurrentUser:
    """FastAPI dependency that decodes the Bearer token and loads the user.

    Raises 401 if:
    - Token is missing (TOKEN_MISSING)
    - Token is expired (TOKEN_EXPIRED)
    - Token is invalid (TOKEN_INVALID)
    - Token type is not "access"
    - User does not exist or is soft-deleted
    """
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer", "X-Error-Code": "TOKEN_MISSING"},
        )

    try:
        payload = decode_access_token(token)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
            headers={"WWW-Authenticate": "Bearer", "X-Error-Code": "TOKEN_EXPIRED"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer", "X-Error-Code": "TOKEN_INVALID"},
        )

    # Validate token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer", "X-Error-Code": "TOKEN_INVALID"},
        )

    user_id_raw = payload.get("sub")
    if user_id_raw is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer", "X-Error-Code": "TOKEN_INVALID"},
        )

    try:
        user_id = int(user_id_raw)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer", "X-Error-Code": "TOKEN_INVALID"},
        )

    async with UnitOfWork() as uow:
        usuario = await uow.usuarios.get_with_roles(user_id)

    if usuario is None or usuario.eliminado_en is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer", "X-Error-Code": "TOKEN_INVALID"},
        )

    roles = [ur.rol.codigo for ur in usuario.usuario_roles if ur.rol is not None]

    return CurrentUser(id=usuario.id, email=usuario.email, roles=roles)


def require_roles(*codigos: str) -> Callable[[CurrentUser], CurrentUser]:
    """Factory that returns a dependency requiring at least one of the given roles.

    Usage::

        @router.get("/admin", dependencies=[Depends(require_roles("ADMIN", "STOCK"))])
        async def admin_endpoint(): ...

    If no codigos are passed, only authentication is required (any role is accepted).
    """

    async def _check_roles(
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        if codigos and not (set(current_user.roles) & set(codigos)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta acción",
            )
        return current_user

    return _check_roles
