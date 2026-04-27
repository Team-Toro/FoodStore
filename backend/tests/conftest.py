"""Shared test fixtures for the Food Store backend.

Uses an in-memory SQLite async database for speed and isolation.
Each test function gets a fresh database via the `db_session` fixture.
"""
from __future__ import annotations

import asyncio
import sys
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel

# Windows asyncpg fix
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# ---------------------------------------------------------------------------
# Override DATABASE_URL before importing app modules that read settings
# ---------------------------------------------------------------------------
import os

os.environ.setdefault(
    "DATABASE_URL", "sqlite+aiosqlite:///:memory:"
)
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-chars-long!!")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("REFRESH_TOKEN_EXPIRE_DAYS", "7")

# ---------------------------------------------------------------------------
# Import app AFTER setting env vars
# ---------------------------------------------------------------------------
from app.core.config import settings  # noqa: E402

# Patch DATABASE_URL for the engine used in tests
settings.DATABASE_URL = "sqlite+aiosqlite:///:memory:"

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.main import app  # noqa: E402

# Import all models so SQLModel.metadata is populated
from app.modules.usuarios.model import Rol, Usuario, UsuarioRol  # noqa: E402, F401
from app.modules.refreshtokens.model import RefreshToken  # noqa: E402, F401
from app.modules.categorias.model import Categoria  # noqa: E402, F401
from app.modules.ingredientes.model import Ingrediente  # noqa: E402, F401
from app.modules.productos.model import Producto, ProductoCategoria, ProductoIngrediente  # noqa: E402, F401
from app.modules.pedidos.model import EstadoPedido, Pedido, DetallePedido, HistorialEstadoPedido  # noqa: E402, F401
from app.modules.pagos.model import FormaPago, Pago  # noqa: E402, F401
from app.modules.direcciones.model import DireccionEntrega  # noqa: E402, F401

# ---------------------------------------------------------------------------
# Test engine (in-memory SQLite)
# ---------------------------------------------------------------------------
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create fresh tables and yield an async session for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client wired to the test DB session."""
    from app.core import database as db_module
    from app.core import uow as uow_module
    from app.modules.admin.repository import AdminRepository, AdminMetricasRepository
    from app.modules.usuarios.repository import UsuarioRepository, RolRepository, UsuarioRolRepository
    from app.modules.refreshtokens.repository import RefreshTokenRepository
    from app.modules.categorias.repository import CategoriaRepository
    from app.modules.ingredientes.repository import IngredienteRepository
    from app.modules.productos.repository import ProductoRepository
    from app.modules.pedidos.repository import (
        PedidoRepository,
        DetallePedidoRepository,
        HistorialEstadoPedidoRepository,
    )
    from app.modules.pagos.repository import PagoRepository
    from app.modules.direcciones.repository import DireccionRepository
    from app.core.limiter import limiter

    # Reset rate limiter state so each test starts with clean counters
    limiter._storage.reset()

    # Patch UnitOfWork to use test session
    original_session_local = db_module.AsyncSessionLocal

    class TestUoW:
        async def __aenter__(self) -> "TestUoW":
            self.session = db_session
            self.admin = AdminRepository(self.session)
            self.admin_metricas = AdminMetricasRepository(self.session)
            self.usuarios = UsuarioRepository(self.session)
            self.roles = RolRepository(self.session)
            self.usuario_roles = UsuarioRolRepository(self.session)
            self.refresh_tokens = RefreshTokenRepository(self.session)
            self.categorias = CategoriaRepository(self.session)
            self.ingredientes = IngredienteRepository(self.session)
            self.productos = ProductoRepository(self.session)
            self.pedidos = PedidoRepository(self.session)
            self.detalles_pedido = DetallePedidoRepository(self.session)
            self.historial_pedido = HistorialEstadoPedidoRepository(self.session)
            self.pagos = PagoRepository(self.session)
            self.direcciones = DireccionRepository(self.session)
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
            if exc_type is None:
                await self.session.flush()
            # Don't close the test session

    uow_module.UnitOfWork = TestUoW  # type: ignore[attr-defined]

    # Also patch all modules that imported UnitOfWork directly
    import app.modules.auth.router as auth_router_module
    import app.core.deps as deps_module
    import app.modules.admin.router as admin_router_module
    import app.modules.categorias.router as categorias_router_module
    import app.modules.ingredientes.router as ingredientes_router_module
    import app.modules.productos.router as productos_router_module
    import app.modules.pedidos.router as pedidos_router_module
    import app.modules.pagos.router as pagos_router_module
    import app.modules.direcciones.router as direcciones_router_module

    original_auth_router_uow = auth_router_module.UnitOfWork
    original_deps_uow = deps_module.UnitOfWork
    original_admin_router_uow = admin_router_module.UnitOfWork
    original_categorias_router_uow = categorias_router_module.UnitOfWork
    original_ingredientes_router_uow = ingredientes_router_module.UnitOfWork
    original_productos_router_uow = productos_router_module.UnitOfWork
    original_pedidos_router_uow = pedidos_router_module.UnitOfWork
    original_pagos_router_uow = pagos_router_module.UnitOfWork
    original_direcciones_router_uow = direcciones_router_module.UnitOfWork

    auth_router_module.UnitOfWork = TestUoW  # type: ignore[attr-defined]
    deps_module.UnitOfWork = TestUoW  # type: ignore[attr-defined]
    admin_router_module.UnitOfWork = TestUoW  # type: ignore[attr-defined]
    categorias_router_module.UnitOfWork = TestUoW  # type: ignore[attr-defined]
    ingredientes_router_module.UnitOfWork = TestUoW  # type: ignore[attr-defined]
    productos_router_module.UnitOfWork = TestUoW  # type: ignore[attr-defined]
    pedidos_router_module.UnitOfWork = TestUoW  # type: ignore[attr-defined]
    pagos_router_module.UnitOfWork = TestUoW  # type: ignore[attr-defined]
    direcciones_router_module.UnitOfWork = TestUoW  # type: ignore[attr-defined]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    # Restore all patched references
    uow_module.UnitOfWork = __import__(
        "app.core.uow", fromlist=["UnitOfWork"]
    ).UnitOfWork
    auth_router_module.UnitOfWork = original_auth_router_uow
    deps_module.UnitOfWork = original_deps_uow
    admin_router_module.UnitOfWork = original_admin_router_uow
    categorias_router_module.UnitOfWork = original_categorias_router_uow
    ingredientes_router_module.UnitOfWork = original_ingredientes_router_uow
    productos_router_module.UnitOfWork = original_productos_router_uow
    pedidos_router_module.UnitOfWork = original_pedidos_router_uow
    pagos_router_module.UnitOfWork = original_pagos_router_uow
    direcciones_router_module.UnitOfWork = original_direcciones_router_uow


@pytest_asyncio.fixture
async def seed_roles(db_session: AsyncSession) -> None:
    """Insert the 4 fixed roles into the test DB."""
    from sqlalchemy import text

    await db_session.execute(
        text("""
            INSERT INTO rol (id, codigo, nombre, descripcion)
            VALUES
                (1, 'ADMIN',   'Administrador',      'Acceso total'),
                (2, 'STOCK',   'Gestión de stock',   'Stock'),
                (3, 'PEDIDOS', 'Gestión de pedidos', 'Pedidos'),
                (4, 'CLIENT',  'Cliente',             'Cliente registrado')
        """)
    )
    await db_session.commit()


@pytest_asyncio.fixture
async def registered_user(client: AsyncClient, seed_roles: None) -> dict:
    """Register a test user and return the token response payload."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "nombre": "Test",
            "apellido": "User",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()
