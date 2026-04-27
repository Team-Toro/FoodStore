from __future__ import annotations

from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends

from app.core.deps import CurrentUser, require_roles
from app.core.uow import UnitOfWork
from app.modules.admin import service as admin_service
from app.modules.admin.schemas import (
    EstadoUpdateRequest,
    PaginatedProductosAdmin,
    PaginatedUsuariosAdmin,
    PedidosPorEstado,
    ProductoAdminRead,
    ResumenMetricas,
    RolesUpdateRequest,
    TopProducto,
    UsuarioAdminRead,
    VentasPorPeriodo,
)

router = APIRouter(prefix="/admin", tags=["admin"])

_usuario_svc = admin_service.AdminUsuarioService()
_metricas_svc = admin_service.AdminMetricasService()


# ---------------------------------------------------------------------------
# User management endpoints
# ---------------------------------------------------------------------------

@router.get("/usuarios", response_model=PaginatedUsuariosAdmin)
async def listar_usuarios(
    current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN"))],
    q: Optional[str] = None,
    rol: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> PaginatedUsuariosAdmin:
    """List all users (paginated). Requires ADMIN role."""
    async with UnitOfWork() as uow:
        return await _usuario_svc.listar_usuarios(uow, q=q, rol=rol, page=page, size=size)


@router.patch("/usuarios/{usuario_id}/roles", response_model=UsuarioAdminRead)
async def actualizar_roles(
    usuario_id: int,
    body: RolesUpdateRequest,
    current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN"))],
) -> UsuarioAdminRead:
    """Replace user roles. Requires ADMIN role."""
    async with UnitOfWork() as uow:
        return await _usuario_svc.actualizar_roles(
            uow, usuario_id, body.roles, current_user.id
        )


@router.patch("/usuarios/{usuario_id}/estado", response_model=UsuarioAdminRead)
async def actualizar_estado(
    usuario_id: int,
    body: EstadoUpdateRequest,
    current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN"))],
) -> UsuarioAdminRead:
    """Activate/deactivate a user. Requires ADMIN role."""
    async with UnitOfWork() as uow:
        return await _usuario_svc.actualizar_estado(
            uow, usuario_id, body.activo, current_user.id
        )


# ---------------------------------------------------------------------------
# Productos admin endpoint
# ---------------------------------------------------------------------------

@router.get("/productos", response_model=PaginatedProductosAdmin)
async def listar_productos_admin(
    current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN"))],
    nombre: Optional[str] = None,
    disponible: Optional[bool] = None,
    incluir_eliminados: bool = False,
    page: int = 1,
    size: int = 20,
) -> PaginatedProductosAdmin:
    """List all products including soft-deleted. Requires ADMIN role."""
    async with UnitOfWork() as uow:
        items, total = await uow.productos.list_paginated_admin(
            nombre=nombre,
            disponible=disponible,
            incluir_eliminados=incluir_eliminados,
            page=page,
            size=size,
        )
        pages = max(1, -(-total // size))  # ceil division
        return PaginatedProductosAdmin(
            items=[ProductoAdminRead.model_validate(p) for p in items],
            total=total,
            page=page,
            size=size,
            pages=pages,
        )


# ---------------------------------------------------------------------------
# Metrics endpoints
# ---------------------------------------------------------------------------

@router.get("/metricas/resumen", response_model=ResumenMetricas)
async def get_resumen(
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN"))],
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
) -> ResumenMetricas:
    """Return KPI summary. Requires ADMIN role."""
    async with UnitOfWork() as uow:
        return await _metricas_svc.get_resumen(uow, desde, hasta)


@router.get("/metricas/ventas", response_model=List[VentasPorPeriodo])
async def get_ventas(
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN"))],
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    granularidad: str = "day",
) -> List[VentasPorPeriodo]:
    """Return sales aggregated by period. Requires ADMIN role."""
    async with UnitOfWork() as uow:
        return await _metricas_svc.get_ventas(uow, desde, hasta, granularidad)


@router.get("/metricas/productos-top", response_model=List[TopProducto])
async def get_top_productos(
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN"))],
    top: int = 10,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
) -> List[TopProducto]:
    """Return top N products by quantity sold. Requires ADMIN role."""
    async with UnitOfWork() as uow:
        return await _metricas_svc.get_top_productos(uow, top, desde, hasta)


@router.get("/metricas/pedidos-por-estado", response_model=List[PedidosPorEstado])
async def get_pedidos_por_estado(
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN"))],
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
) -> List[PedidosPorEstado]:
    """Return order count by state. Requires ADMIN role."""
    async with UnitOfWork() as uow:
        return await _metricas_svc.get_pedidos_por_estado(uow, desde, hasta)
