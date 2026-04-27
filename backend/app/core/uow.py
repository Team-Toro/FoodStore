from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.modules.admin.repository import AdminMetricasRepository, AdminRepository
from app.modules.categorias.repository import CategoriaRepository
from app.modules.direcciones.repository import DireccionRepository
from app.modules.ingredientes.repository import IngredienteRepository
from app.modules.pagos.repository import PagoRepository
from app.modules.pedidos.repository import (
    DetallePedidoRepository,
    HistorialEstadoPedidoRepository,
    PedidoRepository,
)
from app.modules.productos.repository import ProductoRepository
from app.modules.refreshtokens.repository import RefreshTokenRepository
from app.modules.usuarios.repository import RolRepository, UsuarioRepository, UsuarioRolRepository


class UnitOfWork:
    """Async context manager that wraps a database session.

    Exposes repositories as attributes so services can work with them
    without managing the session directly.

    Usage::

        async with UnitOfWork() as uow:
            result = await service.do_something(uow, ...)
    """

    session: AsyncSession
    admin: AdminRepository
    admin_metricas: AdminMetricasRepository
    usuarios: UsuarioRepository
    roles: RolRepository
    usuario_roles: UsuarioRolRepository
    refresh_tokens: RefreshTokenRepository
    categorias: CategoriaRepository
    productos: ProductoRepository
    ingredientes: IngredienteRepository
    pedidos: PedidoRepository
    detalles_pedido: DetallePedidoRepository
    historial_pedido: HistorialEstadoPedidoRepository
    pagos: PagoRepository
    direcciones: DireccionRepository

    async def __aenter__(self) -> "UnitOfWork":
        self.session = AsyncSessionLocal()
        self.admin = AdminRepository(self.session)
        self.admin_metricas = AdminMetricasRepository(self.session)
        self.usuarios = UsuarioRepository(self.session)
        self.roles = RolRepository(self.session)
        self.usuario_roles = UsuarioRolRepository(self.session)
        self.refresh_tokens = RefreshTokenRepository(self.session)
        self.categorias = CategoriaRepository(self.session)
        self.productos = ProductoRepository(self.session)
        self.ingredientes = IngredienteRepository(self.session)
        self.pedidos = PedidoRepository(self.session)
        self.detalles_pedido = DetallePedidoRepository(self.session)
        self.historial_pedido = HistorialEstadoPedidoRepository(self.session)
        self.pagos = PagoRepository(self.session)
        self.direcciones = DireccionRepository(self.session)
        return self

    async def __aexit__(
        self,
        exc_type: type | None,
        exc_val: BaseException | None,
        exc_tb: object,
    ) -> None:
        if exc_type is None:
            await self.session.commit()
        else:
            await self.session.rollback()
        await self.session.close()
