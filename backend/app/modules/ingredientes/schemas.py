from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class IngredienteCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    es_alergeno: bool = False

    @field_validator("nombre")
    @classmethod
    def nombre_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        if len(v) > 100:
            raise ValueError("El nombre no puede superar los 100 caracteres")
        return v


class IngredienteUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    es_alergeno: Optional[bool] = None

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


class IngredienteRead(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    es_alergeno: bool
    creado_en: datetime

    model_config = {"from_attributes": True}
