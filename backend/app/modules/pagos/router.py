"""Pagos router — three endpoints:
  POST /pagos/crear     — CLIENT: create MP preference and return init_point
  POST /pagos/webhook   — public: IPN from MP, respond 200, process async
  GET  /pagos/{pedido_id} — CLIENT/ADMIN: get most recent payment for an order
"""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.core.deps import CurrentUser, require_roles
from app.core.uow import UnitOfWork
from app.modules.pagos import service
from app.modules.pagos.schemas import CrearPagoRequest, PagoResponse, WebhookPayload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pagos", tags=["pagos"])


@router.post("/crear", response_model=PagoResponse, status_code=status.HTTP_201_CREATED)
async def crear_pago(
    body: CrearPagoRequest,
    current_user: Annotated[CurrentUser, Depends(require_roles("CLIENT"))],
) -> PagoResponse:
    """Create a MercadoPago Preference and return the init_point URL.

    The client should redirect the user to ``init_point`` to complete payment.
    """
    async with UnitOfWork() as uow:
        return await service.crear_pago(uow, body.pedido_id, current_user.id)


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def recibir_webhook(
    body: WebhookPayload,
    background_tasks: BackgroundTasks,
) -> dict:
    """IPN webhook endpoint for MercadoPago notifications.

    Responds HTTP 200 immediately (required by MP to avoid retries), then
    processes the payment asynchronously via BackgroundTasks.

    Only ``topic == "payment"`` notifications are processed; merchant_order
    and other topics are acknowledged but ignored.
    """
    if body.topic == "payment" and body.id:
        background_tasks.add_task(
            service.procesar_webhook,
            mp_payment_id=body.id,
            uow_factory=UnitOfWork,
        )
    else:
        logger.info(
            "Webhook ignored: topic=%s id=%s", body.topic, body.id
        )

    return {"status": "ok"}


@router.get("/{pedido_id}", response_model=PagoResponse)
async def obtener_pago(
    pedido_id: int,
    current_user: Annotated[
        CurrentUser, Depends(require_roles("CLIENT", "ADMIN"))
    ],
) -> PagoResponse:
    """Return the most recent payment for a given order.

    CLIENTs can only access their own orders. ADMIN can access any.
    """
    rol = "ADMIN" if "ADMIN" in current_user.roles else "CLIENT"
    async with UnitOfWork() as uow:
        return await service.obtener_pago(uow, pedido_id, current_user.id, rol)
