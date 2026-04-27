from __future__ import annotations

from fastapi import HTTPException, status

from app.modules.categorias.repository import CategoriaRepository
from app.modules.categorias.schemas import (
    CategoriaCreate,
    CategoriaRead,
    CategoriaTree,
    CategoriaUpdate,
)


async def get_tree(uow) -> list[CategoriaTree]:
    """Return full category tree as nested CategoriaTree objects."""
    repo = CategoriaRepository(uow.session)
    all_cats = await repo.get_all_flat()

    # Build id -> CategoriaTree map
    nodes: dict[int, CategoriaTree] = {}
    for cat in all_cats:
        nodes[cat.id] = CategoriaTree(
            id=cat.id,
            nombre=cat.nombre,
            padre_id=cat.padre_id,
            creado_en=cat.creado_en,
            hijos=[],
        )

    # Attach children to parents
    roots: list[CategoriaTree] = []
    for node in nodes.values():
        if node.padre_id is None:
            roots.append(node)
        elif node.padre_id in nodes:
            nodes[node.padre_id].hijos.append(node)

    return roots


async def get_by_id(uow, categoria_id: int) -> CategoriaTree:
    """Return a category with its direct children. Raises 404 if not found."""
    repo = CategoriaRepository(uow.session)
    cat = await repo.get_by_id(categoria_id)
    if cat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada",
            headers={"X-Error-Code": "CATEGORIA_NOT_FOUND"},
        )

    children = await repo.get_direct_children(padre_id=cat.id)
    hijos = [
        CategoriaTree(
            id=c.id,
            nombre=c.nombre,
            padre_id=c.padre_id,
            creado_en=c.creado_en,
            hijos=[],
        )
        for c in children
    ]

    return CategoriaTree(
        id=cat.id,
        nombre=cat.nombre,
        padre_id=cat.padre_id,
        creado_en=cat.creado_en,
        hijos=hijos,
    )


async def create(uow, data: CategoriaCreate) -> CategoriaRead:
    """Create a new category with validations."""
    repo = CategoriaRepository(uow.session)

    # Validate parent exists
    if data.padre_id is not None:
        padre = await repo.get_by_id(data.padre_id)
        if padre is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoría padre no encontrada",
                headers={"X-Error-Code": "CATEGORIA_PADRE_NOT_FOUND"},
            )

    # Validate unique name at this level
    existing = await repo.get_by_nombre_and_parent(data.nombre, data.padre_id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una categoría con ese nombre en este nivel",
            headers={"X-Error-Code": "CATEGORIA_NOMBRE_DUPLICADO"},
        )

    cat = await repo.create(data)
    return CategoriaRead.model_validate(cat)


async def update(uow, categoria_id: int, data: CategoriaUpdate) -> CategoriaRead:
    """Update a category with validations."""
    repo = CategoriaRepository(uow.session)

    cat = await repo.get_by_id(categoria_id)
    if cat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada",
            headers={"X-Error-Code": "CATEGORIA_NOT_FOUND"},
        )

    # Determine target padre_id (may or may not change)
    new_padre_id = data.padre_id if "padre_id" in data.model_fields_set else cat.padre_id

    # Validate parent change if padre_id is being updated
    if "padre_id" in data.model_fields_set and data.padre_id != cat.padre_id:
        if data.padre_id is not None:
            # Check new parent exists
            padre = await repo.get_by_id(data.padre_id)
            if padre is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Categoría padre no encontrada",
                    headers={"X-Error-Code": "CATEGORIA_PADRE_NOT_FOUND"},
                )
            # No self-reference
            if data.padre_id == categoria_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Una categoría no puede ser su propio padre",
                    headers={"X-Error-Code": "CATEGORIA_CICLO_DETECTADO"},
                )
            # No cycle: new parent must not be a descendant
            ancestors = await repo.get_ancestors(data.padre_id)
            if categoria_id in ancestors:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Asignar este padre generaría un ciclo en la jerarquía",
                    headers={"X-Error-Code": "CATEGORIA_CICLO_DETECTADO"},
                )

    # Validate unique name at target level
    target_nombre = data.nombre if data.nombre is not None else cat.nombre
    if data.nombre is not None or "padre_id" in data.model_fields_set:
        existing = await repo.get_by_nombre_and_parent(
            target_nombre, new_padre_id, exclude_id=categoria_id
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una categoría con ese nombre en este nivel",
                headers={"X-Error-Code": "CATEGORIA_NOMBRE_DUPLICADO"},
            )

    updated = await repo.update(cat, data)
    return CategoriaRead.model_validate(updated)


async def delete(uow, categoria_id: int) -> None:
    """Soft delete a category with validations."""
    repo = CategoriaRepository(uow.session)

    cat = await repo.get_by_id(categoria_id)
    if cat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada",
            headers={"X-Error-Code": "CATEGORIA_NOT_FOUND"},
        )

    # Validate no active children
    has_children = await repo.has_active_children(categoria_id)
    if has_children:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La categoría tiene subcategorías activas y no puede eliminarse",
            headers={"X-Error-Code": "CATEGORIA_TIENE_HIJOS"},
        )

    has_products = await repo.has_active_products(categoria_id)
    if has_products:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La categoría tiene productos activos y no puede eliminarse",
            headers={"X-Error-Code": "CATEGORIA_TIENE_PRODUCTOS"},
        )

    await repo.soft_delete(cat)
