"""Auth router — 5 endpoints: register, login, refresh, logout, me."""
from fastapi import APIRouter, Depends, Request, Response, status

from app.core.deps import CurrentUser, get_current_user
from app.core.limiter import limiter
from app.core.uow import UnitOfWork
from app.modules.auth import service as auth_service
from app.modules.auth.schemas import LoginRequest, RegisterRequest, TokenResponse
from app.modules.refreshtokens.schemas import LogoutRequest, RefreshRequest
from app.modules.usuarios.schemas import PasswordChange, UserResponse, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new client account",
)
async def register(
    request: Request,
    data: RegisterRequest,
) -> TokenResponse:
    """Register a new user with the CLIENT role and return a token pair."""
    async with UnitOfWork() as uow:
        return await auth_service.register(uow, data)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Login with email and password",
)
@limiter.limit("5/15minutes")
async def login(
    request: Request,
    data: LoginRequest,
) -> TokenResponse:
    """Validate credentials and return a JWT token pair."""
    async with UnitOfWork() as uow:
        return await auth_service.login(uow, data)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate refresh token",
)
async def refresh_token(
    data: RefreshRequest,
) -> TokenResponse:
    """Exchange a valid refresh token for a new token pair."""
    async with UnitOfWork() as uow:
        return await auth_service.refresh(uow, data.refresh_token)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout — revoke refresh token",
)
async def logout(
    data: LogoutRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    """Revoke the provided refresh token (idempotent).

    Requires valid access token in Authorization: Bearer header.
    """
    async with UnitOfWork() as uow:
        await auth_service.logout(uow, data.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
)
async def me(
    current_user: CurrentUser = Depends(get_current_user),
) -> UserResponse:
    """Return the authenticated user's profile including roles."""
    async with UnitOfWork() as uow:
        return await auth_service.get_me(uow, current_user.id)


@router.put(
    "/perfil",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update own profile",
)
async def update_perfil(
    data: UserUpdate,
    current_user: CurrentUser = Depends(get_current_user),
) -> UserResponse:
    """Update the authenticated user's nombre, apellido and/or telefono."""
    async with UnitOfWork() as uow:
        return await auth_service.update_perfil(uow, current_user.id, data)


@router.put(
    "/perfil/password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change own password",
)
async def change_password(
    data: PasswordChange,
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    """Change password after verifying the current one."""
    async with UnitOfWork() as uow:
        await auth_service.change_password(uow, current_user.id, data)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
