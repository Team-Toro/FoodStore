from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.deps import CurrentUser, require_roles
from app.core.uow import UnitOfWork
from app.modules.ingredientes.schemas import IngredienteRead
from app.modules.productos import service
from app.modules.productos.schemas import (
    DisponibilidadUpdate,
    ProductoCategoriasUpdate,
    ProductoCreate,
    ProductoDetail,
    ProductoIngredientesUpdate,
    ProductoRead,
    StockUpdate,
    ProductoUpdate,
)

router = APIRouter(prefix="/productos", tags=["productos"])


@router.get("", response_model=dict)
async def list_productos(
    page: int = 1,
    size: int = 20,
    categoria_id: Optional[int] = None,
    nombre: Optional[str] = None,
    disponible: Optional[bool] = None,
    excluir_alergenos: Optional[str] = Query(None, description="Comma-separated ingredient IDs to exclude"),
) -> dict:
    """List productos with optional filters. Public endpoint."""
    alergenos: list[int] | None = None
    if excluir_alergenos:
        alergenos = [int(x) for x in excluir_alergenos.split(",") if x.strip()]
    async with UnitOfWork() as uow:
        return await service.listar_productos(
            uow,
            page=page,
            size=size,
            categoria_id=categoria_id,
            nombre=nombre,
            disponible=disponible,
            excluir_alergenos=alergenos or None,
        )


@router.get("/{producto_id}", response_model=ProductoDetail)
async def get_producto(producto_id: int) -> ProductoDetail:
    """Get producto detail with categorias and ingredientes. Public endpoint."""
    async with UnitOfWork() as uow:
        return await service.obtener_producto(uow, producto_id)


@router.post("", response_model=ProductoRead, status_code=status.HTTP_201_CREATED)
async def create_producto(
    data: ProductoCreate,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> ProductoRead:
    """Create a new producto. Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        return await service.crear_producto(uow, data)


@router.put("/{producto_id}", response_model=ProductoRead)
async def update_producto(
    producto_id: int,
    data: ProductoUpdate,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> ProductoRead:
    """Update a producto. Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        return await service.actualizar_producto(uow, producto_id, data)


@router.patch("/{producto_id}/disponibilidad", response_model=ProductoRead)
async def update_disponibilidad(
    producto_id: int,
    data: DisponibilidadUpdate,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> ProductoRead:
    """Update product availability. Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        return await service.cambiar_disponibilidad(uow, producto_id, data.disponible)


@router.patch("/{producto_id}/stock", response_model=ProductoRead)
async def update_stock(
    producto_id: int,
    data: StockUpdate,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> ProductoRead:
    """Update product stock by delta. Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        return await service.actualizar_stock(uow, producto_id, data.delta)


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_producto(
    producto_id: int,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN"))],
) -> Response:
    """Soft delete a producto. Requires ADMIN role only."""
    async with UnitOfWork() as uow:
        await service.eliminar_producto(uow, producto_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{producto_id}/categorias", response_model=ProductoDetail)
async def sync_categorias(
    producto_id: int,
    data: ProductoCategoriasUpdate,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> ProductoDetail:
    """Sync product categories (replace all). Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        return await service.sync_categorias_producto(uow, producto_id, data.categoria_ids)


@router.put("/{producto_id}/ingredientes", response_model=ProductoDetail)
async def sync_ingredientes(
    producto_id: int,
    data: ProductoIngredientesUpdate,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> ProductoDetail:
    """Sync product ingredientes (replace all). Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        return await service.sync_ingredientes_producto(uow, producto_id, data.ingredientes)


@router.get("/{producto_id}/ingredientes", response_model=list[IngredienteRead])
async def get_producto_ingredientes(producto_id: int) -> list[IngredienteRead]:
    """Get ingredientes for a producto. Public endpoint."""
    async with UnitOfWork() as uow:
        detail = await service.obtener_producto(uow, producto_id)
        return detail.ingredientes
