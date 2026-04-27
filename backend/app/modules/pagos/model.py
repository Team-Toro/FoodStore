from typing import Optional

from sqlalchemy import Column, Numeric
from sqlmodel import Field, SQLModel

from app.core.models import TimestampModel


class FormaPago(SQLModel, table=True):
    """Catalogue of payment methods available in the system."""

    __tablename__ = "forma_pago"

    codigo: str = Field(max_length=50, primary_key=True)
    nombre: str = Field(max_length=100, nullable=False)
    habilitado: bool = Field(default=True, nullable=False)


class Pago(TimestampModel, table=True):
    """Payment record linked to an order, supports MercadoPago integration."""

    __tablename__ = "pago"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedido.id", nullable=False, index=True)
    monto: float = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    mp_payment_id: Optional[str] = Field(
        default=None, max_length=100, unique=True
    )
    mp_status: Optional[str] = Field(default=None, max_length=50)
    external_reference: str = Field(max_length=100, unique=True, nullable=False)
    idempotency_key: str = Field(max_length=100, unique=True, nullable=False)
