from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repository import BaseRepository
from app.core.security import hash_refresh_token
from app.modules.refreshtokens.model import RefreshToken


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, RefreshToken)

    async def create(
        self,
        usuario_id: int,
        token_uuid: str,
        expires_at: datetime,
    ) -> RefreshToken:
        """Persist a new refresh token row (hash is stored, not the raw UUID)."""
        token = RefreshToken(
            token_hash=hash_refresh_token(token_uuid),
            usuario_id=usuario_id,
            expires_at=expires_at,
        )
        self.session.add(token)
        await self.session.flush()
        await self.session.refresh(token)
        return token

    async def get_by_token(self, token_uuid: str) -> Optional[RefreshToken]:
        """Look up a refresh token row by the raw UUID (hashed internally)."""
        token_hash = hash_refresh_token(token_uuid)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_token_with_lock(self, token_uuid: str) -> Optional[RefreshToken]:
        """Look up a refresh token row with SELECT FOR UPDATE to prevent race conditions."""
        token_hash = hash_refresh_token(token_uuid)
        stmt = (
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .with_for_update()
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke(self, token: RefreshToken) -> RefreshToken:
        """Set revoked_at = now() on the given token (idempotent)."""
        if token.revoked_at is None:
            token.revoked_at = datetime.utcnow()
            self.session.add(token)
            await self.session.flush()
        return token

    async def revoke_all_for_user(self, usuario_id: int) -> None:
        """Revoke all active refresh tokens for a user (replay attack mitigation)."""
        now = datetime.utcnow()
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.usuario_id == usuario_id)
            .where(RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await self.session.execute(stmt)
        await self.session.flush()
