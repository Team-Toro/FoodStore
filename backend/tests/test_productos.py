"""Tests for /api/v1/productos endpoints.

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

async def _seed_users(db_session: AsyncSession) -> dict[str, str]:
    """Seed roles and users (ADMIN, STOCK, CLIENT), return tokens dict."""
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

    tokens = {}
    for email, rol_id, key in [
        ("admin@test.com", 1, "admin"),
        ("stock@test.com", 2, "stock"),
        ("client@test.com", 4, "client"),
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


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _create_categoria(client: AsyncClient, token: str, nombre: str = "Pizzas") -> int:
    resp = await client.post(
        "/api/v1/categorias",
        json={"nombre": nombre},
        headers=_auth_headers(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _create_ingrediente(client: AsyncClient, token: str, nombre: str, es_alergeno: bool = False) -> int:
    resp = await client.post(
        "/api/v1/ingredientes",
        json={"nombre": nombre, "es_alergeno": es_alergeno},
        headers=_auth_headers(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _create_producto(client: AsyncClient, token: str, nombre: str = "Pizza Margarita", precio: str = "850.00", stock: int = 10) -> dict:
    resp = await client.post(
        "/api/v1/productos",
        json={
            "nombre": nombre,
            "precio_base": precio,
            "stock_cantidad": stock,
        },
        headers=_auth_headers(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# Task 7.2 — Productos CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crear_producto_valido(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /api/v1/productos → 201."""
    tokens = await _seed_users(db_session)
    data = await _create_producto(client, tokens["admin"])
    assert data["nombre"] == "Pizza Margarita"
    assert float(data["precio_base"]) == 850.00
    assert data["stock_cantidad"] == 10
    assert data["disponible"] is True


