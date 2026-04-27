from __future__ import annotations

import math

from fastapi import HTTPException, status

from app.modules.ingredientes.schemas import (
    IngredienteCreate,
    IngredienteRead,
    IngredienteUpdate,
)


async def crear(uow, data: IngredienteCreate) -> IngredienteRead:
    """Create a new ingrediente. Raises 409 if nombre already exists."""
    existing = await uow.ingredientes.get_by_nombre(data.nombre)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un ingrediente con ese nombre",
            headers={"X-Error-Code": "INGREDIENTE_DUPLICADO"},
        )

    from app.modules.ingredientes.model import Ingrediente

    ing = Ingrediente(
        nombre=data.nombre,
        descripcion=data.descripcion,
        es_alergeno=data.es_alergeno,
    )
    ing = await uow.ingredientes.create(ing)
    return IngredienteRead.model_validate(ing)


async def listar(
    uow,
    es_alergeno: bool | None = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    """Return paginated list of ingredientes."""
    items, total = await uow.ingredientes.list_paginated(
        es_alergeno=es_alergeno, page=page, size=size
    )
    pages = math.ceil(total / size) if size > 0 else 0
    return {
        "items": [IngredienteRead.model_validate(i) for i in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


async def obtener_por_id(uow, ingrediente_id: int) -> IngredienteRead:
    """Return a single ingrediente. Raises 404 if not found."""
    ing = await uow.ingredientes.get_by_id(ingrediente_id)
    if ing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingrediente no encontrado",
            headers={"X-Error-Code": "INGREDIENTE_NOT_FOUND"},
        )
    return IngredienteRead.model_validate(ing)


async def actualizar(uow, ingrediente_id: int, data: IngredienteUpdate) -> IngredienteRead:
    """Update an ingrediente. Raises 404 if not found, 409 if nombre conflict."""
    ing = await uow.ingredientes.get_by_id(ingrediente_id)
    if ing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingrediente no encontrado",
            headers={"X-Error-Code": "INGREDIENTE_NOT_FOUND"},
        )

    if data.nombre is not None:
        existing = await uow.ingredientes.get_by_nombre(data.nombre, exclude_id=ingrediente_id)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un ingrediente con ese nombre",
                headers={"X-Error-Code": "INGREDIENTE_DUPLICADO"},
            )
        ing.nombre = data.nombre

    if "descripcion" in data.model_fields_set:
        ing.descripcion = data.descripcion

    if data.es_alergeno is not None:
        ing.es_alergeno = data.es_alergeno

    ing = await uow.ingredientes.update(ing)
    return IngredienteRead.model_validate(ing)


async def eliminar(uow, ingrediente_id: int) -> None:
    """Soft delete an ingrediente. Raises 404 if not found."""
    ing = await uow.ingredientes.get_by_id(ingrediente_id)
    if ing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingrediente no encontrado",
            headers={"X-Error-Code": "INGREDIENTE_NOT_FOUND"},
        )
    await uow.ingredientes.soft_delete(ing)
