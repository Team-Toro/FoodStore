from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.usuarios.model import Usuario, UsuarioRol


class AdminRepository:
    """Repository for admin user management operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar_usuarios(
        self,
        q: Optional[str],
        rol: Optional[str],
        page: int,
        size: int,
    ) -> tuple[List[Usuario], int]:
        """Paginated user listing with optional search and role filter.

        Returns (items, total_count).
        """
        stmt = (
            select(Usuario)
            .options(selectinload(Usuario.usuario_roles).selectinload(UsuarioRol.rol))
            .order_by(Usuario.id)
        )

        if q:
            pattern = f"%{q}%"
            stmt = stmt.where(
                (Usuario.nombre.ilike(pattern))
                | (Usuario.apellido.ilike(pattern))
                | (Usuario.email.ilike(pattern))
            )

        if rol:
            # Filter by role code — join through usuario_rol and rol
            from sqlalchemy import exists
            from app.modules.usuarios.model import Rol

            subq = (
                select(UsuarioRol.usuario_id)
                .join(Rol, Rol.id == UsuarioRol.rol_id)
                .where(Rol.codigo == rol)
                .scalar_subquery()
            )
            stmt = stmt.where(Usuario.id.in_(subq))

        count_stmt = select(text("COUNT(*)")).select_from(stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        stmt = stmt.offset((page - 1) * size).limit(size)
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        return items, int(total)

    async def get_usuario_by_id(self, usuario_id: int) -> Optional[Usuario]:
        """Return user with roles loaded, or None."""
        stmt = (
            select(Usuario)
            .where(Usuario.id == usuario_id)
            .options(selectinload(Usuario.usuario_roles).selectinload(UsuarioRol.rol))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def contar_admins(self) -> int:
        """Return count of users with ADMIN role (SELECT FOR UPDATE for race safety)."""
        from app.modules.usuarios.model import Rol

        stmt = (
            select(text("COUNT(ur.usuario_id)"))
            .select_from(UsuarioRol.__table__.alias("ur"))
            .join(Rol.__table__.alias("r"), text("r.id = ur.rol_id"))
            .where(text("r.codigo = 'ADMIN'"))
            .with_for_update()
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def revocar_tokens_usuario(self, usuario_id: int) -> None:
        """Revoke all active refresh tokens for a user."""
        from app.modules.refreshtokens.model import RefreshToken

        now = datetime.utcnow()
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.usuario_id == usuario_id)
            .where(RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def get_roles_by_codigos(self, codigos: List[str]) -> List[Any]:
        """Return Rol instances for the given codes."""
        from app.modules.usuarios.model import Rol

        stmt = select(Rol).where(Rol.codigo.in_(codigos))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def reemplazar_roles(self, usuario_id: int, nuevos_rol_ids: List[int]) -> None:
        """Replace all roles for a user (delete + insert)."""
        from sqlalchemy import delete

        await self.session.execute(
            delete(UsuarioRol).where(UsuarioRol.usuario_id == usuario_id)
        )
        await self.session.flush()

        for rol_id in nuevos_rol_ids:
            ur = UsuarioRol(usuario_id=usuario_id, rol_id=rol_id)
            self.session.add(ur)
        await self.session.flush()


class AdminMetricasRepository:
    """Repository for admin metrics queries using raw SQL."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def resumen(
        self, desde: datetime, hasta: datetime
    ) -> Dict[str, Any]:
        """Return KPI summary (totales, usuarios, productos)."""
        ventas_stmt = text("""
            SELECT
                COALESCE(SUM(ped.total), 0) AS ventas_totales,
                COUNT(ped.id) AS pedidos_totales
            FROM pedido ped
            WHERE ped.creado_en BETWEEN :desde AND :hasta
              AND ped.eliminado_en IS NULL
              AND ped.estado_codigo != 'CANCELADO'
        """)
        ventas_result = await self.session.execute(
            ventas_stmt, {"desde": desde, "hasta": hasta}
        )
        row = ventas_result.mappings().one()

        usuarios_stmt = text("""
            SELECT COUNT(*) AS usuarios_activos
            FROM usuario
            WHERE activo = true AND eliminado_en IS NULL
        """)
        u_result = await self.session.execute(usuarios_stmt)
        usuarios_activos = int(u_result.scalar_one())

        productos_stmt = text("""
            SELECT COUNT(*) AS productos_activos
            FROM producto
            WHERE disponible = true AND eliminado_en IS NULL
        """)
        p_result = await self.session.execute(productos_stmt)
        productos_activos = int(p_result.scalar_one())

        return {
            "ventas_totales": float(row["ventas_totales"] or 0),
            "pedidos_totales": int(row["pedidos_totales"] or 0),
            "usuarios_activos": usuarios_activos,
            "productos_activos": productos_activos,
        }

    async def ventas_por_periodo(
        self, desde: datetime, hasta: datetime, granularidad: str
    ) -> List[Dict[str, Any]]:
        """Return aggregated sales by time period."""
        valid_granularidades = {"day", "week", "month"}
        if granularidad not in valid_granularidades:
            granularidad = "day"

        stmt = text(f"""
            SELECT
                TO_CHAR(DATE_TRUNC(:gran, ped.creado_en), 'YYYY-MM-DD') AS periodo,
                COALESCE(SUM(ped.total), 0) AS total,
                COUNT(ped.id) AS cantidad
            FROM pedido ped
            WHERE ped.creado_en BETWEEN :desde AND :hasta
              AND ped.eliminado_en IS NULL
              AND ped.estado_codigo != 'CANCELADO'
            GROUP BY DATE_TRUNC(:gran, ped.creado_en)
            ORDER BY DATE_TRUNC(:gran, ped.creado_en)
        """)
        result = await self.session.execute(
            stmt, {"gran": granularidad, "desde": desde, "hasta": hasta}
        )
        rows = result.mappings().all()
        return [
            {
                "periodo": row["periodo"],
                "total": float(row["total"] or 0),
                "cantidad": int(row["cantidad"] or 0),
            }
            for row in rows
        ]

    async def top_productos(
        self, top: int, desde: datetime, hasta: datetime
    ) -> List[Dict[str, Any]]:
        """Return top N products by quantity sold."""
        stmt = text("""
            SELECT
                dp.producto_id,
                dp.nombre_snapshot AS nombre,
                SUM(dp.cantidad) AS cantidad_vendida,
                SUM(dp.cantidad * dp.precio_snapshot) AS total_vendido
            FROM detalle_pedido dp
            JOIN pedido ped ON ped.id = dp.pedido_id
            WHERE ped.creado_en BETWEEN :desde AND :hasta
              AND ped.eliminado_en IS NULL
            GROUP BY dp.producto_id, dp.nombre_snapshot
            ORDER BY cantidad_vendida DESC
            LIMIT :top
        """)
        result = await self.session.execute(
            stmt, {"top": top, "desde": desde, "hasta": hasta}
        )
        rows = result.mappings().all()
        return [
            {
                "producto_id": row["producto_id"],
                "nombre": row["nombre"],
                "cantidad_vendida": int(row["cantidad_vendida"] or 0),
                "total_vendido": float(row["total_vendido"] or 0),
            }
            for row in rows
        ]

    async def pedidos_por_estado(
        self, desde: datetime, hasta: datetime
    ) -> List[Dict[str, Any]]:
        """Return order count grouped by state."""
        stmt = text("""
            SELECT
                ep.codigo AS estado,
                COUNT(ped.id) AS cantidad
            FROM estado_pedido ep
            LEFT JOIN pedido ped
                ON ped.estado_codigo = ep.codigo
                AND ped.creado_en BETWEEN :desde AND :hasta
                AND ped.eliminado_en IS NULL
            GROUP BY ep.codigo
            ORDER BY ep.codigo
        """)
        result = await self.session.execute(
            stmt, {"desde": desde, "hasta": hasta}
        )
        rows = result.mappings().all()
        return [
            {
                "estado": row["estado"],
                "cantidad": int(row["cantidad"] or 0),
            }
            for row in rows
        ]
