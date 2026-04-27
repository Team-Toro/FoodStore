from __future__ import annotations

from fastapi import HTTPException, status

from app.core.security import dummy_verify, hash_password, verify_password
from app.modules.auth.schemas import LoginRequest, RegisterRequest, TokenResponse
from app.modules.refreshtokens import service as rt_service
from app.modules.usuarios import service as user_service
from app.modules.usuarios.schemas import PasswordChange, UserResponse, UserUpdate
from app.modules.usuarios.service import verificar_activo


async def register(uow: object, data: RegisterRequest) -> TokenResponse:
    """Register a new CLIENT user and return a token pair."""
    usuario = await user_service.crear_cliente(uow, data)

    # Reload with roles for token claims
    usuario_with_roles = await uow.usuarios.get_with_roles(usuario.id)  # type: ignore[attr-defined]
    access_token, refresh_token = await rt_service.emit_pair(uow, usuario_with_roles)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


async def login(uow: object, data: LoginRequest) -> TokenResponse:
    """Validate credentials and return a token pair.

    Always executes bcrypt verification to prevent timing attacks (RN-AU08):
    - If email not found: run dummy verify to normalise timing, then 401.
    - If email found but deleted_at set: run dummy verify, then 401.
    - If password mismatch: 401.
    - If valid: emit new token pair.
    """
    usuario = await uow.usuarios.get_by_email(str(data.email))  # type: ignore[attr-defined]

    if usuario is None or usuario.eliminado_en is not None:
        # Run dummy bcrypt to equalise timing
        dummy_verify()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"X-Error-Code": "INVALID_CREDENTIALS"},
        )

    if not verify_password(data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"X-Error-Code": "INVALID_CREDENTIALS"},
        )

    # Check account is active before emitting tokens
    verificar_activo(usuario)

    # Load roles before emitting tokens
    usuario_with_roles = await uow.usuarios.get_with_roles(usuario.id)  # type: ignore[attr-defined]
    access_token, refresh_token = await rt_service.emit_pair(uow, usuario_with_roles)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


async def refresh(uow: object, token: str) -> TokenResponse:
    """Rotate a refresh token and return a new token pair."""
    access_token, new_refresh_token, _usuario = await rt_service.rotate(uow, token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )


async def logout(uow: object, token: str) -> None:
    """Revoke a specific refresh token (idempotent).

    Does NOT revoke the whole family — that only happens on replay detection.
    """
    token_row = await uow.refresh_tokens.get_by_token(token)  # type: ignore[attr-defined]
    if token_row is not None:
        await uow.refresh_tokens.revoke(token_row)  # type: ignore[attr-defined]
    # If token not found: silently succeed (idempotent)


async def get_me(uow: object, usuario_id: int) -> UserResponse:
    """Return the authenticated user's profile."""
    return await user_service.get_user_response(uow, usuario_id)


async def update_perfil(uow: object, usuario_id: int, data: UserUpdate) -> UserResponse:
    """Update the authenticated user's profile (nombre, apellido, telefono)."""
    usuario = await uow.usuarios.get_with_roles(usuario_id)  # type: ignore[attr-defined]
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    updates = data.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(usuario, key, value)
    uow.session.add(usuario)  # type: ignore[attr-defined]
    await uow.session.flush()  # type: ignore[attr-defined]

    roles = [ur.rol.codigo for ur in usuario.usuario_roles if ur.rol is not None]
    return UserResponse(
        id=usuario.id,
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        email=usuario.email,
        telefono=usuario.telefono,
        roles=roles,
        creado_en=usuario.creado_en,
    )


async def change_password(uow: object, usuario_id: int, data: PasswordChange) -> None:
    """Change the authenticated user's password after verifying the current one."""
    usuario = await uow.usuarios.get_with_roles(usuario_id)  # type: ignore[attr-defined]
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if not verify_password(data.password_actual, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta",
            headers={"X-Error-Code": "WRONG_PASSWORD"},
        )

    usuario.password_hash = hash_password(data.password_nuevo)
    uow.session.add(usuario)  # type: ignore[attr-defined]
    await uow.session.flush()  # type: ignore[attr-defined]
