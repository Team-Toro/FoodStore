from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Response, status

from app.core.deps import CurrentUser, require_roles
from app.core.uow import UnitOfWork
from app.modules.ingredientes import service
from app.modules.ingredientes.schemas import IngredienteCreate, IngredienteRead, IngredienteUpdate

router = APIRouter(prefix="/ingredientes", tags=["ingredientes"])


@router.get("", response_model=dict)
async def list_ingredientes(
    es_alergeno: Optional[bool] = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    """List ingredientes with optional es_alergeno filter. Public endpoint."""
    async with UnitOfWork() as uow:
        return await service.listar(uow, es_alergeno=es_alergeno, page=page, size=size)


@router.get("/{ingrediente_id}", response_model=IngredienteRead)
async def get_ingrediente(ingrediente_id: int) -> IngredienteRead:
    """Get ingrediente by ID. Public endpoint."""
    async with UnitOfWork() as uow:
        return await service.obtener_por_id(uow, ingrediente_id)


@router.post("", response_model=IngredienteRead, status_code=status.HTTP_201_CREATED)
async def create_ingrediente(
    data: IngredienteCreate,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> IngredienteRead:
    """Create a new ingrediente. Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        return await service.crear(uow, data)


@router.put("/{ingrediente_id}", response_model=IngredienteRead)
async def update_ingrediente(
    ingrediente_id: int,
    data: IngredienteUpdate,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> IngredienteRead:
    """Update an ingrediente. Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        return await service.actualizar(uow, ingrediente_id, data)


@router.delete("/{ingrediente_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingrediente(
    ingrediente_id: int,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> Response:
    """Soft delete an ingrediente. Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        await service.eliminar(uow, ingrediente_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
