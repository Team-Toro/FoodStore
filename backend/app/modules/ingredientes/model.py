from typing import Optional

from sqlmodel import Field, SQLModel

from app.core.models import SoftDeleteModel


class Ingrediente(SoftDeleteModel, table=True):
    """An ingredient that can be associated with products."""

    __tablename__ = "ingrediente"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True, nullable=False)
    descripcion: Optional[str] = Field(default=None)
    es_alergeno: bool = Field(default=False, nullable=False)
