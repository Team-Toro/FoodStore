"""Tests for /api/v1/pedidos endpoints.

Uses in-memory SQLite via the shared `client` fixture.
"""
from __future__ import annotations

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
    """Insert roles, estados de pedido, and return nothing."""
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
    # Seed EstadoPedido catalog rows
    estados = [
        ("PENDIENTE",  "Pendiente",   False),
        ("CONFIRMADO", "Confirmado",  False),
        ("EN_PREP",    "En preparación", False),
        ("EN_CAMINO",  "En camino",   False),
        ("ENTREGADO",  "Entregado",   True),
        ("CANCELADO",  "Cancelado",   True),
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
    """Seed roles and users, return access tokens keyed by role name."""
    await _seed_catalog(db_session)

    tokens: dict[str, str] = {}
    for email, rol_id, key in [
        ("admin@test.com",   1, "admin"),
        ("pedidos@test.com", 3, "pedidos"),
        ("client@test.com",  4, "client"),
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
    db_session: AsyncSession, nombre: str = "Pizza", precio: float = 500.0, stock: int = 10
) -> Producto:
    p = Producto(nombre=nombre, precio_base=precio, stock_cantidad=stock)
    db_session.add(p)
    await db_session.flush()
    await db_session.refresh(p)
    return p


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crear_pedido_exitoso(client: AsyncClient, db_session: AsyncSession) -> None:
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 2}]},
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["estado_codigo"] == "PENDIENTE"
    assert data["total"] == pytest.approx(1000.0)


@pytest.mark.asyncio
async def test_crear_pedido_stock_insuficiente(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session, stock=1)

    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 5}]},
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "STOCK_INSUFICIENTE"


@pytest.mark.asyncio
async def test_crear_pedido_sin_items(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)

    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": []},
        headers=_auth(tokens["client"]),
    )
    # Pydantic validator raises 422 for empty items list
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_listar_pedidos_cliente_solo_ve_suyos(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    # client creates a pedido
    await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    # client2 creates a pedido
    await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client2"]),
    )

    resp = await client.get("/api/v1/pedidos", headers=_auth(tokens["client"]))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1


@pytest.mark.asyncio
async def test_listar_pedidos_admin_ve_todos(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    for tok in [tokens["client"], tokens["client2"]]:
        await client.post(
            "/api/v1/pedidos",
            json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
            headers=_auth(tok),
        )

    resp = await client.get("/api/v1/pedidos", headers=_auth(tokens["admin"]))
    assert resp.status_code == 200
    assert resp.json()["total"] == 2


@pytest.mark.asyncio
async def test_cambiar_estado_valido(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    create_resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = create_resp.json()["id"]

    # ADMIN confirms (PENDIENTE → CONFIRMADO)
    resp = await client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "CONFIRMADO"},
        headers=_auth(tokens["admin"]),
    )
    assert resp.status_code == 200
    assert resp.json()["estado_codigo"] == "CONFIRMADO"

    # PEDIDOS advances to EN_PREP
    resp = await client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "EN_PREP"},
        headers=_auth(tokens["pedidos"]),
    )
    assert resp.status_code == 200
    assert resp.json()["estado_codigo"] == "EN_PREP"


@pytest.mark.asyncio
async def test_cambiar_estado_transicion_invalida(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    create_resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = create_resp.json()["id"]

    # Try PENDIENTE → EN_PREP (invalid jump)
    resp = await client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "EN_PREP"},
        headers=_auth(tokens["admin"]),
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "TRANSICION_NO_PERMITIDA"


@pytest.mark.asyncio
async def test_cancelar_pedido_confirmado_restaura_stock(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session, stock=10)

    create_resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 3}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = create_resp.json()["id"]

    # Confirm (stock decrements by 3)
    await client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "CONFIRMADO"},
        headers=_auth(tokens["admin"]),
    )

    # Cancel from CONFIRMADO (stock should restore)
    resp = await client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "CANCELADO", "motivo": "Error de prueba"},
        headers=_auth(tokens["admin"]),
    )
    assert resp.status_code == 200
    assert resp.json()["estado_codigo"] == "CANCELADO"

    # Verify stock restored
    await db_session.refresh(producto)
    assert producto.stock_cantidad == 10


