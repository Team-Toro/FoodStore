from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CrearPagoRequest(BaseModel):
    """Request body for POST /pagos/crear."""

    pedido_id: int


class PagoResponse(BaseModel):
    """Response schema for a payment record."""

    pago_id: int
    init_point: str
    mp_status: str
    monto: float
    created_at: datetime

    model_config = {"from_attributes": True}


class WebhookPayload(BaseModel):
    """Minimal IPN notification body sent by MercadoPago.

    MercadoPago IPN webhooks send only ``topic`` and ``id`` in the body.
    The real payment status must be fetched via the MP API.
    """

    topic: str
    id: Optional[str] = None
