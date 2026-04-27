from datetime import datetime
from typing import Optional

from sqlalchemy import CHAR, Column
from sqlmodel import Field, SQLModel


class RefreshToken(SQLModel, table=True):
    """Stores hashed refresh tokens for JWT rotation."""

    __tablename__ = "refresh_token"

    id: Optional[int] = Field(default=None, primary_key=True)
    token_hash: str = Field(sa_column=Column(CHAR(64), unique=True, nullable=False))
    usuario_id: int = Field(foreign_key="usuario.id", nullable=False)
    expires_at: datetime = Field(nullable=False)
    revoked_at: Optional[datetime] = Field(default=None)
