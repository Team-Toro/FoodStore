from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repository import BaseRepository
from app.modules.pagos.model import Pago


class PagoRepository(BaseRepository[Pago]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Pago)

    async def get_by_pedido_id(self, pedido_id: int) -> Optional[Pago]:
        """Return the most recent payment for a given pedido, or None."""
        stmt = (
            select(Pago)
            .where(Pago.pedido_id == pedido_id)
            .order_by(Pago.creado_en.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(self, key: str) -> Optional[Pago]:
        """Return a payment by its idempotency key, or None."""
        stmt = select(Pago).where(Pago.idempotency_key == key)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_mp_payment_id(self, mp_payment_id: str) -> Optional[Pago]:
        """Return a payment by its MercadoPago payment ID, or None."""
        stmt = select(Pago).where(Pago.mp_payment_id == mp_payment_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_pedido_id(self, pedido_id: int) -> Sequence[Pago]:
        """Return all payments for a given pedido ordered by created date asc."""
        stmt = (
            select(Pago)
            .where(Pago.pedido_id == pedido_id)
            .order_by(Pago.creado_en.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
