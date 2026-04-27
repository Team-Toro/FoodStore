from __future__ import annotations

from fastapi import HTTPException, status

from app.core.security import hash_password
from app.modules.usuarios.model import Usuario
from app.modules.usuarios.schemas import RegisterRequest, UserResponse


def verificar_activo(usuario: Usuario) -> None:
    """Raise 403 if the user account is deactivated.

    Called by auth service before emitting tokens (RN-admin).
    """
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
            headers={"X-Error-Code": "ACCOUNT_DISABLED"},
        )

# Fixed CLIENT role ID per seed data (RN-AU07)
CLIENT_ROL_ID = 4


async def crear_cliente(uow: object, data: RegisterRequest) -> Usuario:
    """Create a new user with the CLIENT role.

    Args:
        uow: UnitOfWork instance with .usuarios and .roles attributes.
        data: Validated registration payload.

    Raises:
        HTTPException 409: if the email is already registered.

    Returns:
        The newly created Usuario instance.
    """
    if await uow.usuarios.email_exists(data.email):  # type: ignore[attr-defined]
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya está registrado",
            headers={"X-Error-Code": "EMAIL_ALREADY_EXISTS", "X-Error-Field": "email"},
        )

    usuario = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        email=data.email,
        password_hash=hash_password(data.password),
        telefono=data.telefono,
    )
    usuario = await uow.usuarios.create(usuario)  # type: ignore[attr-defined]

    # Associate with CLIENT role (id=4) via repository — never touch uow.session directly
    await uow.usuario_roles.assign_rol(usuario.id, CLIENT_ROL_ID)  # type: ignore[attr-defined]

    return usuario


async def get_user_response(uow: object, usuario_id: int) -> UserResponse:
    """Return a UserResponse DTO for the given user ID.

    Raises:
        HTTPException 404: if the user is not found.
    """
    usuario = await uow.usuarios.get_with_roles(usuario_id)  # type: ignore[attr-defined]
    if usuario is None or usuario.eliminado_en is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

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
