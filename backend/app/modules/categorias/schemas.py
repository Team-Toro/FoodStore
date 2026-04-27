from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class CategoriaCreate(BaseModel):
    nombre: str
    padre_id: Optional[int] = None

    @field_validator("nombre")
    @classmethod
    def nombre_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        if len(v) > 100:
            raise ValueError("El nombre no puede superar los 100 caracteres")
        return v


class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = None
    padre_id: Optional[int] = None

    @field_validator("nombre")
    @classmethod
    def nombre_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("El nombre no puede estar vacío")
            if len(v) > 100:
                raise ValueError("El nombre no puede superar los 100 caracteres")
        return v


class CategoriaRead(BaseModel):
    id: int
    nombre: str
    padre_id: Optional[int] = None
    creado_en: datetime

    model_config = {"from_attributes": True}


class CategoriaTree(BaseModel):
    id: int
    nombre: str
    padre_id: Optional[int] = None
    creado_en: datetime
    hijos: list["CategoriaTree"] = []

    model_config = {"from_attributes": True}


CategoriaTree.model_rebuild()
