from typing import Optional

from sqlmodel import Field, SQLModel

from app.core.models import SoftDeleteModel


class DireccionEntrega(SoftDeleteModel, table=True):
    """Delivery address associated with a user."""

    __tablename__ = "direccion_entrega"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id", nullable=False, index=True)
    linea1: str = Field(max_length=255, nullable=False)
    linea2: Optional[str] = Field(default=None, max_length=255)
    ciudad: str = Field(max_length=100, nullable=False)
    codigo_postal: Optional[str] = Field(default=None, max_length=20)
    referencia: Optional[str] = Field(default=None)
    alias: Optional[str] = Field(default=None, max_length=100)
    es_principal: bool = Field(default=False, nullable=False)
