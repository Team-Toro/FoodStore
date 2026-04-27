"""Tests for admin user management endpoints.

Uses in-memory SQLite via the shared `client` fixture.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.security import create_access_token, hash_password
from app.modules.usuarios.model import Usuario, UsuarioRol


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_roles(db_session: AsyncSession) -> None:
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


async def _create_user(
    db_session: AsyncSession,
    email: str,
    nombre: str = "Test",
    apellido: str = "User",
    rol_id: int = 4,
    activo: bool = True,
) -> tuple[Usuario, str]:
    """Create a user with a given role, return (usuario, access_token)."""
    user = Usuario(
        nombre=nombre,
        apellido=apellido,
        email=email,
        password_hash=hash_password("Password1!"),
        activo=activo,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)

    link = UsuarioRol(usuario_id=user.id, rol_id=rol_id)
    db_session.add(link)
    await db_session.flush()

    token = create_access_token({"sub": str(user.id)})
    return user, token


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# GET /admin/usuarios
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_listar_usuarios_requiere_admin(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Non-admin cannot list users."""
    await _seed_roles(db_session)
    _client_user, client_token = await _create_user(db_session, "client@test.com", rol_id=4)

    resp = await client.get("/api/v1/admin/usuarios", headers=_headers(client_token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_listar_usuarios_exitoso(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """ADMIN can list users with pagination."""
    await _seed_roles(db_session)
    _admin, admin_token = await _create_user(db_session, "admin@test.com", rol_id=1)
    await _create_user(db_session, "client@test.com", rol_id=4)

    resp = await client.get("/api/v1/admin/usuarios", headers=_headers(admin_token))
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 2


@pytest.mark.asyncio
async def test_listar_usuarios_filtro_busqueda(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Search by name filters results."""
    await _seed_roles(db_session)
    _admin, admin_token = await _create_user(
        db_session, "admin@test.com", nombre="Admin", rol_id=1
    )
    await _create_user(db_session, "juan@test.com", nombre="Juan", rol_id=4)

    resp = await client.get(
        "/api/v1/admin/usuarios", params={"q": "juan"}, headers=_headers(admin_token)
    )
    assert resp.status_code == 200
    data = resp.json()
    assert all("juan" in item["nombre"].lower() or "juan" in item["email"].lower()
               for item in data["items"])


# ---------------------------------------------------------------------------
# PATCH /admin/usuarios/{id}/roles
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_actualizar_roles_exitoso(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """ADMIN can update user roles."""
    await _seed_roles(db_session)
    _admin, admin_token = await _create_user(db_session, "admin@test.com", rol_id=1)
    target, _ = await _create_user(db_session, "target@test.com", rol_id=4)

    resp = await client.patch(
        f"/api/v1/admin/usuarios/{target.id}/roles",
        json={"roles": ["STOCK"]},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "STOCK" in data["roles"]


@pytest.mark.asyncio
async def test_actualizar_roles_ultimo_admin_bloqueado(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Cannot remove ADMIN role from the last admin."""
    await _seed_roles(db_session)
    admin, admin_token = await _create_user(db_session, "admin@test.com", rol_id=1)

    resp = await client.patch(
        f"/api/v1/admin/usuarios/{admin.id}/roles",
        json={"roles": ["CLIENT"]},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 409
    assert resp.json()["code"] == "LAST_ADMIN"


@pytest.mark.asyncio
async def test_actualizar_roles_con_dos_admins(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Can remove ADMIN from one user if another admin exists."""
    await _seed_roles(db_session)
    admin1, admin_token = await _create_user(db_session, "admin1@test.com", rol_id=1)
    admin2, _ = await _create_user(db_session, "admin2@test.com", rol_id=1)

    resp = await client.patch(
        f"/api/v1/admin/usuarios/{admin2.id}/roles",
        json={"roles": ["CLIENT"]},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    assert "CLIENT" in resp.json()["roles"]


# ---------------------------------------------------------------------------
# PATCH /admin/usuarios/{id}/estado
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_desactivar_usuario_exitoso(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """ADMIN can deactivate a user."""
    await _seed_roles(db_session)
    _admin, admin_token = await _create_user(db_session, "admin@test.com", rol_id=1)
    target, _ = await _create_user(db_session, "target@test.com", rol_id=4)

    resp = await client.patch(
        f"/api/v1/admin/usuarios/{target.id}/estado",
        json={"activo": False},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["activo"] is False


@pytest.mark.asyncio
async def test_activar_usuario_exitoso(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """ADMIN can activate a previously inactive user."""
    await _seed_roles(db_session)
    _admin, admin_token = await _create_user(db_session, "admin@test.com", rol_id=1)
    target, _ = await _create_user(
        db_session, "inactive@test.com", rol_id=4, activo=False
    )

    resp = await client.patch(
        f"/api/v1/admin/usuarios/{target.id}/estado",
        json={"activo": True},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["activo"] is True


@pytest.mark.asyncio
async def test_auto_desactivacion_bloqueada(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Admin cannot deactivate their own account."""
    await _seed_roles(db_session)
    admin, admin_token = await _create_user(db_session, "admin@test.com", rol_id=1)

    resp = await client.patch(
        f"/api/v1/admin/usuarios/{admin.id}/estado",
        json={"activo": False},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 409
    assert resp.json()["code"] == "SELF_DEACTIVATION"


@pytest.mark.asyncio
async def test_revocacion_tokens_al_desactivar(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Deactivating a user revokes their refresh tokens."""
    from app.modules.refreshtokens.model import RefreshToken
    from sqlalchemy import select

    await _seed_roles(db_session)
    _admin, admin_token = await _create_user(db_session, "admin@test.com", rol_id=1)
    target, _ = await _create_user(db_session, "target@test.com", rol_id=4)

    # Create a fake refresh token for the target
    from datetime import datetime, timedelta, timezone
    from app.core.security import hash_refresh_token
    import uuid

    rt = RefreshToken(
        token_hash=hash_refresh_token(str(uuid.uuid4())),
        usuario_id=target.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(rt)
    await db_session.flush()

    # Deactivate
    resp = await client.patch(
        f"/api/v1/admin/usuarios/{target.id}/estado",
        json={"activo": False},
        headers=_headers(admin_token),
    )
    assert resp.status_code == 200

    # Verify token was revoked
    result = await db_session.execute(
        select(RefreshToken).where(RefreshToken.usuario_id == target.id)
    )
    token_row = result.scalar_one()
    assert token_row.revoked_at is not None
