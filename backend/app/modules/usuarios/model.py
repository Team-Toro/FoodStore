from typing import List, Optional

from sqlalchemy import Column, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from app.core.models import SoftDeleteModel


class Rol(SQLModel, table=True):
    """Represents an application role (ADMIN, STOCK, PEDIDOS, CLIENT)."""

    __tablename__ = "rol"

    id: Optional[int] = Field(default=None, primary_key=True)
    codigo: str = Field(max_length=50, unique=True, index=True, nullable=False)
    nombre: str = Field(max_length=100, nullable=False)
    descripcion: Optional[str] = Field(default=None)

    # Back-reference from UsuarioRol
    usuario_roles: List["UsuarioRol"] = Relationship(back_populates="rol")


class Usuario(SoftDeleteModel, table=True):
    """Application user with RBAC roles and optional soft delete."""

    __tablename__ = "usuario"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, nullable=False)
    apellido: str = Field(max_length=100, nullable=False)
    email: str = Field(max_length=255, unique=True, index=True, nullable=False)
    password_hash: str = Field(max_length=255, nullable=False)
    telefono: Optional[str] = Field(default=None, max_length=30)
    activo: bool = Field(default=True, nullable=False)

    # Relationships
    usuario_roles: List["UsuarioRol"] = Relationship(back_populates="usuario")


class UsuarioRol(SQLModel, table=True):
    """Many-to-many join table between Usuario and Rol."""

    __tablename__ = "usuario_rol"
    __table_args__ = (UniqueConstraint("usuario_id", "rol_id"),)

    usuario_id: int = Field(foreign_key="usuario.id", primary_key=True)
    rol_id: int = Field(foreign_key="rol.id", primary_key=True)

    # Relationships
    usuario: Optional[Usuario] = Relationship(back_populates="usuario_roles")
    rol: Optional[Rol] = Relationship(back_populates="usuario_roles")
