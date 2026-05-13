from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status

from app.modules.admin.schemas import (
    DireccionAdminRead,
    PaginatedDireccionesAdmin,
    PaginatedUsuariosAdmin,
    PedidosPorEstado,
    ResumenMetricas,
    TopProducto,
    UsuarioAdminRead,
    VentasPorPeriodo,
)


def _default_dates(
    desde: Optional[datetime], hasta: Optional[datetime]
) -> tuple[datetime, datetime]:
    """Return desde/hasta with defaults: last 30 days.
    hasta is extended to end-of-day so date-only params (T00:00:00) include the full day.
    """
    now = datetime.utcnow()
    effective_hasta = hasta if hasta is not None else now
    effective_hasta = effective_hasta.replace(hour=23, minute=59, second=59, microsecond=999999)
    return (
        desde if desde is not None else now - timedelta(days=30),
        effective_hasta,
    )


# ---------------------------------------------------------------------------
# User management service
# ---------------------------------------------------------------------------

class AdminUsuarioService:
    """Business logic for admin user management."""

    async def listar_usuarios(
        self,
        uow: object,
        q: Optional[str],
        rol: Optional[str],
        page: int,
        size: int,
    ) -> PaginatedUsuariosAdmin:
        repo = uow.admin  # type: ignore[attr-defined]
        items, total = await repo.listar_usuarios(q=q, rol=rol, page=page, size=size)

        usuario_reads = []
        for u in items:
            roles = [ur.rol.codigo for ur in u.usuario_roles if ur.rol is not None]
            usuario_reads.append(
                UsuarioAdminRead(
                    id=u.id,
                    nombre=u.nombre,
                    apellido=u.apellido,
                    email=u.email,
                    activo=u.activo,
                    created_at=u.creado_en,
                    roles=roles,
                    deleted_at=u.eliminado_en,
                )
            )

        pages = math.ceil(total / size) if size > 0 else 0
        return PaginatedUsuariosAdmin(
            items=usuario_reads,
            total=total,
            page=page,
            size=size,
            pages=pages,
        )

    async def actualizar_roles(
        self,
        uow: object,
        usuario_id: int,
        roles: list[str],
        admin_actual_id: int,
    ) -> UsuarioAdminRead:
        repo = uow.admin  # type: ignore[attr-defined]

        usuario = await repo.get_usuario_by_id(usuario_id)
        if usuario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        # Check if we're removing ADMIN role from this user
        current_roles = [ur.rol.codigo for ur in usuario.usuario_roles if ur.rol]
        removing_admin = "ADMIN" in current_roles and "ADMIN" not in roles

        if removing_admin:
            admin_count = await repo.contar_admins()
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="No se puede quitar el rol ADMIN al último administrador del sistema",
                    headers={"X-Error-Code": "LAST_ADMIN"},
                )

        # Validate all role codes exist
        rol_objs = await repo.get_roles_by_codigos(roles)
        if len(rol_objs) != len(roles):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uno o más roles son inválidos",
            )

        # Replace roles and revoke tokens
        await repo.reemplazar_roles(usuario_id, [r.id for r in rol_objs])
        await repo.revocar_tokens_usuario(usuario_id)

        # Expire cached identity map so selectinload fetches fresh data
        uow.session.expire_all()  # type: ignore[attr-defined]

        # Reload
        usuario = await repo.get_usuario_by_id(usuario_id)
        new_roles = [ur.rol.codigo for ur in usuario.usuario_roles if ur.rol]  # type: ignore[union-attr]
        return UsuarioAdminRead(
            id=usuario.id,  # type: ignore[union-attr]
            nombre=usuario.nombre,  # type: ignore[union-attr]
            apellido=usuario.apellido,  # type: ignore[union-attr]
            email=usuario.email,  # type: ignore[union-attr]
            activo=usuario.activo,  # type: ignore[union-attr]
            created_at=usuario.creado_en,  # type: ignore[union-attr]
            roles=new_roles,
            deleted_at=usuario.eliminado_en,  # type: ignore[union-attr]
        )

    async def actualizar_estado(
        self,
        uow: object,
        usuario_id: int,
        activo: bool,
        admin_actual_id: int,
    ) -> UsuarioAdminRead:
        repo = uow.admin  # type: ignore[attr-defined]

        usuario = await repo.get_usuario_by_id(usuario_id)
        if usuario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        # Prevent self-deactivation
        if not activo and usuario_id == admin_actual_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No puedes desactivar tu propia cuenta",
                headers={"X-Error-Code": "SELF_DEACTIVATION"},
            )

        usuario.activo = activo
        uow.session.add(usuario)  # type: ignore[attr-defined]
        await uow.session.flush()  # type: ignore[attr-defined]

        # Revoke tokens if deactivating
        if not activo:
            await repo.revocar_tokens_usuario(usuario_id)

        roles = [ur.rol.codigo for ur in usuario.usuario_roles if ur.rol]
        return UsuarioAdminRead(
            id=usuario.id,
            nombre=usuario.nombre,
            apellido=usuario.apellido,
            email=usuario.email,
            activo=usuario.activo,
            created_at=usuario.creado_en,
            roles=roles,
            deleted_at=usuario.eliminado_en,
        )


