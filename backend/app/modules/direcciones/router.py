from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.core.deps import CurrentUser, require_roles
from app.core.uow import UnitOfWork
from app.modules.direcciones import service
from app.modules.direcciones.schemas import DireccionCreate, DireccionRead, DireccionUpdate

router = APIRouter(prefix="/direcciones", tags=["Direcciones"])


@router.get("", response_model=list[DireccionRead])
async def list_direcciones(
    current_user: Annotated[CurrentUser, Depends(require_roles("CLIENT"))],
) -> list[DireccionRead]:
    """List all delivery addresses for the current user."""
    async with UnitOfWork() as uow:
        items = await service.listar_direcciones(uow, current_user.id)
    return [DireccionRead.model_validate(d) for d in items]


@router.post("", response_model=DireccionRead, status_code=status.HTTP_201_CREATED)
async def create_direccion(
    body: DireccionCreate,
    current_user: Annotated[CurrentUser, Depends(require_roles("CLIENT"))],
) -> DireccionRead:
    """Create a new delivery address for the current user."""
    async with UnitOfWork() as uow:
        direccion = await service.crear_direccion(uow, current_user.id, body)
    return DireccionRead.model_validate(direccion)


@router.put("/{direccion_id}", response_model=DireccionRead)
async def update_direccion(
    direccion_id: int,
    body: DireccionUpdate,
    current_user: Annotated[CurrentUser, Depends(require_roles("CLIENT"))],
) -> DireccionRead:
    """Update a delivery address. Only the owner can update."""
    async with UnitOfWork() as uow:
        direccion = await service.actualizar_direccion(
            uow, direccion_id, current_user.id, body
        )
    return DireccionRead.model_validate(direccion)


@router.delete("/{direccion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_direccion(
    direccion_id: int,
    current_user: Annotated[CurrentUser, Depends(require_roles("CLIENT", "ADMIN"))],
) -> Response:
    """Soft-delete a delivery address. ADMIN can delete any; CLIENT only their own."""
    es_admin = "ADMIN" in current_user.roles
    async with UnitOfWork() as uow:
        await service.eliminar_direccion(
            uow, direccion_id, current_user.id, es_admin=es_admin
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{direccion_id}/predeterminada", response_model=DireccionRead)
async def set_predeterminada(
    direccion_id: int,
    current_user: Annotated[CurrentUser, Depends(require_roles("CLIENT"))],
) -> DireccionRead:
    """Mark a delivery address as the user's default."""
    async with UnitOfWork() as uow:
        direccion = await service.marcar_como_principal(
            uow, direccion_id, current_user.id
        )
    return DireccionRead.model_validate(direccion)
