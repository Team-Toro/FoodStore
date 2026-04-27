import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import ExpiredSignatureError, JWTError, jwt  # noqa: F401
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# A pre-computed dummy hash used to defend against timing attacks when a user
# email is not found during login — we always run verify_password so the
# response time is constant regardless of whether the email exists.
_DUMMY_HASH = "$2b$12$irrelevant.hash.used.only.for.timing.defense.xxxxxxxx"


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """Create a signed JWT access token with standard claims."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "iat": now,
        "type": "access",
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token.

    Raises:
        ExpiredSignatureError: if the token has expired.
        JWTError: if the token is invalid (bad signature, malformed, etc.).
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise
    except JWTError:
        raise


def create_refresh_token() -> str:
    """Generate a new opaque refresh token (UUID v4)."""
    return str(uuid.uuid4())


def hash_refresh_token(token: str) -> str:
    """Return the SHA-256 hex digest of a refresh token UUID."""
    return hashlib.sha256(token.encode()).hexdigest()


def dummy_verify() -> None:
    """Run a dummy bcrypt verify to normalise timing on missing-user login paths."""
    pwd_context.verify("dummy_plain_text", _DUMMY_HASH)
