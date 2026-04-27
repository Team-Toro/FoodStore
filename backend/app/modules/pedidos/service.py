from __future__ import annotations

import math
from typing import Optional

from fastapi import HTTPException, status

from app.modules.pedidos.model import DetallePedido, HistorialEstadoPedido, Pedido
from app.modules.pedidos.schemas import (
    CambiarEstadoRequest,
    CrearPedidoRequest,
    DetallePedidoRead,
    HistorialRead,
    PedidoDetail,
    PedidoRead,
)

# ---------------------------------------------------------------------------
# FSM — D-01
# ---------------------------------------------------------------------------

TRANSICIONES_PERMITIDAS: dict[str, list[str]] = {
    "PENDIENTE":  ["CONFIRMADO", "CANCELADO"],
    "CONFIRMADO": ["EN_PREP", "CANCELADO"],
    "EN_PREP":    ["EN_CAMINO", "CANCELADO"],
    "EN_CAMINO":  ["ENTREGADO"],
    "ENTREGADO":  [],
    "CANCELADO":  [],
}

ROLES_POR_TRANSICION: dict[tuple[str, str], list[str]] = {
    # SISTEMA is used by the MercadoPago webhook (us-006).
    # ADMIN is also allowed here for manual confirmation and testing.
    ("PENDIENTE",  "CONFIRMADO"): ["SISTEMA", "ADMIN"],
    ("PENDIENTE",  "CANCELADO"):  ["CLIENT", "PEDIDOS", "ADMIN"],
    ("CONFIRMADO", "EN_PREP"):    ["PEDIDOS", "ADMIN"],
    ("CONFIRMADO", "CANCELADO"):  ["PEDIDOS", "ADMIN"],
    ("EN_PREP",    "EN_CAMINO"):  ["PEDIDOS", "ADMIN"],
    ("EN_PREP",    "CANCELADO"):  ["ADMIN"],
    ("EN_CAMINO",  "ENTREGADO"):  ["PEDIDOS", "ADMIN"],
}

ESTADOS_TERMINALES = {"ENTREGADO", "CANCELADO"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check_ownership(pedido: Pedido, usuario_id: int, rol: str) -> None:
    """Raise 403 if a CLIENT tries to access a pedido that isn't theirs."""
    if rol == "CLIENT" and pedido.usuario_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para acceder a este pedido",
            headers={"X-Error-Code": "FORBIDDEN"},
        )


def _to_pedido_read(pedido: Pedido) -> PedidoRead:
    return PedidoRead.model_validate(pedido)


# ---------------------------------------------------------------------------
# Use-cases
# ---------------------------------------------------------------------------

