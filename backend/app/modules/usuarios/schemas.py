from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    password: str
    telefono: Optional[str] = None

    @field_validator("nombre", "apellido")
    @classmethod
    def name_length(cls, v: str, info: object) -> str:  # noqa: ARG002
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Debe tener al menos 2 caracteres")
        if len(v) > 80:
            raise ValueError("No puede superar los 80 caracteres")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class UserResponse(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: str
    telefono: Optional[str] = None
    roles: list[str] = []
    creado_en: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None

    @field_validator("nombre", "apellido")
    @classmethod
    def name_length(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Debe tener al menos 2 caracteres")
        if len(v) > 80:
            raise ValueError("No puede superar los 80 caracteres")
        return v


class PasswordChange(BaseModel):
    password_actual: str
    password_nuevo: str

    @field_validator("password_nuevo")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La nueva contraseña debe tener al menos 8 caracteres")
        return v
