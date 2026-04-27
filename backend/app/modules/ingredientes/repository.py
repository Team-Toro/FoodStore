from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repository import BaseRepository
from app.modules.ingredientes.model import Ingrediente


class IngredienteRepository(BaseRepository[Ingrediente]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Ingrediente)

    async def get_by_id(self, ingrediente_id: int) -> Optional[Ingrediente]:
        """Return active ingrediente by id, or None."""
        stmt = (
            select(Ingrediente)
            .where(Ingrediente.id == ingrediente_id)
            .where(Ingrediente.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_nombre(self, nombre: str, exclude_id: Optional[int] = None) -> Optional[Ingrediente]:
        """Return active ingrediente with the given nombre, or None."""
        stmt = (
            select(Ingrediente)
            .where(Ingrediente.nombre == nombre)
            .where(Ingrediente.eliminado_en.is_(None))
        )
        if exclude_id is not None:
            stmt = stmt.where(Ingrediente.id != exclude_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_paginated(
        self,
        es_alergeno: Optional[bool] = None,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Ingrediente], int]:
        """Return a paginated list of active ingredientes with optional filter."""
        base_stmt = select(Ingrediente).where(Ingrediente.eliminado_en.is_(None))
        if es_alergeno is not None:
            base_stmt = base_stmt.where(Ingrediente.es_alergeno == es_alergeno)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        data_stmt = base_stmt.offset((page - 1) * size).limit(size)
        data_result = await self.session.execute(data_stmt)
        items = data_result.scalars().all()

        return items, total
