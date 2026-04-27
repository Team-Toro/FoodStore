"""Tests for /api/v1/pagos endpoints.

Uses in-memory SQLite via the shared `client` fixture.
MercadoPago SDK calls are mocked with pytest monkeypatch.
"""
from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.modules.usuarios.model import Usuario, UsuarioRol
from app.modules.productos.model import Producto
from app.modules.pedidos.model import EstadoPedido


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_catalog(db_session: AsyncSession) -> None:
    from sqlalchemy import text

    await db_session.execute(
        text("""
            INSERT INTO rol (id, codigo, nombre, descripcion)
            VALUES
                (1, 'ADMIN',   'Administrador',      'Acceso total'),
                (2, 'STOCK',   'Gestión de stock',   'Stock'),
                (3, 'PEDIDOS', 'Gestión de pedidos', 'Pedidos'),
                (4, 'CLIENT',  'Cliente',             'Cliente registrado')
            ON CONFLICT DO NOTHING
        """)
    )
    estados = [
        ("PENDIENTE",  "Pendiente",      False),
        ("CONFIRMADO", "Confirmado",     False),
        ("EN_PREP",    "En preparación", False),
        ("EN_CAMINO",  "En camino",      False),
        ("ENTREGADO",  "Entregado",      True),
        ("CANCELADO",  "Cancelado",      True),
    ]
    for codigo, nombre, es_terminal in estados:
        await db_session.execute(
            text(
                "INSERT INTO estado_pedido (codigo, nombre, es_terminal) "
                "VALUES (:codigo, :nombre, :es_terminal) ON CONFLICT DO NOTHING"
            ),
            {"codigo": codigo, "nombre": nombre, "es_terminal": es_terminal},
        )
    await db_session.flush()


async def _seed_users(db_session: AsyncSession) -> dict[str, str]:
    await _seed_catalog(db_session)
    tokens: dict[str, str] = {}
    for email, rol_id, key in [
        ("admin@test.com",  1, "admin"),
        ("client@test.com", 4, "client"),
        ("client2@test.com", 4, "client2"),
    ]:
        user = Usuario(
            nombre=key.capitalize(),
            apellido="User",
            email=email,
            password_hash=hash_password("Password1!"),
        )
        db_session.add(user)
        await db_session.flush()
        await db_session.refresh(user)
        db_session.add(UsuarioRol(usuario_id=user.id, rol_id=rol_id))
        await db_session.flush()
        tokens[key] = create_access_token({"sub": str(user.id)})
    return tokens


async def _create_product(
    db_session: AsyncSession,
    nombre: str = "Hamburguesa",
    precio: float = 1500.0,
    stock: int = 10,
) -> Producto:
    p = Producto(nombre=nombre, precio_base=precio, stock_cantidad=stock)
    db_session.add(p)
    await db_session.flush()
    await db_session.refresh(p)
    return p


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _mock_mp_preference(init_point: str = "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123") -> MagicMock:
    """Return a mock that simulates sdk.preference().create()."""
    mock_sdk = MagicMock()
    mock_sdk.preference.return_value.create.return_value = {
        "status": 201,
        "response": {
            "id": "mock-pref-123",
            "init_point": init_point,
        },
    }
    return mock_sdk


def _mock_mp_payment(
    mp_payment_id: str = "pay_001",
    status: str = "approved",
    external_reference: str = "1",
) -> MagicMock:
    """Return a mock that simulates sdk.payment().get()."""
    mock_sdk = MagicMock()
    mock_sdk.payment.return_value.get.return_value = {
        "status": 200,
        "response": {
            "id": mp_payment_id,
            "status": status,
            "external_reference": external_reference,
        },
    }
    return mock_sdk


