import asyncio
import os
import sys
from logging.config import fileConfig

# asyncpg requires SelectorEventLoop on Windows (Python 3.13+)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Make sure app package is importable when running alembic from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import settings so DATABASE_URL is available
from app.core.config import settings  # noqa: E402

# Import base metadata (registers all models via SQLModel)
from sqlmodel import SQLModel  # noqa: E402
from app.core.models import TimestampModel, SoftDeleteModel  # noqa: E402, F401

# Import all models so Alembic's autogenerate picks them up
from app.modules.usuarios.model import Rol, Usuario, UsuarioRol  # noqa: E402, F401
from app.modules.refreshtokens.model import RefreshToken  # noqa: E402, F401
from app.modules.direcciones.model import DireccionEntrega  # noqa: E402, F401
from app.modules.categorias.model import Categoria  # noqa: E402, F401
from app.modules.ingredientes.model import Ingrediente  # noqa: E402, F401
from app.modules.productos.model import (  # noqa: E402, F401
    Producto,
    ProductoCategoria,
    ProductoIngrediente,
)
from app.modules.pagos.model import FormaPago, Pago  # noqa: E402, F401
from app.modules.pedidos.model import (  # noqa: E402, F401
    EstadoPedido,
    Pedido,
    DetallePedido,
    HistorialEstadoPedido,
)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Override sqlalchemy.url with value from settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' async mode."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
