"""Tests for /api/v1/direcciones endpoints.

Uses in-memory SQLite via the shared `client` fixture.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.modules.usuarios.model import Usuario, UsuarioRol
from app.modules.pedidos.model import EstadoPedido, Pedido


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
    await _seed_catalog(db_session)

    tokens: dict[str, str] = {}
    for email, rol_id, key in [
        ("admin@test.com",   1, "admin"),
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
        tokens[f"{key}_id"] = user.id  # type: ignore[assignment]

    return tokens


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


DIR_PAYLOAD = {
    "linea1": "Av. Corrientes 1234",
    "ciudad": "Buenos Aires",
    "alias": "Casa",
}

DIR_PAYLOAD_2 = {
    "linea1": "Av. Santa Fe 5678",
    "ciudad": "Buenos Aires",
    "alias": "Trabajo",
}


# ---------------------------------------------------------------------------
# Tests — CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crear_primera_direccion_es_principal(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)

    resp = await client.post(
        "/api/v1/direcciones",
        json=DIR_PAYLOAD,
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["es_principal"] is True
    assert data["linea1"] == "Av. Corrientes 1234"
    assert data["ciudad"] == "Buenos Aires"


@pytest.mark.asyncio
async def test_crear_segunda_direccion_no_es_principal(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)

    # First address
    await client.post(
        "/api/v1/direcciones", json=DIR_PAYLOAD, headers=_auth(tokens["client"])
    )
    # Second address
    resp = await client.post(
        "/api/v1/direcciones", json=DIR_PAYLOAD_2, headers=_auth(tokens["client"])
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["es_principal"] is False


@pytest.mark.asyncio
async def test_listar_propias(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)

    await client.post("/api/v1/direcciones", json=DIR_PAYLOAD, headers=_auth(tokens["client"]))
    await client.post("/api/v1/direcciones", json=DIR_PAYLOAD_2, headers=_auth(tokens["client"]))

    resp = await client.get("/api/v1/direcciones", headers=_auth(tokens["client"]))
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_no_ver_ajenas(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)

    # client creates an address
    await client.post("/api/v1/direcciones", json=DIR_PAYLOAD, headers=_auth(tokens["client"]))

    # client2 lists their own — should be empty
    resp = await client.get("/api/v1/direcciones", headers=_auth(tokens["client2"]))
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_editar_propia(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)

    create_resp = await client.post(
        "/api/v1/direcciones", json=DIR_PAYLOAD, headers=_auth(tokens["client"])
    )
    dir_id = create_resp.json()["id"]

    resp = await client.put(
        f"/api/v1/direcciones/{dir_id}",
        json={"linea1": "Nuevo valor"},
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["linea1"] == "Nuevo valor"


@pytest.mark.asyncio
async def test_editar_ajena_403(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)

    create_resp = await client.post(
        "/api/v1/direcciones", json=DIR_PAYLOAD, headers=_auth(tokens["client"])
    )
    dir_id = create_resp.json()["id"]

    resp = await client.put(
        f"/api/v1/direcciones/{dir_id}",
        json={"linea1": "Hack"},
        headers=_auth(tokens["client2"]),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_eliminar_sin_pedidos_activos(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)

    create_resp = await client.post(
        "/api/v1/direcciones", json=DIR_PAYLOAD, headers=_auth(tokens["client"])
    )
    dir_id = create_resp.json()["id"]

    resp = await client.delete(
        f"/api/v1/direcciones/{dir_id}",
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 204

    # Verify it no longer appears in list
    list_resp = await client.get("/api/v1/direcciones", headers=_auth(tokens["client"]))
    assert list_resp.json() == []


@pytest.mark.asyncio
async def test_eliminar_con_pedidos_activos_409(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    from app.modules.direcciones.model import DireccionEntrega
    from app.modules.productos.model import Producto

    tokens = await _seed_users(db_session)

    # Create address
    create_resp = await client.post(
        "/api/v1/direcciones", json=DIR_PAYLOAD, headers=_auth(tokens["client"])
    )
    dir_id = create_resp.json()["id"]

    # Create a producto
    producto = Producto(nombre="Pizza", precio_base=500.0, stock_cantidad=10)
    db_session.add(producto)
    await db_session.flush()
    await db_session.refresh(producto)

    # Create pedido linked to the address
    pedido = Pedido(
        usuario_id=tokens["client_id"],
        estado_codigo="PENDIENTE",
        total=500.0,
        costo_envio=0.0,
        direccion_id=dir_id,
    )
    db_session.add(pedido)
    await db_session.flush()

    resp = await client.delete(
        f"/api/v1/direcciones/{dir_id}",
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 409
    assert resp.json()["code"] == "DIRECCION_CON_PEDIDOS_ACTIVOS"


@pytest.mark.asyncio
async def test_marcar_como_principal_desactiva_anterior(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)

    # Create two addresses
    r1 = await client.post("/api/v1/direcciones", json=DIR_PAYLOAD, headers=_auth(tokens["client"]))
    r2 = await client.post("/api/v1/direcciones", json=DIR_PAYLOAD_2, headers=_auth(tokens["client"]))
    dir1_id = r1.json()["id"]
    dir2_id = r2.json()["id"]

    # First address is principal, second is not
    assert r1.json()["es_principal"] is True
    assert r2.json()["es_principal"] is False

    # Mark second as principal
    resp = await client.patch(
        f"/api/v1/direcciones/{dir2_id}/predeterminada",
        headers=_auth(tokens["client"]),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["es_principal"] is True
    assert resp.json()["id"] == dir2_id

    # List and verify only one is principal
    list_resp = await client.get("/api/v1/direcciones", headers=_auth(tokens["client"]))
    dirs = list_resp.json()
    principals = [d for d in dirs if d["es_principal"]]
    assert len(principals) == 1
    assert principals[0]["id"] == dir2_id


@pytest.mark.asyncio
async def test_marcar_como_principal_ajena_403(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tokens = await _seed_users(db_session)

    r1 = await client.post("/api/v1/direcciones", json=DIR_PAYLOAD, headers=_auth(tokens["client"]))
    dir_id = r1.json()["id"]

    resp = await client.patch(
        f"/api/v1/direcciones/{dir_id}/predeterminada",
        headers=_auth(tokens["client2"]),
    )
    assert resp.status_code == 403