# ---------------------------------------------------------------------------
# Tests: crear_pago
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crear_pago_pedido_pendiente(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """POST /pagos/crear on a PENDIENTE order returns 201 with init_point."""
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    # Create the order first
    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 201
    pedido_id = resp.json()["id"]

    mock_sdk = _mock_mp_preference()
    with patch("app.modules.pagos.service.get_mp_sdk", return_value=mock_sdk):
        resp = await client.post(
            "/api/v1/pagos/crear",
            json={"pedido_id": pedido_id},
            headers=_auth(tokens["client"]),
        )

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert "init_point" in data
    assert data["init_point"].startswith("https://")
    assert data["mp_status"] == "pending"
    assert data["monto"] == pytest.approx(1500.0)


@pytest.mark.asyncio
async def test_crear_pago_pedido_no_pendiente(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """POST /pagos/crear on a non-PENDIENTE order returns 409."""
    from app.modules.pedidos.model import Pedido

    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    # Create order
    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 201
    pedido_id = resp.json()["id"]

    # Manually set estado to CONFIRMADO in DB
    from sqlalchemy import text
    await db_session.execute(
        text("UPDATE pedido SET estado_codigo = 'CONFIRMADO' WHERE id = :id"),
        {"id": pedido_id},
    )
    await db_session.flush()

    mock_sdk = _mock_mp_preference()
    with patch("app.modules.pagos.service.get_mp_sdk", return_value=mock_sdk):
        resp = await client.post(
            "/api/v1/pagos/crear",
            json={"pedido_id": pedido_id},
            headers=_auth(tokens["client"]),
        )

    assert resp.status_code == 409, resp.text
    assert resp.json()["code"] == "PEDIDO_NO_PENDIENTE"


@pytest.mark.asyncio
async def test_crear_pago_pedido_otro_usuario_retorna_403(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """POST /pagos/crear for another user's order returns 403."""
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    # client creates pedido
    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = resp.json()["id"]

    mock_sdk = _mock_mp_preference()
    with patch("app.modules.pagos.service.get_mp_sdk", return_value=mock_sdk):
        # client2 tries to pay for client's order
        resp = await client.post(
            "/api/v1/pagos/crear",
            json={"pedido_id": pedido_id},
            headers=_auth(tokens["client2"]),
        )

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Tests: webhook
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_approved_confirma_pedido(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Webhook with approved payment triggers PENDIENTE→CONFIRMADO transition."""
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    # Create order
    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = resp.json()["id"]

    mp_payment_id = "pay_approved_001"
    mock_pref = _mock_mp_preference()
    with patch("app.modules.pagos.service.get_mp_sdk", return_value=mock_pref):
        await client.post(
            "/api/v1/pagos/crear",
            json={"pedido_id": pedido_id},
            headers=_auth(tokens["client"]),
        )

    # Simulate webhook — mock MP payment.get to return approved
    mock_pay = _mock_mp_payment(
        mp_payment_id=mp_payment_id,
        status="approved",
        external_reference=str(pedido_id),
    )
    with patch("app.modules.pagos.service.get_mp_sdk", return_value=mock_pay):
        resp = await client.post(
            "/api/v1/pagos/webhook",
            json={"topic": "payment", "id": mp_payment_id},
        )

    assert resp.status_code == 200

    # Check pedido transitioned to CONFIRMADO
    from sqlalchemy import text
    result = await db_session.execute(
        text("SELECT estado_codigo FROM pedido WHERE id = :id"), {"id": pedido_id}
    )
    estado = result.scalar_one()
    assert estado == "CONFIRMADO"


@pytest.mark.asyncio
async def test_webhook_rejected_pedido_sigue_pendiente(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Webhook with rejected payment leaves order in PENDIENTE state."""
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = resp.json()["id"]

    mp_payment_id = "pay_rejected_001"
    mock_pref = _mock_mp_preference()
    with patch("app.modules.pagos.service.get_mp_sdk", return_value=mock_pref):
        await client.post(
            "/api/v1/pagos/crear",
            json={"pedido_id": pedido_id},
            headers=_auth(tokens["client"]),
        )

    mock_pay = _mock_mp_payment(
        mp_payment_id=mp_payment_id,
        status="rejected",
        external_reference=str(pedido_id),
    )
    with patch("app.modules.pagos.service.get_mp_sdk", return_value=mock_pay):
        resp = await client.post(
            "/api/v1/pagos/webhook",
            json={"topic": "payment", "id": mp_payment_id},
        )

    assert resp.status_code == 200

    from sqlalchemy import text
    result = await db_session.execute(
        text("SELECT estado_codigo FROM pedido WHERE id = :id"), {"id": pedido_id}
    )
    assert result.scalar_one() == "PENDIENTE"


@pytest.mark.asyncio
async def test_webhook_idempotencia(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Second webhook with same mp_payment_id doesn't fire second FSM transition."""
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session, stock=5)

    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = resp.json()["id"]

    mp_payment_id = "pay_idempotent_001"
    mock_pref = _mock_mp_preference()
    with patch("app.modules.pagos.service.get_mp_sdk", return_value=mock_pref):
        await client.post(
            "/api/v1/pagos/crear",
            json={"pedido_id": pedido_id},
            headers=_auth(tokens["client"]),
        )

    mock_pay = _mock_mp_payment(
        mp_payment_id=mp_payment_id,
        status="approved",
        external_reference=str(pedido_id),
    )

    # First webhook — should confirm the order
    with patch("app.modules.pagos.service.get_mp_sdk", return_value=mock_pay):
        resp = await client.post(
            "/api/v1/pagos/webhook",
            json={"topic": "payment", "id": mp_payment_id},
        )
    assert resp.status_code == 200

    from sqlalchemy import text
    result = await db_session.execute(
        text("SELECT estado_codigo FROM pedido WHERE id = :id"), {"id": pedido_id}
    )
    assert result.scalar_one() == "CONFIRMADO"

    # Count historial entries before second webhook
    result = await db_session.execute(
        text("SELECT COUNT(*) FROM historial_estado_pedido WHERE pedido_id = :id"),
        {"id": pedido_id},
    )
    count_before = result.scalar_one()

    # Second webhook with same payment_id — should be ignored
    with patch("app.modules.pagos.service.get_mp_sdk", return_value=mock_pay):
        resp = await client.post(
            "/api/v1/pagos/webhook",
            json={"topic": "payment", "id": mp_payment_id},
        )
    assert resp.status_code == 200

    result = await db_session.execute(
        text("SELECT COUNT(*) FROM historial_estado_pedido WHERE pedido_id = :id"),
        {"id": pedido_id},
    )
    count_after = result.scalar_one()
    # No additional history entries were added
    assert count_after == count_before


@pytest.mark.asyncio
async def test_webhook_topic_no_payment_ignorado(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Webhook with topic != 'payment' is acknowledged but not processed."""
    resp = await client.post(
        "/api/v1/pagos/webhook",
        json={"topic": "merchant_order", "id": "123"},
    )
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Tests: obtener_pago
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_obtener_pago_existente(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """GET /pagos/{id} returns pago data for the order owner."""
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = resp.json()["id"]

    mock_pref = _mock_mp_preference()
    with patch("app.modules.pagos.service.get_mp_sdk", return_value=mock_pref):
        await client.post(
            "/api/v1/pagos/crear",
            json={"pedido_id": pedido_id},
            headers=_auth(tokens["client"]),
        )

    resp = await client.get(
        f"/api/v1/pagos/{pedido_id}",
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["mp_status"] == "pending"
    assert data["monto"] == pytest.approx(1500.0)


@pytest.mark.asyncio
async def test_obtener_pago_no_existente_retorna_404(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """GET /pagos/{id} returns 404 when no pago exists for the order."""
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = resp.json()["id"]

    resp = await client.get(
        f"/api/v1/pagos/{pedido_id}",
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "PAGO_NO_ENCONTRADO"