async def crear_pedido(uow, body: CrearPedidoRequest, usuario_id: int) -> PedidoRead:
    """Create a new order from a list of items.

    - Validates stock with get_for_update (SELECT FOR UPDATE on postgres)
    - Builds snapshot of name/price per item
    - Creates Pedido + DetallePedido[] + HistorialEstadoPedido (estado_desde=None)
    """
    if not body.items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El pedido debe tener al menos un ítem",
            headers={"X-Error-Code": "PEDIDO_SIN_ITEMS"},
        )

    total = 0.0
    detalles_data = []

    for item in body.items:
        producto = await uow.productos.get_for_update(item.producto_id)
        if producto is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto {item.producto_id} no encontrado",
                headers={"X-Error-Code": "PRODUCTO_NO_ENCONTRADO"},
            )
        if producto.stock_cantidad < item.cantidad:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Stock insuficiente para '{producto.nombre}'. "
                    f"Disponible: {producto.stock_cantidad}, solicitado: {item.cantidad}"
                ),
                headers={"X-Error-Code": "STOCK_INSUFICIENTE"},
            )
        subtotal = float(producto.precio_base) * item.cantidad
        total += subtotal
        detalles_data.append(
            {
                "producto": producto,
                "cantidad": item.cantidad,
                "subtotal": subtotal,
                "personalizacion": item.personalizacion,
            }
        )

    total += float(body.costo_envio)

    # Validate direccion ownership and capture snapshot
    direccion_snapshot_linea1 = None
    direccion_snapshot_ciudad = None
    direccion_snapshot_alias = None
    if body.direccion_id is not None:
        direccion = await uow.direcciones.get_by_id_and_usuario(
            body.direccion_id, usuario_id
        )
        if direccion is None:
            # Distinguish 404 from 403 using the base get_by_id from repo
            raw = await uow.direcciones.get_by_id(body.direccion_id)
            if raw is None or raw.eliminado_en is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Dirección {body.direccion_id} no encontrada",
                    headers={"X-Error-Code": "DIRECCION_NO_ENCONTRADA"},
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para usar esta dirección",
                headers={"X-Error-Code": "FORBIDDEN"},
            )
        direccion_snapshot_linea1 = direccion.linea1
        direccion_snapshot_ciudad = direccion.ciudad
        direccion_snapshot_alias = direccion.alias

    pedido = Pedido(
        usuario_id=usuario_id,
        estado_codigo="PENDIENTE",
        forma_pago_codigo=body.forma_pago_codigo,
        direccion_id=body.direccion_id,
        total=total,
        costo_envio=float(body.costo_envio),
        direccion_snapshot_linea1=direccion_snapshot_linea1,
        direccion_snapshot_ciudad=direccion_snapshot_ciudad,
        direccion_snapshot_alias=direccion_snapshot_alias,
    )
    pedido = await uow.pedidos.create(pedido)

    detalles = []
    for d in detalles_data:
        detalle = DetallePedido(
            pedido_id=pedido.id,
            producto_id=d["producto"].id,
            nombre_snapshot=d["producto"].nombre,
            precio_snapshot=float(d["producto"].precio_base),
            cantidad=d["cantidad"],
            subtotal=d["subtotal"],
            personalizacion=d["personalizacion"],
        )
        detalles.append(detalle)

    await uow.detalles_pedido.create_bulk(detalles)

    historial = HistorialEstadoPedido(
        pedido_id=pedido.id,
        estado_desde=None,
        estado_hasta="PENDIENTE",
        usuario_id=usuario_id,
        observacion=None,
    )
    await uow.historial_pedido.append(historial)

    return _to_pedido_read(pedido)


