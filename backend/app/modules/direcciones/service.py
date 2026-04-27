from __future__ import annotations

from typing import Sequence

from fastapi import HTTPException, status

from app.modules.direcciones.model import DireccionEntrega
from app.modules.direcciones.schemas import DireccionCreate, DireccionUpdate


async def crear_direccion(
    uow,
    usuario_id: int,
    data: DireccionCreate,
) -> DireccionEntrega:
    """Create a delivery address for the user.

    If it's the user's first active address, mark it as principal automatically.
    """
    count = await uow.direcciones.count_for_usuario(usuario_id)
    es_primera = count == 0

    direccion = DireccionEntrega(
        usuario_id=usuario_id,
        linea1=data.linea1,
        linea2=data.linea2,
        ciudad=data.ciudad,
        codigo_postal=data.codigo_postal,
        referencia=data.referencia,
        alias=data.alias,
        es_principal=es_primera,
    )
    return await uow.direcciones.create(direccion)


async def listar_direcciones(
    uow,
    usuario_id: int,
) -> Sequence[DireccionEntrega]:
    """Return all active addresses for the user."""
    return await uow.direcciones.list_by_usuario(usuario_id)


async def actualizar_direccion(
    uow,
    direccion_id: int,
    usuario_id: int,
    data: DireccionUpdate,
) -> DireccionEntrega:
    """Update a delivery address, validating ownership.

    Raises:
        404 if the address does not exist or is soft-deleted.
        403 if the address does not belong to the user.
    """
    direccion = await uow.direcciones.get_by_id(direccion_id)
    if direccion is None or direccion.eliminado_en is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dirección no encontrada",
            headers={"X-Error-Code": "DIRECCION_NO_ENCONTRADA"},
        )
    if direccion.usuario_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar esta dirección",
            headers={"X-Error-Code": "FORBIDDEN"},
        )

    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(direccion, field, value)

    return await uow.direcciones.update(direccion)


async def eliminar_direccion(
    uow,
    direccion_id: int,
    usuario_id: int,
    es_admin: bool = False,
) -> None:
    """Soft-delete a delivery address after validating ownership and active orders.

    Raises:
        404 if the address does not exist or is soft-deleted.
        403 if the user is not the owner and not an admin.
        409 if the address has active (non-terminal) pedidos linked to it.
    """
    direccion = await uow.direcciones.get_by_id(direccion_id)
    if direccion is None or direccion.eliminado_en is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dirección no encontrada",
            headers={"X-Error-Code": "DIRECCION_NO_ENCONTRADA"},
        )
    if not es_admin and direccion.usuario_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para eliminar esta dirección",
            headers={"X-Error-Code": "FORBIDDEN"},
        )

    activos = await uow.pedidos.count_activos_por_direccion(direccion_id)
    if activos > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La dirección tiene pedidos activos y no puede eliminarse",
            headers={"X-Error-Code": "DIRECCION_CON_PEDIDOS_ACTIVOS"},
        )

    era_principal = direccion.es_principal
    await uow.direcciones.soft_delete(direccion)

    if era_principal:
        restantes = await uow.direcciones.list_by_usuario(usuario_id)
        if restantes:
            restantes[0].es_principal = True
            await uow.direcciones.update(restantes[0])


async def marcar_como_principal(
    uow,
    direccion_id: int,
    usuario_id: int,
) -> DireccionEntrega:
    """Set a delivery address as the user's principal.

    Validates ownership, then atomically:
    1. Clears the principal flag from all user addresses.
    2. Sets es_principal = True on the target address.

    Raises:
        404 if the address does not exist.
        403 if the address does not belong to the user.
    """
    direccion = await uow.direcciones.get_by_id_and_usuario(direccion_id, usuario_id)
    if direccion is None:
        # Determine whether it's a 404 or 403
        raw = await uow.direcciones.get_by_id(direccion_id)
        if raw is None or raw.eliminado_en is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dirección no encontrada",
                headers={"X-Error-Code": "DIRECCION_NO_ENCONTRADA"},
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar esta dirección",
            headers={"X-Error-Code": "FORBIDDEN"},
        )

    await uow.direcciones.clear_principal(usuario_id)
    direccion.es_principal = True
    return await uow.direcciones.update(direccion)
