"""MercadoPago SDK factory.

Returns a configured SDK instance using the MP_ACCESS_TOKEN from settings.
"""
from __future__ import annotations

import mercadopago

from app.core.config import settings


def get_mp_sdk() -> mercadopago.SDK:
    """Return a MercadoPago SDK instance configured with the app access token."""
    return mercadopago.SDK(settings.MP_ACCESS_TOKEN)
