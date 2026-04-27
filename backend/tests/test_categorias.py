"""Tests for /api/v1/categorias endpoints.

Uses in-memory SQLite via the shared `client` fixture.
An ADMIN JWT is forged directly via create_access_token so we don't need
a real user row — deps.get_current_user validates the token and fetches
the user, so we DO need an ADMIN user in the DB.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.modules.usuarios.model import Rol, Usuario, UsuarioRol


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_admin(db_session: AsyncSession) -> str:
    """Insert roles + admin user, return an ADMIN access token."""
    from sqlalchemy import text

    # Insert roles
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

    # Insert admin user
    admin = Usuario(
        nombre="Admin",
        apellido="Test",
        email="admin@test.com",
        password_hash=hash_password("Admin1234!"),
    )
    db_session.add(admin)
    await db_session.flush()
    await db_session.refresh(admin)

    # Assign ADMIN role
    admin_role_link = UsuarioRol(usuario_id=admin.id, rol_id=1)
    db_session.add(admin_role_link)
    await db_session.flush()

    token = create_access_token({"sub": str(admin.id)})
    return token


def _admin_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Task 7.1 — crear categoría raíz exitosa
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crear_categoria_raiz(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /api/v1/categorias → 201 with root category."""
    token = await _seed_admin(db_session)

    resp = await client.post(
        "/api/v1/categorias",
        json={"nombre": "Bebidas"},
        headers=_admin_headers(token),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["nombre"] == "Bebidas"
    assert data["padre_id"] is None
    assert "id" in data
    assert "creado_en" in data


# ---------------------------------------------------------------------------
# Task 7.2 — crear subcategoría con padre_id válido
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crear_subcategoria(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /api/v1/categorias con padre_id válido → 201."""
    token = await _seed_admin(db_session)
    headers = _admin_headers(token)

    # Create root
    root_resp = await client.post(
        "/api/v1/categorias",
        json={"nombre": "Comidas"},
        headers=headers,
    )
    assert root_resp.status_code == 201, root_resp.text
    root_id = root_resp.json()["id"]

    # Create child
    child_resp = await client.post(
        "/api/v1/categorias",
        json={"nombre": "Pizzas", "padre_id": root_id},
        headers=headers,
    )
    assert child_resp.status_code == 201, child_resp.text
    data = child_resp.json()
    assert data["nombre"] == "Pizzas"
    assert data["padre_id"] == root_id


# ---------------------------------------------------------------------------
# Task 7.3 — rechazar nombre duplicado en el mismo nivel (HTTP 409)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_nombre_duplicado_mismo_nivel(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST con nombre duplicado al mismo nivel → 409 CATEGORIA_NOMBRE_DUPLICADO."""
    token = await _seed_admin(db_session)
    headers = _admin_headers(token)

    # First creation succeeds
    resp1 = await client.post(
        "/api/v1/categorias",
        json={"nombre": "Postres"},
        headers=headers,
    )
    assert resp1.status_code == 201, resp1.text

    # Second creation with same name at root level → 409
    resp2 = await client.post(
        "/api/v1/categorias",
        json={"nombre": "Postres"},
        headers=headers,
    )
    assert resp2.status_code == 409, resp2.text
    assert resp2.json()["code"] == "CATEGORIA_NOMBRE_DUPLICADO"


# ---------------------------------------------------------------------------
# Task 7.4 — GET retorna árbol anidado correctamente
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_arbol_anidado(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /api/v1/categorias retorna árbol anidado."""
    token = await _seed_admin(db_session)
    headers = _admin_headers(token)

    # Create root
    root_resp = await client.post(
        "/api/v1/categorias",
        json={"nombre": "Bebidas"},
        headers=headers,
    )
    assert root_resp.status_code == 201
    root_id = root_resp.json()["id"]

    # Create child
    child_resp = await client.post(
        "/api/v1/categorias",
        json={"nombre": "Jugos", "padre_id": root_id},
        headers=headers,
    )
    assert child_resp.status_code == 201

    # GET tree
    tree_resp = await client.get("/api/v1/categorias")
    assert tree_resp.status_code == 200
    tree = tree_resp.json()

    # Find root node
    root_node = next((n for n in tree if n["id"] == root_id), None)
    assert root_node is not None
    assert root_node["nombre"] == "Bebidas"
    assert len(root_node["hijos"]) == 1
    assert root_node["hijos"][0]["nombre"] == "Jugos"


# ---------------------------------------------------------------------------
# Task 7.5 — soft delete exitoso y no aparece en árbol
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_soft_delete_no_aparece_en_arbol(client: AsyncClient, db_session: AsyncSession) -> None:
    """DELETE exitoso → 204, luego no aparece en GET /api/v1/categorias."""
    token = await _seed_admin(db_session)
    headers = _admin_headers(token)

    # Create category
    create_resp = await client.post(
        "/api/v1/categorias",
        json={"nombre": "Snacks"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    cat_id = create_resp.json()["id"]

    # Delete
    del_resp = await client.delete(f"/api/v1/categorias/{cat_id}", headers=headers)
    assert del_resp.status_code == 204, del_resp.text

    # Verify not in tree
    tree_resp = await client.get("/api/v1/categorias")
    assert tree_resp.status_code == 200
    ids_in_tree = [n["id"] for n in tree_resp.json()]
    assert cat_id not in ids_in_tree


# ---------------------------------------------------------------------------
# Task 7.6 — rechazar delete si tiene subcategorías activas (HTTP 422)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_rechazado_con_hijos(client: AsyncClient, db_session: AsyncSession) -> None:
    """DELETE con hijos activos → 422 CATEGORIA_TIENE_HIJOS."""
    token = await _seed_admin(db_session)
    headers = _admin_headers(token)

    # Create root
    root_resp = await client.post(
        "/api/v1/categorias",
        json={"nombre": "Carnes"},
        headers=headers,
    )
    assert root_resp.status_code == 201
    root_id = root_resp.json()["id"]

    # Create child
    await client.post(
        "/api/v1/categorias",
        json={"nombre": "Vacuno", "padre_id": root_id},
        headers=headers,
    )

    # Try to delete root → should fail
    del_resp = await client.delete(f"/api/v1/categorias/{root_id}", headers=headers)
    assert del_resp.status_code == 422, del_resp.text
    assert del_resp.json()["code"] == "CATEGORIA_TIENE_HIJOS"


# ---------------------------------------------------------------------------
# Task 7.7 — rechazar ciclo al actualizar padre_id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ciclo_detectado_en_update(client: AsyncClient, db_session: AsyncSession) -> None:
    """PUT padre_id que generaría ciclo → 422 CATEGORIA_CICLO_DETECTADO."""
    token = await _seed_admin(db_session)
    headers = _admin_headers(token)

    # A → B (A is parent of B)
    a_resp = await client.post(
        "/api/v1/categorias",
        json={"nombre": "A"},
        headers=headers,
    )
    assert a_resp.status_code == 201
    a_id = a_resp.json()["id"]

    b_resp = await client.post(
        "/api/v1/categorias",
        json={"nombre": "B", "padre_id": a_id},
        headers=headers,
    )
    assert b_resp.status_code == 201
    b_id = b_resp.json()["id"]

    # Try to set A's padre_id to B (would create A→B→A cycle)
    cycle_resp = await client.put(
        f"/api/v1/categorias/{a_id}",
        json={"padre_id": b_id},
        headers=headers,
    )
    assert cycle_resp.status_code == 422, cycle_resp.text
    assert cycle_resp.json()["code"] == "CATEGORIA_CICLO_DETECTADO"


# ---------------------------------------------------------------------------
# Extra: unauthenticated POST → 401
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crear_sin_token_retorna_401(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST without token → 401."""
    resp = await client.post(
        "/api/v1/categorias",
        json={"nombre": "Sin Auth"},
    )
    assert resp.status_code == 401
