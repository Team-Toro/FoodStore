from __future__ import annotations

import math

from fastapi import HTTPException, status

from app.modules.categorias.schemas import CategoriaRead
from app.modules.ingredientes.schemas import IngredienteRead
from app.modules.productos.schemas import (
    DisponibilidadUpdate,
    IngredienteConRemovible,
    IngredienteRelacion,
    ProductoCategoriasUpdate,
    ProductoCreate,
    ProductoDetail,
    ProductoIngredientesUpdate,
    ProductoRead,
    StockUpdate,
    ProductoUpdate,
)


async def crear_producto(uow, data: ProductoCreate) -> ProductoRead:
    """Create a new producto and return ProductoRead."""
    from app.modules.productos.model import Producto

    producto = Producto(
        nombre=data.nombre,
        descripcion=data.descripcion,
        imagen_url=data.imagen_url,
        precio_base=float(data.precio_base),
        stock_cantidad=data.stock_cantidad,
        disponible=data.disponible,
    )
    producto = await uow.productos.create(producto)
    return ProductoRead.model_validate(producto)


async def listar_productos(
    uow,
    page: int = 1,
    size: int = 20,
    categoria_id: int | None = None,
    nombre: str | None = None,
    disponible: bool | None = None,
    excluir_alergenos: list[int] | None = None,
) -> dict:
    """Return a paginated list of productos."""
    items, total = await uow.productos.list_paginated(
        categoria_id=categoria_id,
        nombre=nombre,
        disponible=disponible,
        excluir_alergenos=excluir_alergenos,
        page=page,
        size=size,
    )
    pages = math.ceil(total / size) if size > 0 else 0
    return {
        "items": [ProductoRead.model_validate(p) for p in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


async def obtener_producto(uow, producto_id: int) -> ProductoDetail:
    """Return producto detail with categorias and ingredientes.

    Raises 404 if not found or deleted.
    """
    producto = await uow.productos.get_by_id(producto_id)
    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
            headers={"X-Error-Code": "PRODUCTO_NOT_FOUND"},
        )

    categorias_rows = await uow.productos.get_categorias(producto_id)
    ingredientes_rows = await uow.productos.get_ingredientes(producto_id)

    categorias = [CategoriaRead.model_validate(c) for c in categorias_rows]
    ingredientes = [
        IngredienteConRemovible(
            **IngredienteRead.model_validate(ing).model_dump(),
            es_removible=pi.es_removible,
        )
        for ing, pi in ingredientes_rows
    ]

    return ProductoDetail(
        **ProductoRead.model_validate(producto).model_dump(),
        categorias=categorias,
        ingredientes=ingredientes,
    )


async def actualizar_producto(uow, producto_id: int, data: ProductoUpdate) -> ProductoRead:
    """Update a producto. Raises 404 if not found."""
    producto = await uow.productos.get_by_id(producto_id)
    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
            headers={"X-Error-Code": "PRODUCTO_NOT_FOUND"},
        )

    if data.nombre is not None:
        producto.nombre = data.nombre
    if "descripcion" in data.model_fields_set:
        producto.descripcion = data.descripcion
    if "imagen_url" in data.model_fields_set:
        producto.imagen_url = data.imagen_url
    if data.precio_base is not None:
        producto.precio_base = float(data.precio_base)
    if data.stock_cantidad is not None:
        producto.stock_cantidad = data.stock_cantidad
    if data.disponible is not None:
        producto.disponible = data.disponible

    producto = await uow.productos.update(producto)
    return ProductoRead.model_validate(producto)


async def cambiar_disponibilidad(uow, producto_id: int, disponible: bool) -> ProductoRead:
    """Update only the disponible field. Raises 404 if not found."""
    producto = await uow.productos.get_by_id(producto_id)
    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
            headers={"X-Error-Code": "PRODUCTO_NOT_FOUND"},
        )
    producto.disponible = disponible
    producto = await uow.productos.update(producto)
    return ProductoRead.model_validate(producto)


async def actualizar_stock(uow, producto_id: int, delta: int) -> ProductoRead:
    """Update stock atomically. Raises 404 if not found, 422 if would go negative."""
    producto = await uow.productos.get_by_id(producto_id)
    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
            headers={"X-Error-Code": "PRODUCTO_NOT_FOUND"},
        )

    success = await uow.productos.update_stock_atomico(producto_id, delta)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Stock insuficiente para realizar la operación",
            headers={"X-Error-Code": "STOCK_INSUFICIENTE"},
        )

    # Reload to get updated stock
    producto = await uow.productos.get_by_id(producto_id)
    return ProductoRead.model_validate(producto)


async def eliminar_producto(uow, producto_id: int) -> None:
    """Soft delete a producto. Raises 404 if not found."""
    producto = await uow.productos.get_by_id(producto_id)
    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
            headers={"X-Error-Code": "PRODUCTO_NOT_FOUND"},
        )
    await uow.productos.soft_delete(producto)


async def sync_categorias_producto(
    uow, producto_id: int, categoria_ids: list[int]
) -> ProductoDetail:
    """Sync product categories. Validates all IDs exist. Raises 422 if any missing."""
    producto = await uow.productos.get_by_id(producto_id)
    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
            headers={"X-Error-Code": "PRODUCTO_NOT_FOUND"},
        )

    for cat_id in categoria_ids:
        cat = await uow.categorias.get_by_id(cat_id)
        if cat is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Categoría {cat_id} no encontrada",
                headers={"X-Error-Code": "CATEGORIA_NOT_FOUND"},
            )

    await uow.productos.sync_categorias(producto_id, categoria_ids)
    return await obtener_producto(uow, producto_id)


async def sync_ingredientes_producto(
    uow, producto_id: int, ingredientes_data: list[IngredienteRelacion]
) -> ProductoDetail:
    """Sync product ingredientes. Validates all IDs exist and not deleted. Raises 422 if any missing."""
    producto = await uow.productos.get_by_id(producto_id)
    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
            headers={"X-Error-Code": "PRODUCTO_NOT_FOUND"},
        )

    for item in ingredientes_data:
        ing = await uow.ingredientes.get_by_id(item.ingrediente_id)
        if ing is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Ingrediente {item.ingrediente_id} no encontrado",
                headers={"X-Error-Code": "INGREDIENTE_NOT_FOUND"},
            )

    data_list = [
        {"ingrediente_id": item.ingrediente_id, "es_removible": item.es_removible}
        for item in ingredientes_data
    ]
    await uow.productos.sync_ingredientes(producto_id, data_list)
    return await obtener_producto(uow, producto_id)
