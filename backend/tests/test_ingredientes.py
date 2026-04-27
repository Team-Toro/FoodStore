"""Tests for /api/v1/ingredientes endpoints.

Uses in-memory SQLite via the shared `client` fixture.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.modules.usuarios.model import Usuario, UsuarioRol


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_user(db_session: AsyncSession, rol_id: int, email: str = "user@test.com") -> str:
    """Insert roles + user with given role, return access token."""
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
    await db_session.flush()

    user = Usuario(
        nombre="Test",
        apellido="User",
        email=email,
        password_hash=hash_password("Password1!"),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)

    role_link = UsuarioRol(usuario_id=user.id, rol_id=rol_id)
    db_session.add(role_link)
    await db_session.flush()

    token = create_access_token({"sub": str(user.id)})
    return token


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# 7.1 — Ingredientes CRUD tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crear_ingrediente(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /api/v1/ingredientes → 201 with ingrediente."""
    token = await _seed_user(db_session, rol_id=1)

    resp = await client.post(
        "/api/v1/ingredientes",
        json={"nombre": "Tomate", "es_alergeno": False},
        headers=_auth_headers(token),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["nombre"] == "Tomate"
    assert data["es_alergeno"] is False
    assert "id" in data


@pytest.mark.asyncio
async def test_listar_ingredientes(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /api/v1/ingredientes → 200 with paginated list."""
    token = await _seed_user(db_session, rol_id=1)

    await client.post(
        "/api/v1/ingredientes",
        json={"nombre": "Gluten", "es_alergeno": True},
        headers=_auth_headers(token),
    )
    await client.post(
        "/api/v1/ingredientes",
        json={"nombre": "Lactosa", "es_alergeno": True},
        headers=_auth_headers(token),
    )

    resp = await client.get("/api/v1/ingredientes")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_filtrar_por_es_alergeno(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /api/v1/ingredientes?es_alergeno=true filters correctly."""
    token = await _seed_user(db_session, rol_id=1)

    await client.post(
        "/api/v1/ingredientes",
        json={"nombre": "Gluten", "es_alergeno": True},
        headers=_auth_headers(token),
    )
    await client.post(
        "/api/v1/ingredientes",
        json={"nombre": "Tomate", "es_alergeno": False},
        headers=_auth_headers(token),
    )

    resp = await client.get("/api/v1/ingredientes?es_alergeno=true")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["nombre"] == "Gluten"

    resp2 = await client.get("/api/v1/ingredientes?es_alergeno=false")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["total"] == 1
    assert data2["items"][0]["nombre"] == "Tomate"


@pytest.mark.asyncio
async def test_obtener_ingrediente_por_id(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /api/v1/ingredientes/{id} → 200 with ingrediente."""
    token = await _seed_user(db_session, rol_id=1)

    create_resp = await client.post(
        "/api/v1/ingredientes",
        json={"nombre": "Albahaca"},
        headers=_auth_headers(token),
    )
    ing_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/ingredientes/{ing_id}")
    assert resp.status_code == 200, resp.text
    assert resp.json()["nombre"] == "Albahaca"


@pytest.mark.asyncio
async def test_obtener_ingrediente_inexistente_retorna_404(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /api/v1/ingredientes/9999 → 404."""
    await _seed_user(db_session, rol_id=1)
    resp = await client.get("/api/v1/ingredientes/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_actualizar_ingrediente(client: AsyncClient, db_session: AsyncSession) -> None:
    """PUT /api/v1/ingredientes/{id} → 200 with updated ingrediente."""
    token = await _seed_user(db_session, rol_id=1)

    create_resp = await client.post(
        "/api/v1/ingredientes",
        json={"nombre": "Cebolla", "es_alergeno": False},
        headers=_auth_headers(token),
    )
    ing_id = create_resp.json()["id"]

    update_resp = await client.put(
        f"/api/v1/ingredientes/{ing_id}",
        json={"es_alergeno": True},
        headers=_auth_headers(token),
    )
    assert update_resp.status_code == 200, update_resp.text
    assert update_resp.json()["es_alergeno"] is True
    assert update_resp.json()["nombre"] == "Cebolla"


@pytest.mark.asyncio
async def test_soft_delete_ingrediente(client: AsyncClient, db_session: AsyncSession) -> None:
    """DELETE /api/v1/ingredientes/{id} → 204, not returned in list."""
    token = await _seed_user(db_session, rol_id=1)

    create_resp = await client.post(
        "/api/v1/ingredientes",
        json={"nombre": "Perejil"},
        headers=_auth_headers(token),
    )
    ing_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/v1/ingredientes/{ing_id}", headers=_auth_headers(token))
    assert del_resp.status_code == 204, del_resp.text

    # Should not appear in list
    list_resp = await client.get("/api/v1/ingredientes")
    ids = [i["id"] for i in list_resp.json()["items"]]
    assert ing_id not in ids

    # Should return 404
    get_resp = await client.get(f"/api/v1/ingredientes/{ing_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_nombre_duplicado_retorna_409(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST with duplicate nombre → 409 INGREDIENTE_DUPLICADO."""
    token = await _seed_user(db_session, rol_id=1)

    await client.post(
        "/api/v1/ingredientes",
        json={"nombre": "Ajo"},
        headers=_auth_headers(token),
    )

    resp = await client.post(
        "/api/v1/ingredientes",
        json={"nombre": "Ajo"},
        headers=_auth_headers(token),
    )
    assert resp.status_code == 409, resp.text
    assert resp.json()["code"] == "INGREDIENTE_DUPLICADO"
