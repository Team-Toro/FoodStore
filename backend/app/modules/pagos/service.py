"""Payment service — MercadoPago Preferences API integration.

Flow:
  1. Client calls POST /pagos/crear → backend creates MP Preference → returns init_point
  2. Client is redirected to MP Checkout page
  3. MP sends IPN webhook → POST /pagos/webhook
  4. Webhook handler responds 200 immediately, spawns BackgroundTask
  5. Background task verifies payment status via MP API and transitions order FSM
"""
from __future__ import annotations

import logging
import uuid
from typing import Any, Callable

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.mp_client import get_mp_sdk
from app.modules.pagos.model import Pago
from app.modules.pagos.schemas import PagoResponse
from app.modules.pedidos.schemas import CambiarEstadoRequest

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# crear_pago
# ---------------------------------------------------------------------------

async def crear_pago(uow, pedido_id: int, usuario_id: int) -> PagoResponse:
    """Create a MercadoPago Preference for a PENDIENTE order.

    Steps:
    - Verify order belongs to the user and is in PENDIENTE state
    - Create MP Preference with external_reference = str(pedido_id)
    - Insert a Pago record with mp_status = "pending"
    - Return PagoResponse with the init_point URL

    Raises:
        HTTPException 403 — if order does not belong to user
        HTTPException 404 — if order not found
        HTTPException 409 — if order is not in PENDIENTE state
        HTTPException 502 — if MP Preferences API fails
    """
    pedido = await uow.pedidos.get_by_id(pedido_id)
    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado",
            headers={"X-Error-Code": "PEDIDO_NO_ENCONTRADO"},
        )

    if pedido.usuario_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para pagar este pedido",
            headers={"X-Error-Code": "FORBIDDEN"},
        )

    if pedido.estado_codigo != "PENDIENTE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El pedido está en estado '{pedido.estado_codigo}', se requiere PENDIENTE para iniciar el pago",
            headers={"X-Error-Code": "PEDIDO_NO_PENDIENTE"},
        )

    idempotency_key = str(uuid.uuid4())
    external_reference = str(pedido_id)

    # Build back_urls using MP_NOTIFICATION_URL base or a default
    base_url = settings.MP_NOTIFICATION_URL or "http://localhost:5173"
    # Strip /api/v1/pagos/webhook suffix if present — back_url is frontend
    if "/api/v1" in base_url:
        base_url = "http://localhost:5173"

    back_urls = {
        "success": f"{base_url}/pedidos/{pedido_id}/resultado?status=approved",
        "failure": f"{base_url}/pedidos/{pedido_id}/resultado?status=rejected",
        "pending": f"{base_url}/pedidos/{pedido_id}/resultado?status=pending",
    }

    # Fetch detalles for preference items
    detalles = await uow.detalles_pedido.get_by_pedido_id(pedido_id)

    preference_data: dict[str, Any] = {
        "items": [
            {
                "title": d.nombre_snapshot,
                "quantity": d.cantidad,
                "unit_price": float(d.precio_snapshot),
                "currency_id": "ARS",
            }
            for d in detalles
        ],
        "external_reference": external_reference,
        "back_urls": back_urls,
        "auto_return": "approved",
        "notification_url": settings.MP_NOTIFICATION_URL or None,
    }

    # Remove None notification_url to avoid MP validation errors in dev
    if not preference_data["notification_url"]:
        del preference_data["notification_url"]

    sdk = get_mp_sdk()
    mp_response = sdk.preference().create(preference_data)

    if mp_response["status"] not in (200, 201):
        logger.error("MP Preferences API error: %s", mp_response)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error al crear la preferencia de pago en MercadoPago",
            headers={"X-Error-Code": "MP_API_ERROR"},
        )

    preference = mp_response["response"]
    init_point: str = preference["init_point"]
    mp_preference_id: str = preference.get("id", "")

    pago = Pago(
        pedido_id=pedido_id,
        monto=float(pedido.total),
        mp_payment_id=None,
        mp_status="pending",
        external_reference=external_reference,
        idempotency_key=idempotency_key,
    )
    pago = await uow.pagos.create(pago)

    return PagoResponse(
        pago_id=pago.id,
        init_point=init_point,
        mp_status=pago.mp_status,
        monto=float(pago.monto),
        created_at=pago.creado_en,
    )


# ---------------------------------------------------------------------------
# procesar_webhook (BackgroundTask)
# ---------------------------------------------------------------------------