# ---------------------------------------------------------------------------
# Direcciones admin service
# ---------------------------------------------------------------------------

class AdminDireccionesService:
    """Business logic for admin direcciones listing."""

    async def listar_direcciones(
        self,
        uow: object,
        usuario_email: Optional[str],
        page: int,
        size: int,
    ) -> PaginatedDireccionesAdmin:
        repo = uow.admin  # type: ignore[attr-defined]
        items_data, total = await repo.listar_direcciones_admin(
            usuario_email=usuario_email, page=page, size=size
        )

        pages = math.ceil(total / size) if size > 0 else 0
        items = [DireccionAdminRead(**d) for d in items_data]

        return PaginatedDireccionesAdmin(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages,
        )


# ---------------------------------------------------------------------------
# Metrics service
# ---------------------------------------------------------------------------

class AdminMetricasService:
    """Business logic for admin metrics."""

    async def get_resumen(
        self,
        uow: object,
        desde: Optional[datetime],
        hasta: Optional[datetime],
    ) -> ResumenMetricas:
        repo = uow.admin_metricas  # type: ignore[attr-defined]
        desde, hasta = _default_dates(desde, hasta)
        data = await repo.resumen(desde, hasta)
        return ResumenMetricas(**data)

    async def get_ventas(
        self,
        uow: object,
        desde: Optional[datetime],
        hasta: Optional[datetime],
        granularidad: str,
    ) -> list[VentasPorPeriodo]:
        repo = uow.admin_metricas  # type: ignore[attr-defined]
        desde, hasta = _default_dates(desde, hasta)
        rows = await repo.ventas_por_periodo(desde, hasta, granularidad)
        return [VentasPorPeriodo(**row) for row in rows]

    async def get_top_productos(
        self,
        uow: object,
        top: int,
        desde: Optional[datetime],
        hasta: Optional[datetime],
    ) -> list[TopProducto]:
        repo = uow.admin_metricas  # type: ignore[attr-defined]
        desde, hasta = _default_dates(desde, hasta)
        rows = await repo.top_productos(top, desde, hasta)
        return [TopProducto(**row) for row in rows]

    async def get_pedidos_por_estado(
        self,
        uow: object,
        desde: Optional[datetime],
        hasta: Optional[datetime],
    ) -> list[PedidosPorEstado]:
        repo = uow.admin_metricas  # type: ignore[attr-defined]
        desde, hasta = _default_dates(desde, hasta)
        rows = await repo.pedidos_por_estado(desde, hasta)
        return [PedidosPorEstado(**row) for row in rows]
