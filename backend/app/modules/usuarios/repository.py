from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.base_repository import BaseRepository
from app.modules.usuarios.model import Rol, Usuario, UsuarioRol


class UsuarioRepository(BaseRepository[Usuario]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Usuario)

    async def get_by_email(self, email: str) -> Optional[Usuario]:
        """Return a non-deleted user by email, or None."""
        stmt = (
            select(Usuario)
            .where(Usuario.email == email)
            .where(Usuario.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_with_roles(self, usuario_id: int) -> Optional[Usuario]:
        """Return a user with eagerly loaded roles, or None."""
        stmt = (
            select(Usuario)
            .where(Usuario.id == usuario_id)
            .options(
                selectinload(Usuario.usuario_roles).selectinload(UsuarioRol.rol)
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def email_exists(self, email: str) -> bool:
        """Return True if an active user with this email already exists."""
        stmt = (
            select(Usuario.id)
            .where(Usuario.email == email)
            .where(Usuario.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None


class RolRepository(BaseRepository[Rol]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Rol)

    async def get_by_codigo(self, codigo: str) -> Optional[Rol]:
        """Return a role by its unique code."""
        stmt = select(Rol).where(Rol.codigo == codigo)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class UsuarioRolRepository(BaseRepository[UsuarioRol]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, UsuarioRol)

    async def assign_rol(self, usuario_id: int, rol_id: int) -> UsuarioRol:
        """Create a UsuarioRol association and flush it to the DB."""
        usuario_rol = UsuarioRol(usuario_id=usuario_id, rol_id=rol_id)
        return await self.create(usuario_rol)
