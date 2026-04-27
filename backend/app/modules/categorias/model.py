from typing import Optional

from sqlmodel import Field, SQLModel

from app.core.models import SoftDeleteModel


class Categoria(SoftDeleteModel, table=True):
    """Product category with optional self-referencing parent for tree structure."""

    __tablename__ = "categoria"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, nullable=False)
    descripcion: Optional[str] = Field(default=None)
    padre_id: Optional[int] = Field(
        default=None,
        foreign_key="categoria.id",
        nullable=True,
        # ON DELETE SET NULL is handled at the DB level via the migration
    )
