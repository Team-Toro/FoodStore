from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repository import BaseRepository
from app.modules.direcciones.model import DireccionEntrega


class DireccionRepository(BaseRepository[DireccionEntrega]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DireccionEntrega)

    async def list_by_usuario(self, usuario_id: int) -> Sequence[DireccionEntrega]:
        """Return all active addresses for a user."""
        stmt = (
            select(DireccionEntrega)
            .where(DireccionEntrega.usuario_id == usuario_id)
            .where(DireccionEntrega.eliminado_en.is_(None))
            .order_by(DireccionEntrega.es_principal.desc(), DireccionEntrega.creado_en.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_id_and_usuario(
        self, id: int, usuario_id: int
    ) -> Optional[DireccionEntrega]:
        """Return active address by id, enforcing ownership."""
        stmt = (
            select(DireccionEntrega)
            .where(DireccionEntrega.id == id)
            .where(DireccionEntrega.usuario_id == usuario_id)
            .where(DireccionEntrega.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def clear_principal(self, usuario_id: int) -> None:
        """Mass UPDATE: set es_principal = False for all active addresses of the user."""
        stmt = (
            update(DireccionEntrega)
            .where(DireccionEntrega.usuario_id == usuario_id)
            .where(DireccionEntrega.eliminado_en.is_(None))
            .values(es_principal=False)
        )
        await self.session.execute(stmt)

    async def count_for_usuario(self, usuario_id: int) -> int:
        """Return the count of active addresses for the user."""
        stmt = (
            select(func.count())
            .select_from(DireccionEntrega)
            .where(DireccionEntrega.usuario_id == usuario_id)
            .where(DireccionEntrega.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()