async def listar_pedidos(
    uow,
    usuario_id: int,
    rol: str,
    estado: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    """List pedidos — CLIENTs see only their own; PEDIDOS/ADMIN see all."""
    filtrar_por_usuario = usuario_id if rol == "CLIENT" else None
    items, total = await uow.pedidos.list_paginated(
        usuario_id=filtrar_por_usuario,
        estado=estado,
        page=page,
        size=size,
    )
    pages = math.ceil(total / size) if size > 0 else 0
    return {
        "items": [_to_pedido_read(p) for p in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


async def obtener_pedido(uow, pedido_id: int, usuario_id: int, rol: str) -> PedidoDetail:
    """Return full pedido detail with items and history.

    CLIENTs may only access their own orders.
    """
    pedido = await uow.pedidos.get_by_id(pedido_id)
    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado",
            headers={"X-Error-Code": "PEDIDO_NO_ENCONTRADO"},
        )

    _check_ownership(pedido, usuario_id, rol)

    detalles = await uow.detalles_pedido.get_by_pedido_id(pedido_id)
    historial = await uow.historial_pedido.get_by_pedido_id(pedido_id)

    return PedidoDetail(
        **_to_pedido_read(pedido).model_dump(),
        items=[DetallePedidoRead.model_validate(d) for d in detalles],
        historial=[HistorialRead.model_validate(h) for h in historial],
    )


async def cambiar_estado(
    uow,
    pedido_id: int,
    body: CambiarEstadoRequest,
    usuario_id: int,
    rol: str,
) -> PedidoRead:
    """Advance pedido state according to the FSM.

    Validates:
    - Pedido exists
    - Ownership (CLIENT)
    - FSM transition is valid
    - Role is allowed for this transition
    - motivo is required when cancelling
    Then applies stock effects (decrement on CONFIRMADO, restore on CANCELADO from CONFIRMADO).
    """
    pedido = await uow.pedidos.get_by_id(pedido_id)
    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado",
            headers={"X-Error-Code": "PEDIDO_NO_ENCONTRADO"},
        )

    estado_actual = pedido.estado_codigo
    nuevo_estado = body.nuevo_estado

    # Terminal state check
    if estado_actual in ESTADOS_TERMINALES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El pedido está en estado terminal '{estado_actual}' y no puede avanzar",
            headers={"X-Error-Code": "ESTADO_TERMINAL"},
        )

    # FSM transition check
    allowed_next = TRANSICIONES_PERMITIDAS.get(estado_actual, [])
    if nuevo_estado not in allowed_next:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Transición de '{estado_actual}' a '{nuevo_estado}' no permitida",
            headers={"X-Error-Code": "TRANSICION_NO_PERMITIDA"},
        )

    # Role check — CLIENT ownership is checked here too for CANCELADO
    key = (estado_actual, nuevo_estado)
    allowed_roles = ROLES_POR_TRANSICION.get(key, [])

    if rol == "CLIENT":
        # CLIENT can only cancel their own orders
        if nuevo_estado == "CANCELADO":
            if pedido.usuario_id != usuario_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tiene permisos para cancelar este pedido",
                    headers={"X-Error-Code": "ROL_INSUFICIENTE"},
                )
            if "CLIENT" not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tiene permisos para realizar esta transición de estado",
                    headers={"X-Error-Code": "ROL_INSUFICIENTE"},
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta transición de estado",
                headers={"X-Error-Code": "ROL_INSUFICIENTE"},
            )
    else:
        # Non-CLIENT roles
        if rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta transición de estado",
                headers={"X-Error-Code": "ROL_INSUFICIENTE"},
            )

    # motivo required for CANCELADO (RN-05)
    if nuevo_estado == "CANCELADO" and not body.motivo:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El motivo es requerido para cancelar un pedido",
            headers={"X-Error-Code": "MOTIVO_REQUERIDO"},
        )

    # Stock effects
    if nuevo_estado == "CONFIRMADO":
        # Decrement stock for each line item
        detalles = await uow.detalles_pedido.get_by_pedido_id(pedido_id)
        for detalle in detalles:
            if detalle.producto_id is not None:
                ok = await uow.productos.update_stock_atomico(
                    detalle.producto_id, -detalle.cantidad
                )
                if not ok:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Stock insuficiente al confirmar el pedido",
                        headers={"X-Error-Code": "STOCK_INSUFICIENTE"},
                    )

    elif nuevo_estado == "CANCELADO" and estado_actual == "CONFIRMADO":
        # Restore stock
        detalles = await uow.detalles_pedido.get_by_pedido_id(pedido_id)
        for detalle in detalles:
            if detalle.producto_id is not None:
                await uow.productos.update_stock_atomico(
                    detalle.producto_id, detalle.cantidad
                )

    # Persist state change
    pedido.estado_codigo = nuevo_estado
    pedido = await uow.pedidos.update(pedido)

    # Append to historial
    historial = HistorialEstadoPedido(
        pedido_id=pedido.id,
        estado_desde=estado_actual,
        estado_hasta=nuevo_estado,
        usuario_id=usuario_id,
        observacion=body.motivo,
    )
    await uow.historial_pedido.append(historial)

    return _to_pedido_read(pedido)


async def obtener_historial(
    uow,
    pedido_id: int,
    usuario_id: int,
    rol: str,
) -> list[HistorialRead]:
    """Return the append-only history for a pedido ordered by creado_en ASC."""
    pedido = await uow.pedidos.get_by_id(pedido_id)
    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado",
            headers={"X-Error-Code": "PEDIDO_NO_ENCONTRADO"},
        )

    _check_ownership(pedido, usuario_id, rol)

    registros = await uow.historial_pedido.get_by_pedido_id(pedido_id)
    return [HistorialRead.model_validate(r) for r in registros]
