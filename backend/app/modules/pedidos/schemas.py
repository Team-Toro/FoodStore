from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, model_validator


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class ItemPedidoRequest(BaseModel):
    producto_id: int
    cantidad: int
    personalizacion: Optional[list[int]] = None


class CrearPedidoRequest(BaseModel):
    items: list[ItemPedidoRequest]
    forma_pago_codigo: Optional[str] = None
    direccion_id: Optional[int] = None
    costo_envio: float = 0.0

    @model_validator(mode="after")
    def items_no_vacios(self) -> "CrearPedidoRequest":
        if not self.items:
            raise ValueError("El pedido debe tener al menos un ítem")
        return self


class CambiarEstadoRequest(BaseModel):
    nuevo_estado: str
    motivo: Optional[str] = None


# ---------------------------------------------------------------------------
# Read schemas
# ---------------------------------------------------------------------------

class DetallePedidoRead(BaseModel):
    id: int
    producto_id: Optional[int]
    nombre_snapshot: str
    precio_snapshot: float
    cantidad: int
    subtotal: float
    personalizacion: Optional[list[int]] = None

    model_config = {"from_attributes": True}


class HistorialRead(BaseModel):
    id: int
    pedido_id: int
    estado_desde: Optional[str]
    estado_hasta: str
    usuario_id: Optional[int]
    observacion: Optional[str]
    creado_en: datetime

    model_config = {"from_attributes": True}


class PedidoRead(BaseModel):
    id: int
    usuario_id: int
    estado_codigo: str
    forma_pago_codigo: Optional[str]
    direccion_id: Optional[int]
    total: float
    costo_envio: float
    direccion_snapshot: Optional[str]
    direccion_snapshot_linea1: Optional[str] = None
    direccion_snapshot_ciudad: Optional[str] = None
    direccion_snapshot_alias: Optional[str] = None
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class PedidoDetail(PedidoRead):
    items: list[DetallePedidoRead] = []
    historial: list[HistorialRead] = []


class PaginatedPedidos(BaseModel):
    items: list[PedidoRead]
    total: int
    page: int
    size: int
    pages: int
