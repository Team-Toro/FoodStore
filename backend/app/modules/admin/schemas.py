from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# User management schemas
# ---------------------------------------------------------------------------

class UsuarioAdminRead(BaseModel):
    """Admin view of a user — includes activo flag and roles."""

    id: int
    nombre: str
    apellido: str
    email: str
    activo: bool
    created_at: datetime
    roles: List[str]
    deleted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RolesUpdateRequest(BaseModel):
    """Payload for PATCH /admin/usuarios/{id}/roles."""

    roles: List[str]


class EstadoUpdateRequest(BaseModel):
    """Payload for PATCH /admin/usuarios/{id}/estado."""

    activo: bool


class PaginatedUsuariosAdmin(BaseModel):
    """Paginated response for admin user listing."""

    items: List[UsuarioAdminRead]
    total: int
    page: int
    size: int
    pages: int


# ---------------------------------------------------------------------------
# Metrics schemas
# ---------------------------------------------------------------------------

class ResumenMetricas(BaseModel):
    """KPI summary for the admin dashboard."""

    ventas_totales: float
    pedidos_totales: int
    usuarios_activos: int
    productos_activos: int


class VentasPorPeriodo(BaseModel):
    """Single data point for the sales line chart."""

    periodo: str
    total: float
    cantidad: int


class TopProducto(BaseModel):
    """Single row in the top products bar chart."""

    producto_id: int
    nombre: str
    cantidad_vendida: int
    total_vendido: float


class PedidosPorEstado(BaseModel):
    """Single slice in the orders pie chart."""

    estado: str
    cantidad: int


# ---------------------------------------------------------------------------
# Admin Productos schemas
# ---------------------------------------------------------------------------

class ProductoAdminRead(BaseModel):
    """Admin view of a product — includes soft-deleted products."""

    id: int
    nombre: str
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    precio_base: float
    stock_cantidad: int
    disponible: bool
    creado_en: datetime
    eliminado_en: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PaginatedProductosAdmin(BaseModel):
    """Paginated response for admin product listing."""

    items: List[ProductoAdminRead]
    total: int
    page: int
    size: int
    pages: int


# ---------------------------------------------------------------------------
# Admin Direcciones schemas
# ---------------------------------------------------------------------------

class DireccionAdminRead(BaseModel):
    """Admin view of a delivery address — includes owning user info."""

    id: int
    usuario_id: int
    linea1: str
    linea2: Optional[str] = None
    ciudad: str
    codigo_postal: Optional[str] = None
    referencia: Optional[str] = None
    alias: Optional[str] = None
    es_principal: bool
    creado_en: datetime
    actualizado_en: datetime
    eliminado_en: Optional[datetime] = None
    usuario_email: Optional[str] = None
    usuario_nombre: Optional[str] = None

    model_config = {"from_attributes": True}


class PaginatedDireccionesAdmin(BaseModel):
    """Paginated response for admin direcciones listing."""

    items: List[DireccionAdminRead]
    total: int
    page: int
    size: int
    pages: int
