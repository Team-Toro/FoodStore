from typing import Optional

from pydantic import BaseModel, EmailStr, model_validator

# Re-export for convenience — auth router imports both from here and from usuarios.schemas
from app.modules.usuarios.schemas import RegisterRequest, UserResponse  # noqa: F401


class LoginRequest(BaseModel):
    """Login credentials.

    Accepts either `email` or `username` (alias used by OpenAPI/ReDoc tooling).
    At least one of them must be provided; `email` takes precedence when both
    are supplied.
    """

    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: str

    @model_validator(mode="after")
    def resolve_email_from_username(self) -> "LoginRequest":
        """Promote `username` into `email` when email is absent."""
        if self.email is None and self.username:
            # Pydantic will validate the value as EmailStr on assignment
            object.__setattr__(self, "email", self.username)
        if self.email is None:
            raise ValueError("Se requiere el campo 'email' o 'username'.")
        return self


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 1800  # 30 minutes in seconds
