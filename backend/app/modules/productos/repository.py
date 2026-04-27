from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy import delete, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repository import BaseRepository
from app.modules.categorias.model import Categoria
from app.modules.ingredientes.model import Ingrediente
from app.modules.productos.model import Producto, ProductoCategoria, ProductoIngrediente


class ProductoRepository(BaseRepository[Producto]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Producto)

    async def get_by_id(self, producto_id: int) -> Optional[Producto]:
        """Return active producto by id, or None."""
        stmt = (
            select(Producto)
            .where(Producto.id == producto_id)
            .where(Producto.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_paginated(
        self,
        categoria_id: Optional[int] = None,
        nombre: Optional[str] = None,
        disponible: Optional[bool] = None,
        excluir_alergenos: Optional[list[int]] = None,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Producto], int]:
        """Return a paginated list of active productos with optional filters."""
        base_stmt = select(Producto).where(Producto.eliminado_en.is_(None))

        if disponible is not None:
            base_stmt = base_stmt.where(Producto.disponible == disponible)

        if nombre is not None:
            base_stmt = base_stmt.where(Producto.nombre.ilike(f"%{nombre}%"))

        if categoria_id is not None:
            base_stmt = base_stmt.join(
                ProductoCategoria,
                ProductoCategoria.producto_id == Producto.id,
            ).where(ProductoCategoria.categoria_id == categoria_id)

        if excluir_alergenos:
            has_alergeno = (
                select(ProductoIngrediente)
                .where(ProductoIngrediente.producto_id == Producto.id)
                .where(ProductoIngrediente.ingrediente_id.in_(excluir_alergenos))
                .exists()
            )
            base_stmt = base_stmt.where(~has_alergeno)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        data_stmt = base_stmt.offset((page - 1) * size).limit(size)
        data_result = await self.session.execute(data_stmt)
        items = data_result.scalars().all()

        return items, total

    async def get_categorias(self, producto_id: int) -> Sequence[Categoria]:
        """Return list of categorias for a producto via JOIN."""
        stmt = (
            select(Categoria)
            .join(ProductoCategoria, ProductoCategoria.categoria_id == Categoria.id)
            .where(ProductoCategoria.producto_id == producto_id)
            .where(Categoria.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_ingredientes(
        self, producto_id: int
    ) -> Sequence[tuple[Ingrediente, ProductoIngrediente]]:
        """Return list of (Ingrediente, ProductoIngrediente) for a producto."""
        stmt = (
            select(Ingrediente, ProductoIngrediente)
            .join(
                ProductoIngrediente,
                ProductoIngrediente.ingrediente_id == Ingrediente.id,
            )
            .where(ProductoIngrediente.producto_id == producto_id)
            .where(Ingrediente.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.all()

    async def sync_categorias(
        self, producto_id: int, categoria_ids: list[int]
    ) -> None:
        """Replace all categoria associations for a producto."""
        await self.session.execute(
            delete(ProductoCategoria).where(
                ProductoCategoria.producto_id == producto_id
            )
        )
        for cat_id in categoria_ids:
            self.session.add(
                ProductoCategoria(producto_id=producto_id, categoria_id=cat_id)
            )
        await self.session.flush()

    async def sync_ingredientes(
        self,
        producto_id: int,
        ingredientes_data: list[dict],
    ) -> None:
        """Replace all ingrediente associations for a producto.

        ingredientes_data: list of {'ingrediente_id': int, 'es_removible': bool}
        """
        await self.session.execute(
            delete(ProductoIngrediente).where(
                ProductoIngrediente.producto_id == producto_id
            )
        )
        for item in ingredientes_data:
            self.session.add(
                ProductoIngrediente(
                    producto_id=producto_id,
                    ingrediente_id=item["ingrediente_id"],
                    es_removible=item.get("es_removible", False),
                )
            )
        await self.session.flush()

    async def list_paginated_admin(
        self,
        nombre: Optional[str] = None,
        disponible: Optional[bool] = None,
        incluir_eliminados: bool = False,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Producto], int]:
        """Return a paginated list of products for admin. Optionally include soft-deleted."""
        base_stmt = select(Producto)

        if not incluir_eliminados:
            base_stmt = base_stmt.where(Producto.eliminado_en.is_(None))

        if disponible is not None:
            base_stmt = base_stmt.where(Producto.disponible == disponible)

        if nombre is not None:
            base_stmt = base_stmt.where(Producto.nombre.ilike(f"%{nombre}%"))

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        data_stmt = base_stmt.order_by(Producto.id).offset((page - 1) * size).limit(size)
        data_result = await self.session.execute(data_stmt)
        items = data_result.scalars().all()

        return items, total

    async def get_for_update(self, producto_id: int) -> Optional[Producto]:
        """Return active producto by id with SELECT FOR UPDATE row lock.

        Falls back to a plain SELECT on SQLite (no FOR UPDATE support).
        """
        try:
            stmt = (
                select(Producto)
                .where(Producto.id == producto_id)
                .where(Producto.eliminado_en.is_(None))
                .with_for_update()
            )
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception:
            # SQLite used in tests does not support FOR UPDATE — fall back
            return await self.get_by_id(producto_id)

    async def update_stock_atomico(self, producto_id: int, delta: int) -> bool:
        """Atomically update stock by delta.

        Returns False if the update would result in a negative stock.
        """
        stmt = (
            update(Producto)
            .where(Producto.id == producto_id)
            .where(Producto.eliminado_en.is_(None))
            .where(Producto.stock_cantidad + delta >= 0)
            .values(stock_cantidad=Producto.stock_cantidad + delta)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount > 0