@pytest.mark.asyncio
async def test_cancelar_en_prep_solo_admin(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    create_resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = create_resp.json()["id"]

    # Advance to EN_PREP
    await client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "CONFIRMADO"},
        headers=_auth(tokens["admin"]),
    )
    await client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "EN_PREP"},
        headers=_auth(tokens["admin"]),
    )

    # PEDIDOS tries to cancel EN_PREP — should fail (only ADMIN allowed)
    resp = await client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "CANCELADO", "motivo": "test"},
        headers=_auth(tokens["pedidos"]),
    )
    assert resp.status_code == 403
    assert resp.json()["code"] == "ROL_INSUFICIENTE"

    # ADMIN can cancel EN_PREP
    resp = await client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "CANCELADO", "motivo": "test"},
        headers=_auth(tokens["admin"]),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_cancelar_sin_motivo_falla(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    create_resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "CANCELADO"},
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "MOTIVO_REQUERIDO"


@pytest.mark.asyncio
async def test_historial_append_only(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    create_resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    pedido_id = create_resp.json()["id"]

    # Confirm
    await client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "CONFIRMADO"},
        headers=_auth(tokens["admin"]),
    )

    resp = await client.get(
        f"/api/v1/pedidos/{pedido_id}/historial",
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 200
    historial = resp.json()
    assert len(historial) == 2

    # First record: estado_desde is null
    assert historial[0]["estado_desde"] is None
    assert historial[0]["estado_hasta"] == "PENDIENTE"

    # Second record
    assert historial[1]["estado_desde"] == "PENDIENTE"
    assert historial[1]["estado_hasta"] == "CONFIRMADO"


# ---------------------------------------------------------------------------
# Tests — Dirección integration (US-008)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crear_pedido_con_direccion_propia_snapshot(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Pedido created with own direccion_id captures snapshot."""
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    # Create a delivery address
    dir_resp = await client.post(
        "/api/v1/direcciones",
        json={"linea1": "Av. Corrientes 1234", "ciudad": "Buenos Aires", "alias": "Casa"},
        headers=_auth(tokens["client"]),
    )
    assert dir_resp.status_code == 201, dir_resp.text
    dir_id = dir_resp.json()["id"]

    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}], "direccion_id": dir_id},
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["direccion_id"] == dir_id
    assert data["direccion_snapshot_linea1"] == "Av. Corrientes 1234"
    assert data["direccion_snapshot_ciudad"] == "Buenos Aires"
    assert data["direccion_snapshot_alias"] == "Casa"


@pytest.mark.asyncio
async def test_crear_pedido_con_direccion_ajena_403(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Using another user's direccion_id returns 403."""
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    # client creates a delivery address
    dir_resp = await client.post(
        "/api/v1/direcciones",
        json={"linea1": "Calle Privada 1", "ciudad": "Rosario"},
        headers=_auth(tokens["client"]),
    )
    dir_id = dir_resp.json()["id"]

    # client2 tries to use it
    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}], "direccion_id": dir_id},
        headers=_auth(tokens["client2"]),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_crear_pedido_sin_direccion_snapshot_null(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Creating a pedido without direccion_id is allowed; snapshots are null."""
    tokens = await _seed_users(db_session)
    producto = await _create_product(db_session)

    resp = await client.post(
        "/api/v1/pedidos",
        json={"items": [{"producto_id": producto.id, "cantidad": 1}]},
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["direccion_id"] is None
    assert data["direccion_snapshot_linea1"] is None
    assert data["direccion_snapshot_ciudad"] is None