async def procesar_webhook(mp_payment_id: str, uow_factory: Callable) -> None:
    """Process an IPN payment notification from MercadoPago.

    This function runs as a FastAPI BackgroundTask — the HTTP response (200)
    has already been sent to MP before this is called.

    Idempotency: if a Pago with this mp_payment_id already has mp_status="approved",
    the function exits immediately without making a second FSM transition.

    Steps:
    1. Open a new UoW
    2. Look up existing Pago by mp_payment_id — skip if already approved
    3. Query MP API for real payment status (never trust webhook payload)
    4. Extract external_reference (= pedido_id)
    5. If approved: update Pago, call pedidos.service.cambiar_estado with rol=SISTEMA
    6. Otherwise: only update Pago.mp_status
    """
    from app.modules.pedidos import service as pedidos_service

    try:
        async with uow_factory() as uow:
            # Idempotency check
            existing = await uow.pagos.get_by_mp_payment_id(mp_payment_id)
            if existing is not None and existing.mp_status == "approved":
                logger.info(
                    "Webhook idempotency: payment %s already approved, skipping",
                    mp_payment_id,
                )
                return

            # Verify real status via MP API
            sdk = get_mp_sdk()
            mp_response = sdk.payment().get(mp_payment_id)

            if mp_response["status"] != 200:
                logger.error(
                    "MP Payment API error for payment_id=%s: %s",
                    mp_payment_id,
                    mp_response,
                )
                return

            payment_data = mp_response["response"]
            real_status: str = payment_data.get("status", "unknown")
            external_reference: str = str(payment_data.get("external_reference", ""))

            if not external_reference:
                logger.warning(
                    "No external_reference in MP payment %s", mp_payment_id
                )
                return

            try:
                pedido_id = int(external_reference)
            except (ValueError, TypeError):
                logger.error(
                    "Invalid external_reference '%s' for payment %s",
                    external_reference,
                    mp_payment_id,
                )
                return

            if existing is not None:
                # Update the existing record found by mp_payment_id
                existing.mp_payment_id = mp_payment_id
                existing.mp_status = real_status
                await uow.pagos.update(existing)
            else:
                # No record found by mp_payment_id — check if a pending record
                # exists for this pedido (created by crear_pago) and update it
                pago_by_pedido = await uow.pagos.get_by_pedido_id(pedido_id)
                if pago_by_pedido is not None:
                    pago_by_pedido.mp_payment_id = mp_payment_id
                    pago_by_pedido.mp_status = real_status
                    await uow.pagos.update(pago_by_pedido)
                else:
                    # Webhook arrived before preference was persisted (race condition)
                    pedido = await uow.pedidos.get_by_id(pedido_id)
                    if pedido is None:
                        logger.error(
                            "Pedido %s not found for payment %s", pedido_id, mp_payment_id
                        )
                        return

                    new_pago = Pago(
                        pedido_id=pedido_id,
                        monto=float(pedido.total),
                        mp_payment_id=mp_payment_id,
                        mp_status=real_status,
                        external_reference=external_reference,
                        idempotency_key=str(uuid.uuid4()),
                    )
                    await uow.pagos.create(new_pago)

            if real_status == "approved":
                body = CambiarEstadoRequest(nuevo_estado="CONFIRMADO", motivo=None)
                try:
                    await pedidos_service.cambiar_estado(
                        uow,
                        pedido_id=pedido_id,
                        body=body,
                        usuario_id=None,  # type: ignore[arg-type]
                        rol="SISTEMA",
                    )
                except HTTPException as exc:
                    # Transition may already have occurred (idempotent webhook retry)
                    logger.warning(
                        "FSM transition PENDIENTE→CONFIRMADO skipped for pedido %s: %s",
                        pedido_id,
                        exc.detail,
                    )

    except Exception as exc:
        logger.exception(
            "Unhandled error processing webhook for payment %s: %s",
            mp_payment_id,
            exc,
        )


# ---------------------------------------------------------------------------
# obtener_pago
# ---------------------------------------------------------------------------

async def obtener_pago(
    uow, pedido_id: int, usuario_id: int, rol: str
) -> PagoResponse:
    """Return the most recent payment for a pedido.

    Raises:
        HTTPException 403 — if CLIENT tries to access another user's order
        HTTPException 404 — if no payment exists for this pedido
    """
    pedido = await uow.pedidos.get_by_id(pedido_id)
    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado",
            headers={"X-Error-Code": "PEDIDO_NO_ENCONTRADO"},
        )

    if rol == "CLIENT" and pedido.usuario_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para ver este pago",
            headers={"X-Error-Code": "FORBIDDEN"},
        )

    pago = await uow.pagos.get_by_pedido_id(pedido_id)
    if pago is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pago no encontrado para este pedido",
            headers={"X-Error-Code": "PAGO_NO_ENCONTRADO"},
        )

    return PagoResponse(
        pago_id=pago.id,
        init_point="",  # init_point not stored; only relevant during creation
        mp_status=pago.mp_status or "pending",
        monto=float(pago.monto),
        created_at=pago.creado_en,
    )
