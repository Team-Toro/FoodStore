from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repository import BaseRepository
from app.modules.pedidos.model import DetallePedido, HistorialEstadoPedido, Pedido


class PedidoRepository(BaseRepository[Pedido]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Pedido)

    async def get_by_id(self, pedido_id: int) -> Optional[Pedido]:
        """Return active pedido by id, or None."""
        stmt = (
            select(Pedido)
            .where(Pedido.id == pedido_id)
            .where(Pedido.eliminado_en.is_(None))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_paginated(
        self,
        usuario_id: Optional[int] = None,
        estado: Optional[str] = None,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Pedido], int]:
        """Return paginated list of active pedidos with optional filters."""
        base_stmt = select(Pedido).where(Pedido.eliminado_en.is_(None))

        if usuario_id is not None:
            base_stmt = base_stmt.where(Pedido.usuario_id == usuario_id)

        if estado is not None:
            base_stmt = base_stmt.where(Pedido.estado_codigo == estado)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        data_stmt = (
            base_stmt
            .order_by(Pedido.creado_en.desc())
            .offset((page - 1) * size)
            .limit(size)
        )
        data_result = await self.session.execute(data_stmt)
        items = data_result.scalars().all()

        return items, total

    async def count_activos_por_direccion(self, direccion_id: int) -> int:
        """Count active (non-terminal) pedidos linked to a delivery address."""
        ESTADOS_ACTIVOS = ["PENDIENTE", "CONFIRMADO", "EN_PREP", "EN_CAMINO"]
        stmt = (
            select(func.count())
            .select_from(Pedido)
            .where(Pedido.direccion_id == direccion_id)
            .where(Pedido.eliminado_en.is_(None))
            .where(Pedido.estado_codigo.in_(ESTADOS_ACTIVOS))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()


class DetallePedidoRepository(BaseRepository[DetallePedido]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DetallePedido)

    async def create_bulk(self, detalles: list[DetallePedido]) -> list[DetallePedido]:
        """Insert multiple DetallePedido records and return them with IDs."""
        for detalle in detalles:
            self.session.add(detalle)
        await self.session.flush()
        for detalle in detalles:
            await self.session.refresh(detalle)
        return detalles

    async def get_by_pedido_id(self, pedido_id: int) -> Sequence[DetallePedido]:
        """Return all line items for a pedido."""
        stmt = select(DetallePedido).where(DetallePedido.pedido_id == pedido_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()


class HistorialEstadoPedidoRepository(BaseRepository[HistorialEstadoPedido]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, HistorialEstadoPedido)

    async def append(self, registro: HistorialEstadoPedido) -> HistorialEstadoPedido:
        """Insert a new history record — append-only, never UPDATE/DELETE."""
        self.session.add(registro)
        await self.session.flush()
        await self.session.refresh(registro)
        return registro

    async def get_by_pedido_id(self, pedido_id: int) -> Sequence[HistorialEstadoPedido]:
        """Return full history for a pedido ordered by creado_en ASC."""
        stmt = (
            select(HistorialEstadoPedido)
            .where(HistorialEstadoPedido.pedido_id == pedido_id)
            .order_by(HistorialEstadoPedido.creado_en.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
