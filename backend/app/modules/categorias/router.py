from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.core.deps import CurrentUser, require_roles
from app.core.uow import UnitOfWork
from app.modules.categorias import service
from app.modules.categorias.schemas import CategoriaCreate, CategoriaRead, CategoriaTree, CategoriaUpdate

router = APIRouter(prefix="/categorias", tags=["categorias"])


@router.get("", response_model=list[CategoriaTree])
async def list_categorias() -> list[CategoriaTree]:
    """Return the full category tree. Public endpoint."""
    async with UnitOfWork() as uow:
        return await service.get_tree(uow)


@router.get("/{categoria_id}", response_model=CategoriaTree)
async def get_categoria(categoria_id: int) -> CategoriaTree:
    """Return a single category with its direct children. Public endpoint."""
    async with UnitOfWork() as uow:
        return await service.get_by_id(uow, categoria_id)


@router.post("", response_model=CategoriaRead, status_code=status.HTTP_201_CREATED)
async def create_categoria(
    data: CategoriaCreate,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> CategoriaRead:
    """Create a new category. Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        return await service.create(uow, data)


@router.put("/{categoria_id}", response_model=CategoriaRead)
async def update_categoria(
    categoria_id: int,
    data: CategoriaUpdate,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> CategoriaRead:
    """Update a category. Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        return await service.update(uow, categoria_id, data)


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_categoria(
    categoria_id: int,
    _current_user: Annotated[CurrentUser, Depends(require_roles("ADMIN", "STOCK"))],
) -> Response:
    """Soft delete a category. Requires ADMIN or STOCK role."""
    async with UnitOfWork() as uow:
        await service.delete(uow, categoria_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
