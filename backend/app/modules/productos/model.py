from typing import Optional

from sqlalchemy import Column, Numeric
from sqlmodel import Field, SQLModel

from app.core.models import SoftDeleteModel


class Producto(SoftDeleteModel, table=True):
    """Sellable food product."""

    __tablename__ = "producto"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=255, nullable=False)
    descripcion: Optional[str] = Field(default=None)
    imagen_url: Optional[str] = Field(default=None, max_length=500)
    precio_base: float = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    stock_cantidad: int = Field(default=0, ge=0, nullable=False)
    disponible: bool = Field(default=True, nullable=False)


class ProductoCategoria(SQLModel, table=True):
    """Many-to-many join: product belongs to categories."""

    __tablename__ = "producto_categoria"

    producto_id: int = Field(foreign_key="producto.id", primary_key=True)
    categoria_id: int = Field(foreign_key="categoria.id", primary_key=True)


class ProductoIngrediente(SQLModel, table=True):
    """Many-to-many join: product contains ingredients (optionally removable)."""

    __tablename__ = "producto_ingrediente"

    producto_id: int = Field(foreign_key="producto.id", primary_key=True)
    ingrediente_id: int = Field(foreign_key="ingrediente.id", primary_key=True)
    es_removible: bool = Field(default=False, nullable=False)
