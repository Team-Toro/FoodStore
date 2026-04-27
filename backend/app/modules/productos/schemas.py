from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, computed_field, field_validator

from app.modules.categorias.schemas import CategoriaRead
from app.modules.ingredientes.schemas import IngredienteRead


# ---------------------------------------------------------------------------
# Ingrediente con es_removible — for product detail
# ---------------------------------------------------------------------------

class IngredienteConRemovible(IngredienteRead):
    es_removible: bool


# ---------------------------------------------------------------------------
# Producto schemas
# ---------------------------------------------------------------------------

class ProductoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    precio_base: Decimal
    stock_cantidad: int = 0
    disponible: bool = True

    @field_validator("nombre")
    @classmethod
    def nombre_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        return v

    @field_validator("precio_base")
    @classmethod
    def precio_positivo(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0"):
            raise ValueError("El precio base debe ser mayor a 0")
        return v

    @field_validator("stock_cantidad")
    @classmethod
    def stock_no_negativo(cls, v: int) -> int:
        if v < 0:
            raise ValueError("El stock no puede ser negativo")
        return v


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    precio_base: Optional[Decimal] = None
    stock_cantidad: Optional[int] = None
    disponible: Optional[bool] = None

    @field_validator("nombre")
    @classmethod
    def nombre_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("El nombre no puede estar vacío")
        return v

    @field_validator("precio_base")
    @classmethod
    def precio_positivo(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= Decimal("0"):
            raise ValueError("El precio base debe ser mayor a 0")
        return v

    @field_validator("stock_cantidad")
    @classmethod
    def stock_no_negativo(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("El stock no puede ser negativo")
        return v


class ProductoRead(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    precio_base: Decimal
    stock_cantidad: int
    disponible: bool
    creado_en: datetime

    @computed_field
    @property
    def precio(self) -> float:
        return float(self.precio_base)

    @computed_field
    @property
    def stock(self) -> int:
        return self.stock_cantidad

    model_config = {"from_attributes": True}


class ProductoDetail(ProductoRead):
    categorias: list[CategoriaRead] = []
    ingredientes: list[IngredienteConRemovible] = []


# ---------------------------------------------------------------------------
# Relation update schemas
# ---------------------------------------------------------------------------

class IngredienteRelacion(BaseModel):
    ingrediente_id: int
    es_removible: bool = False


class ProductoCategoriasUpdate(BaseModel):
    categoria_ids: list[int]


class ProductoIngredientesUpdate(BaseModel):
    ingredientes: list[IngredienteRelacion]


# ---------------------------------------------------------------------------
# Stock and availability
# ---------------------------------------------------------------------------

class StockUpdate(BaseModel):
    delta: int


class DisponibilidadUpdate(BaseModel):
    disponible: bool
