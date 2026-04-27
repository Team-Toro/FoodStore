from pydantic import BaseModel, EmailStr

# Re-export for convenience — auth router imports both from here and from usuarios.schemas
from app.modules.usuarios.schemas import RegisterRequest, UserResponse  # noqa: F401


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 1800  # 30 minutes in seconds
