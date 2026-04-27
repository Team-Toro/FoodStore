from __future__ import annotations

from datetime import datetime
from typing import Generic, Optional, Sequence, Type, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel

T = TypeVar("T", bound=SQLModel)


class BaseRepository(Generic[T]):
    """Generic async repository with common CRUD operations.

    Subclasses pass the concrete model class in their constructor::

        class UsuarioRepository(BaseRepository[Usuario]):
            def __init__(self, session: AsyncSession) -> None:
                super().__init__(session, Usuario)
    """

    def __init__(self, session: AsyncSession, model: Type[T]) -> None:
        self.session = session
        self.model = model

    async def get_by_id(self, entity_id: int) -> Optional[T]:
        """Return a single entity by primary key, or None if not found."""
        return await self.session.get(self.model, entity_id)

    async def list_all(self, skip: int = 0, limit: int = 100) -> Sequence[T]:
        """Return all non-soft-deleted records."""
        stmt = select(self.model)
        if hasattr(self.model, "eliminado_en"):
            stmt = stmt.where(self.model.eliminado_en.is_(None))  # type: ignore[attr-defined]
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def count(self) -> int:
        """Return the count of non-soft-deleted records."""
        stmt = select(func.count()).select_from(self.model)
        if hasattr(self.model, "eliminado_en"):
            stmt = stmt.where(self.model.eliminado_en.is_(None))  # type: ignore[attr-defined]
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def create(self, entity: T) -> T:
        """Persist a new entity and flush to get its assigned ID."""
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def update(self, entity: T) -> T:
        """Persist changes to an existing entity."""
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def soft_delete(self, entity: T) -> T:
        """Set eliminado_en to now — entity remains in the database."""
        if not hasattr(entity, "eliminado_en"):
            raise TypeError(
                f"Model {type(entity).__name__} does not support soft delete"
            )
        entity.eliminado_en = datetime.utcnow()  # type: ignore[attr-defined]
        self.session.add(entity)
        await self.session.flush()
        return entity

    async def hard_delete(self, entity: T) -> None:
        """Physically remove the entity from the database."""
        await self.session.delete(entity)
        await self.session.flush()
