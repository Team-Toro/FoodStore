from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DireccionCreate(BaseModel):
    linea1: str
    linea2: Optional[str] = None
    ciudad: str
    codigo_postal: Optional[str] = None
    referencia: Optional[str] = None
    alias: Optional[str] = None


class DireccionUpdate(BaseModel):
    linea1: Optional[str] = None
    linea2: Optional[str] = None
    ciudad: Optional[str] = None
    codigo_postal: Optional[str] = None
    referencia: Optional[str] = None
    alias: Optional[str] = None


class DireccionRead(BaseModel):
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

    model_config = {"from_attributes": True}
