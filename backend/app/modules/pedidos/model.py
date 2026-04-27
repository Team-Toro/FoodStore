from datetime import datetime, timezone
from typing import Any, Optional

import json
from sqlalchemy import Column, Numeric, Text
from sqlalchemy.dialects.postgresql import ARRAY, INTEGER
from sqlalchemy.types import TypeDecorator
from sqlmodel import Field, SQLModel

from app.core.models import SoftDeleteModel, _now


class IntegerArrayOrJSON(TypeDecorator):
    """PostgreSQL ARRAY(INTEGER) with JSON fallback for SQLite (tests).

    - On PostgreSQL: renders as ARRAY(INTEGER)
    - On SQLite (in-memory test DB): stores as JSON text
    """

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect: Any) -> Any:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(ARRAY(INTEGER))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        return json.dumps(value)

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        return json.loads(value)


class EstadoPedido(SQLModel, table=True):
    """Catalogue of order statuses with terminal flag."""

    __tablename__ = "estado_pedido"

    codigo: str = Field(max_length=50, primary_key=True)
    nombre: str = Field(max_length=100, nullable=False)
    descripcion: Optional[str] = Field(default=None)
    es_terminal: bool = Field(default=False, nullable=False)


class Pedido(SoftDeleteModel, table=True):
    """Customer order."""

    __tablename__ = "pedido"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id", nullable=False, index=True)
    estado_codigo: str = Field(
        foreign_key="estado_pedido.codigo", nullable=False, index=True
    )
    direccion_id: Optional[int] = Field(
        default=None, foreign_key="direccion_entrega.id"
    )
    forma_pago_codigo: Optional[str] = Field(
        default=None, foreign_key="forma_pago.codigo"
    )
    total: float = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    costo_envio: float = Field(
        sa_column=Column(Numeric(10, 2), nullable=False, server_default="0")
    )
    direccion_snapshot: Optional[str] = Field(default=None)
    direccion_snapshot_linea1: Optional[str] = Field(default=None)
    direccion_snapshot_ciudad: Optional[str] = Field(default=None, max_length=100)
    direccion_snapshot_alias: Optional[str] = Field(default=None, max_length=100)


class DetallePedido(SQLModel, table=True):
    """Line item within an order with snapshot of product data at purchase time."""

    __tablename__ = "detalle_pedido"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedido.id", nullable=False, index=True)
    producto_id: Optional[int] = Field(default=None, foreign_key="producto.id")
    nombre_snapshot: str = Field(max_length=255, nullable=False)
    precio_snapshot: float = Field(
        sa_column=Column(Numeric(10, 2), nullable=False)
    )
    cantidad: int = Field(ge=1, nullable=False)
    subtotal: float = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    personalizacion: Optional[list[int]] = Field(
        default=None, sa_column=Column(IntegerArrayOrJSON)
    )


class HistorialEstadoPedido(SQLModel, table=True):
    """Immutable append-only audit trail of order state transitions."""

    __tablename__ = "historial_estado_pedido"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedido.id", nullable=False, index=True)
    estado_desde: Optional[str] = Field(
        default=None, foreign_key="estado_pedido.codigo"
    )
    estado_hasta: str = Field(foreign_key="estado_pedido.codigo", nullable=False)
    usuario_id: Optional[int] = Field(default=None, foreign_key="usuario.id")
    observacion: Optional[str] = Field(default=None)
    creado_en: datetime = Field(default_factory=_now, nullable=False)
