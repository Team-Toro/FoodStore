from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, status

from app.core.deps import CurrentUser, require_roles
from app.core.uow import UnitOfWork
from app.modules.pedidos import service
from app.modules.pedidos.schemas import (
    CambiarEstadoRequest,
    CrearPedidoRequest,
    HistorialRead,
    PedidoDetail,
    PedidoRead,
)

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


@router.post("", response_model=PedidoRead, status_code=status.HTTP_201_CREATED)
async def crear_pedido(
    body: CrearPedidoRequest,
    current_user: Annotated[CurrentUser, Depends(require_roles("CLIENT"))],
) -> PedidoRead:
    """Create a new order. Requires CLIENT role."""
    async with UnitOfWork() as uow:
        return await service.crear_pedido(uow, body, current_user.id)


@router.get("", response_model=dict)
async def listar_pedidos(
    current_user: Annotated[
        CurrentUser, Depends(require_roles("CLIENT", "PEDIDOS", "ADMIN"))
    ],
    estado: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    """List pedidos. CLIENTs see only theirs; PEDIDOS/ADMIN see all."""
    rol = _primary_role(current_user)
    async with UnitOfWork() as uow:
        return await service.listar_pedidos(
            uow,
            usuario_id=current_user.id,
            rol=rol,
            estado=estado,
            page=page,
            size=size,
        )


@router.get("/{pedido_id}", response_model=PedidoDetail)
async def obtener_pedido(
    pedido_id: int,
    current_user: Annotated[
        CurrentUser, Depends(require_roles("CLIENT", "PEDIDOS", "ADMIN"))
    ],
) -> PedidoDetail:
    """Get full pedido detail. CLIENTs may only see their own."""
    rol = _primary_role(current_user)
    async with UnitOfWork() as uow:
        return await service.obtener_pedido(uow, pedido_id, current_user.id, rol)


@router.patch("/{pedido_id}/estado", response_model=PedidoRead)
async def cambiar_estado(
    pedido_id: int,
    body: CambiarEstadoRequest,
    current_user: Annotated[
        CurrentUser, Depends(require_roles("CLIENT", "PEDIDOS", "ADMIN"))
    ],
) -> PedidoRead:
    """Advance the order state according to the FSM.

    PEDIDOS/ADMIN may advance most states.
    CLIENT may only cancel their own orders.
    """
    rol = _primary_role(current_user)
    async with UnitOfWork() as uow:
        return await service.cambiar_estado(
            uow, pedido_id, body, current_user.id, rol
        )


@router.get("/{pedido_id}/historial", response_model=list[HistorialRead])
async def obtener_historial(
    pedido_id: int,
    current_user: Annotated[
        CurrentUser, Depends(require_roles("CLIENT", "PEDIDOS", "ADMIN"))
    ],
) -> list[HistorialRead]:
    """Return the append-only state history for a pedido."""
    rol = _primary_role(current_user)
    async with UnitOfWork() as uow:
        return await service.obtener_historial(uow, pedido_id, current_user.id, rol)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _primary_role(user: CurrentUser) -> str:
    """Return the highest-privilege role present in the user's role list.

    Priority: ADMIN > PEDIDOS > STOCK > CLIENT.
    Defaults to CLIENT if none match.
    """
    priority = ["ADMIN", "PEDIDOS", "STOCK", "CLIENT"]
    for role in priority:
        if role in user.roles:
            return role
    return "CLIENT"
