from __future__ import annotations

from datetime import datetime
from typing import Optional, Sequence

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repository import BaseRepository
from app.modules.categorias.model import Categoria
from app.modules.categorias.schemas import CategoriaCreate, CategoriaUpdate


class CategoriaRepository(BaseRepository[Categoria]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Categoria)

    async def get_by_id(self, categoria_id: int) -> Optional[Categoria]:
        """Return active categoria by id, or None."""
        stmt = (
            select(Categoria)
            .where(Categoria.id == categoria_id)
            .where(Categoria.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_flat(self) -> Sequence[Categoria]:
        """Return all active categorias ordered by depth using recursive CTE.

        For SQLite (tests) falls back to a simple SELECT ordered by padre_id nulls first.
        For PostgreSQL uses a recursive CTE.
        """
        dialect = self.session.bind.dialect.name if self.session.bind else "postgresql"

        if dialect == "sqlite":
            # SQLite: simple flat query (recursive CTEs not supported in this context)
            stmt = (
                select(Categoria)
                .where(Categoria.eliminado_en.is_(None))
                .order_by(Categoria.padre_id.nullsfirst(), Categoria.id)
            )
            result = await self.session.execute(stmt)
            return result.scalars().all()

        # PostgreSQL: recursive CTE for depth-first ordering
        sql = text("""
            WITH RECURSIVE cat_tree AS (
                SELECT id, nombre, padre_id, eliminado_en, creado_en, actualizado_en, 0 AS depth
                FROM categoria
                WHERE padre_id IS NULL AND eliminado_en IS NULL

                UNION ALL

                SELECT c.id, c.nombre, c.padre_id, c.eliminado_en, c.creado_en, c.actualizado_en, ct.depth + 1
                FROM categoria c
                JOIN cat_tree ct ON c.padre_id = ct.id
                WHERE c.eliminado_en IS NULL
            )
            SELECT id, nombre, padre_id, eliminado_en, creado_en, actualizado_en
            FROM cat_tree
            ORDER BY depth, id
        """)
        result = await self.session.execute(sql)
        rows = result.mappings().all()
        categorias = []
        for row in rows:
            cat = Categoria(
                id=row["id"],
                nombre=row["nombre"],
                padre_id=row["padre_id"],
                eliminado_en=row["eliminado_en"],
                creado_en=row["creado_en"],
                actualizado_en=row["actualizado_en"],
            )
            categorias.append(cat)
        return categorias

    async def get_direct_children(self, padre_id: Optional[int]) -> Sequence[Categoria]:
        """Return direct active children of a given padre_id (or root categories if None)."""
        stmt = (
            select(Categoria)
            .where(Categoria.eliminado_en.is_(None))
        )
        if padre_id is None:
            stmt = stmt.where(Categoria.padre_id.is_(None))
        else:
            stmt = stmt.where(Categoria.padre_id == padre_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_nombre_and_parent(
        self,
        nombre: str,
        padre_id: Optional[int],
        exclude_id: Optional[int] = None,
    ) -> Optional[Categoria]:
        """Return an active categoria with this nombre at the same level, or None."""
        stmt = (
            select(Categoria)
            .where(Categoria.nombre == nombre)
            .where(Categoria.eliminado_en.is_(None))
        )
        if padre_id is None:
            stmt = stmt.where(Categoria.padre_id.is_(None))
        else:
            stmt = stmt.where(Categoria.padre_id == padre_id)
        if exclude_id is not None:
            stmt = stmt.where(Categoria.id != exclude_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, data: CategoriaCreate) -> Categoria:
        """Insert a new categoria and return it."""
        cat = Categoria(nombre=data.nombre, padre_id=data.padre_id)
        return await super().create(cat)

    async def update(self, categoria: Categoria, data: CategoriaUpdate) -> Categoria:
        """Apply partial updates to a categoria and return it."""
        if data.nombre is not None:
            categoria.nombre = data.nombre
        if data.padre_id is not None or "padre_id" in data.model_fields_set:
            categoria.padre_id = data.padre_id
        return await super().update(categoria)

    async def soft_delete(self, categoria: Categoria) -> Categoria:
        """Soft delete a categoria."""
        categoria.eliminado_en = datetime.utcnow()
        self.session.add(categoria)
        await self.session.flush()
        return categoria

    async def has_active_products(self, categoria_id: int) -> bool:
        """Return True if the categoria has at least one active (non-deleted) product."""
        from app.modules.productos.model import Producto, ProductoCategoria

        stmt = (
            select(ProductoCategoria.producto_id)
            .join(Producto, Producto.id == ProductoCategoria.producto_id)
            .where(ProductoCategoria.categoria_id == categoria_id)
            .where(Producto.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def has_active_children(self, categoria_id: int) -> bool:
        """Return True if the categoria has active children."""
        stmt = (
            select(Categoria.id)
            .where(Categoria.padre_id == categoria_id)
            .where(Categoria.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def get_ancestors(self, categoria_id: int) -> list[int]:
        """Return list of ancestor IDs (from direct parent up to root).

        For SQLite (tests) iterates queries. For PostgreSQL uses recursive CTE.
        """
        dialect = self.session.bind.dialect.name if self.session.bind else "postgresql"

        if dialect == "sqlite":
            # Iterative approach for SQLite
            ancestors: list[int] = []
            current_id = categoria_id
            visited = set()
            while True:
                if current_id in visited:
                    break
                visited.add(current_id)
                stmt = select(Categoria.padre_id).where(Categoria.id == current_id)
                result = await self.session.execute(stmt)
                padre_id = result.scalar_one_or_none()
                if padre_id is None:
                    break
                ancestors.append(padre_id)
                current_id = padre_id
            return ancestors

        # PostgreSQL: recursive CTE
        sql = text("""
            WITH RECURSIVE ancestors AS (
                SELECT padre_id AS ancestor_id
                FROM categoria
                WHERE id = :id

                UNION ALL

                SELECT c.padre_id
                FROM categoria c
                JOIN ancestors a ON c.id = a.ancestor_id
                WHERE a.ancestor_id IS NOT NULL
            )
            SELECT ancestor_id FROM ancestors WHERE ancestor_id IS NOT NULL
        """)
        result = await self.session.execute(sql, {"id": categoria_id})
        return [row[0] for row in result.fetchall()]