@pytest.mark.asyncio
async def test_crear_producto_precio_cero_retorna_422(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST with precio_base=0 → 422."""
    tokens = await _seed_users(db_session)

    resp = await client.post(
        "/api/v1/productos",
        json={"nombre": "Precio Cero", "precio_base": "0", "stock_cantidad": 0},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_crear_producto_stock_negativo_retorna_422(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST with stock_cantidad=-1 → 422."""
    tokens = await _seed_users(db_session)

    resp = await client.post(
        "/api/v1/productos",
        json={"nombre": "Stock Neg", "precio_base": "100", "stock_cantidad": -1},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_listar_productos_con_paginacion(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /api/v1/productos → 200 with paginated list."""
    tokens = await _seed_users(db_session)

    for i in range(3):
        await _create_producto(client, tokens["admin"], nombre=f"Producto {i}", precio="100.00")

    resp = await client.get("/api/v1/productos?page=1&size=2")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["page"] == 1
    assert data["size"] == 2


@pytest.mark.asyncio
async def test_filtro_por_nombre(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /api/v1/productos?nombre=pizza filters by name."""
    tokens = await _seed_users(db_session)

    await _create_producto(client, tokens["admin"], nombre="Pizza Margarita")
    await _create_producto(client, tokens["admin"], nombre="Empanadas")

    resp = await client.get("/api/v1/productos?nombre=pizza")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["nombre"] == "Pizza Margarita"


@pytest.mark.asyncio
async def test_filtro_por_categoria(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /api/v1/productos?categoria_id=X filters by category."""
    tokens = await _seed_users(db_session)

    cat_id = await _create_categoria(client, tokens["admin"], "Pizzas")
    prod = await _create_producto(client, tokens["admin"], nombre="Pizza Napoli")

    # Assign category
    await client.put(
        f"/api/v1/productos/{prod['id']}/categorias",
        json={"categoria_ids": [cat_id]},
        headers=_auth_headers(tokens["admin"]),
    )

    # Another product without category
    await _create_producto(client, tokens["admin"], nombre="Agua")

    resp = await client.get(f"/api/v1/productos?categoria_id={cat_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["nombre"] == "Pizza Napoli"


@pytest.mark.asyncio
async def test_obtener_detalle_con_ingredientes_y_categorias(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """GET /api/v1/productos/{id} → 200 with categorias and ingredientes."""
    tokens = await _seed_users(db_session)

    cat_id = await _create_categoria(client, tokens["admin"], "Pizzas")
    ing_id = await _create_ingrediente(client, tokens["admin"], "Tomate")
    prod = await _create_producto(client, tokens["admin"], "Pizza Detail")

    await client.put(
        f"/api/v1/productos/{prod['id']}/categorias",
        json={"categoria_ids": [cat_id]},
        headers=_auth_headers(tokens["admin"]),
    )
    await client.put(
        f"/api/v1/productos/{prod['id']}/ingredientes",
        json={"ingredientes": [{"ingrediente_id": ing_id, "es_removible": True}]},
        headers=_auth_headers(tokens["admin"]),
    )

    resp = await client.get(f"/api/v1/productos/{prod['id']}")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data["categorias"]) == 1
    assert data["categorias"][0]["id"] == cat_id
    assert len(data["ingredientes"]) == 1
    assert data["ingredientes"][0]["id"] == ing_id
    assert data["ingredientes"][0]["es_removible"] is True


@pytest.mark.asyncio
async def test_detalle_producto_eliminado_retorna_404(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """GET /api/v1/productos/{id} after soft delete → 404."""
    tokens = await _seed_users(db_session)
    prod = await _create_producto(client, tokens["admin"])

    del_resp = await client.delete(
        f"/api/v1/productos/{prod['id']}",
        headers=_auth_headers(tokens["admin"]),
    )
    assert del_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/productos/{prod['id']}")
    assert get_resp.status_code == 404


# ---------------------------------------------------------------------------
# Task 7.3 — Sync categorías
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sync_categorias_asignar(client: AsyncClient, db_session: AsyncSession) -> None:
    """PUT /api/v1/productos/{id}/categorias assigns categories."""
    tokens = await _seed_users(db_session)
    cat_id = await _create_categoria(client, tokens["admin"], "Bebidas")
    prod = await _create_producto(client, tokens["admin"])

    resp = await client.put(
        f"/api/v1/productos/{prod['id']}/categorias",
        json={"categoria_ids": [cat_id]},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 200, resp.text
    assert len(resp.json()["categorias"]) == 1


@pytest.mark.asyncio
async def test_sync_categorias_reemplazar(client: AsyncClient, db_session: AsyncSession) -> None:
    """PUT /api/v1/productos/{id}/categorias replaces existing categories."""
    tokens = await _seed_users(db_session)
    cat1_id = await _create_categoria(client, tokens["admin"], "Cat1")
    cat2_id = await _create_categoria(client, tokens["admin"], "Cat2")
    prod = await _create_producto(client, tokens["admin"])

    await client.put(
        f"/api/v1/productos/{prod['id']}/categorias",
        json={"categoria_ids": [cat1_id]},
        headers=_auth_headers(tokens["admin"]),
    )

    resp = await client.put(
        f"/api/v1/productos/{prod['id']}/categorias",
        json={"categoria_ids": [cat2_id]},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 200
    cat_ids = [c["id"] for c in resp.json()["categorias"]]
    assert cat1_id not in cat_ids
    assert cat2_id in cat_ids


@pytest.mark.asyncio
async def test_sync_categorias_vaciar(client: AsyncClient, db_session: AsyncSession) -> None:
    """PUT /api/v1/productos/{id}/categorias with [] clears categories."""
    tokens = await _seed_users(db_session)
    cat_id = await _create_categoria(client, tokens["admin"], "Snacks")
    prod = await _create_producto(client, tokens["admin"])

    await client.put(
        f"/api/v1/productos/{prod['id']}/categorias",
        json={"categoria_ids": [cat_id]},
        headers=_auth_headers(tokens["admin"]),
    )

    resp = await client.put(
        f"/api/v1/productos/{prod['id']}/categorias",
        json={"categoria_ids": []},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 200
    assert resp.json()["categorias"] == []


@pytest.mark.asyncio
async def test_sync_categorias_inexistente_retorna_422(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """PUT /api/v1/productos/{id}/categorias with invalid id → 422 CATEGORIA_NOT_FOUND."""
    tokens = await _seed_users(db_session)
    prod = await _create_producto(client, tokens["admin"])

    resp = await client.put(
        f"/api/v1/productos/{prod['id']}/categorias",
        json={"categoria_ids": [9999]},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "CATEGORIA_NOT_FOUND"


# ---------------------------------------------------------------------------
# Task 7.4 — Sync ingredientes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sync_ingredientes_asignar(client: AsyncClient, db_session: AsyncSession) -> None:
    """PUT /api/v1/productos/{id}/ingredientes assigns ingredientes."""
    tokens = await _seed_users(db_session)
    ing_id = await _create_ingrediente(client, tokens["admin"], "Mozzarella")
    prod = await _create_producto(client, tokens["admin"])

    resp = await client.put(
        f"/api/v1/productos/{prod['id']}/ingredientes",
        json={"ingredientes": [{"ingrediente_id": ing_id, "es_removible": True}]},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 200, resp.text
    assert len(resp.json()["ingredientes"]) == 1
    assert resp.json()["ingredientes"][0]["es_removible"] is True


@pytest.mark.asyncio
async def test_sync_ingredientes_reemplazar(client: AsyncClient, db_session: AsyncSession) -> None:
    """PUT /api/v1/productos/{id}/ingredientes replaces existing ingredientes."""
    tokens = await _seed_users(db_session)
    ing1_id = await _create_ingrediente(client, tokens["admin"], "Queso")
    ing2_id = await _create_ingrediente(client, tokens["admin"], "Jamon")
    prod = await _create_producto(client, tokens["admin"])

    await client.put(
        f"/api/v1/productos/{prod['id']}/ingredientes",
        json={"ingredientes": [{"ingrediente_id": ing1_id, "es_removible": False}]},
        headers=_auth_headers(tokens["admin"]),
    )

    resp = await client.put(
        f"/api/v1/productos/{prod['id']}/ingredientes",
        json={"ingredientes": [{"ingrediente_id": ing2_id, "es_removible": True}]},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 200
    ing_ids = [i["id"] for i in resp.json()["ingredientes"]]
    assert ing1_id not in ing_ids
    assert ing2_id in ing_ids


@pytest.mark.asyncio
async def test_sync_ingrediente_eliminado_retorna_422(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """PUT /api/v1/productos/{id}/ingredientes with deleted ingredient → 422."""
    tokens = await _seed_users(db_session)
    ing_id = await _create_ingrediente(client, tokens["admin"], "Pimienta")
    prod = await _create_producto(client, tokens["admin"])

    # Delete the ingredient
    await client.delete(f"/api/v1/ingredientes/{ing_id}", headers=_auth_headers(tokens["admin"]))

    resp = await client.put(
        f"/api/v1/productos/{prod['id']}/ingredientes",
        json={"ingredientes": [{"ingrediente_id": ing_id, "es_removible": False}]},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "INGREDIENTE_NOT_FOUND"


# ---------------------------------------------------------------------------
# Task 7.5 — Stock tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stock_delta_positivo(client: AsyncClient, db_session: AsyncSession) -> None:
    """PATCH /api/v1/productos/{id}/stock with positive delta increases stock."""
    tokens = await _seed_users(db_session)
    prod = await _create_producto(client, tokens["admin"], stock=10)

    resp = await client.patch(
        f"/api/v1/productos/{prod['id']}/stock",
        json={"delta": 5},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["stock_cantidad"] == 15


@pytest.mark.asyncio
async def test_stock_delta_negativo_valido(client: AsyncClient, db_session: AsyncSession) -> None:
    """PATCH /api/v1/productos/{id}/stock with valid negative delta decreases stock."""
    tokens = await _seed_users(db_session)
    prod = await _create_producto(client, tokens["admin"], stock=10)

    resp = await client.patch(
        f"/api/v1/productos/{prod['id']}/stock",
        json={"delta": -3},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["stock_cantidad"] == 7


@pytest.mark.asyncio
async def test_stock_delta_negativo_excede_retorna_422(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """PATCH /api/v1/productos/{id}/stock with delta that would go negative → 422."""
    tokens = await _seed_users(db_session)
    prod = await _create_producto(client, tokens["admin"], stock=5)

    resp = await client.patch(
        f"/api/v1/productos/{prod['id']}/stock",
        json={"delta": -10},
        headers=_auth_headers(tokens["admin"]),
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "STOCK_INSUFICIENTE"


# ---------------------------------------------------------------------------
# Task 7.6 — Authorization tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_client_no_puede_crear_producto(client: AsyncClient, db_session: AsyncSession) -> None:
    """CLIENT role cannot create products → 403."""
    tokens = await _seed_users(db_session)

    resp = await client.post(
        "/api/v1/productos",
        json={"nombre": "Test", "precio_base": "100", "stock_cantidad": 0},
        headers=_auth_headers(tokens["client"]),
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_client_no_puede_editar_producto(client: AsyncClient, db_session: AsyncSession) -> None:
    """CLIENT role cannot edit products → 403."""
    tokens = await _seed_users(db_session)
    prod = await _create_producto(client, tokens["admin"])

    resp = await client.put(
        f"/api/v1/productos/{prod['id']}",
        json={"nombre": "Nuevo nombre"},
        headers=_auth_headers(tokens["client"]),
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_client_no_puede_eliminar_producto(client: AsyncClient, db_session: AsyncSession) -> None:
    """CLIENT role cannot delete products → 403."""
    tokens = await _seed_users(db_session)
    prod = await _create_producto(client, tokens["admin"])

    resp = await client.delete(
        f"/api/v1/productos/{prod['id']}",
        headers=_auth_headers(tokens["client"]),
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_stock_no_puede_eliminar_producto(client: AsyncClient, db_session: AsyncSession) -> None:
    """STOCK role cannot delete products (only ADMIN can) → 403."""
    tokens = await _seed_users(db_session)
    prod = await _create_producto(client, tokens["admin"])

    resp = await client.delete(
        f"/api/v1/productos/{prod['id']}",
        headers=_auth_headers(tokens["stock"]),
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_sin_token_retorna_401(client: AsyncClient, db_session: AsyncSession) -> None:
    """No token → 401 for protected endpoints."""
    resp = await client.post(
        "/api/v1/productos",
        json={"nombre": "Test", "precio_base": "100", "stock_cantidad": 0},
    )
    assert resp.status_code == 401, resp.text


@pytest.mark.asyncio
async def test_stock_puede_crear_producto(client: AsyncClient, db_session: AsyncSession) -> None:
    """STOCK role can create products → 201."""
    tokens = await _seed_users(db_session)

    resp = await client.post(
        "/api/v1/productos",
        json={"nombre": "Producto Stock", "precio_base": "200.00", "stock_cantidad": 5},
        headers=_auth_headers(tokens["stock"]),
    )
    assert resp.status_code == 201, resp.text


@pytest.mark.asyncio
async def test_lista_productos_es_publica(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /api/v1/productos is public (no token required)."""
    resp = await client.get("/api/v1/productos")
    assert resp.status_code == 200, resp.text
