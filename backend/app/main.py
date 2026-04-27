from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.limiter import limiter  # shared limiter — also imported by routers

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Food Store API",
    version="1.0.0",
    description="E-commerce de productos alimenticios",
)

# Attach limiter so SlowAPIMiddleware can read it
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# RFC 7807 error handlers
# ---------------------------------------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Format HTTP errors following RFC 7807 with stable error codes."""
    code = exc.headers.get("X-Error-Code") if exc.headers else None
    if code is None:
        _defaults = {
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "UNPROCESSABLE_ENTITY",
            429: "RATE_LIMIT_EXCEEDED",
        }
        code = _defaults.get(exc.status_code, str(exc.status_code))

    body: dict = {
        "detail": exc.detail,
        "code": code,
    }

    field = exc.headers.get("X-Error-Field") if exc.headers else None
    if field:
        body["field"] = field

    return JSONResponse(
        status_code=exc.status_code,
        content=body,
        headers={k: v for k, v in (exc.headers or {}).items()
                 if not k.startswith("X-Error-")},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Format validation errors with field information."""
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error.get("loc", []))
        errors.append(
            {
                "detail": error.get("msg", "Validation error"),
                "code": "VALIDATION_ERROR",
                "field": field,
            }
        )
    return JSONResponse(status_code=422, content={"errors": errors})


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return 429 with Retry-After header and stable error code."""
    retry_after = getattr(exc, "retry_after", None) or 60
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Demasiados intentos, reintenta en {retry_after} segundos",
            "code": "RATE_LIMIT_EXCEEDED",
        },
        headers={"Retry-After": str(retry_after)},
    )


# ---------------------------------------------------------------------------
# Health check router
# ---------------------------------------------------------------------------
from fastapi import APIRouter  # noqa: E402

health_router = APIRouter(tags=["health"])


@health_router.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}


app.include_router(health_router)

# ---------------------------------------------------------------------------
# Auth router
# ---------------------------------------------------------------------------
from app.modules.auth.router import router as auth_router  # noqa: E402

app.include_router(auth_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Categorias router
# ---------------------------------------------------------------------------
from app.modules.categorias.router import router as categorias_router  # noqa: E402

app.include_router(categorias_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Ingredientes router
# ---------------------------------------------------------------------------
from app.modules.ingredientes.router import router as ingredientes_router  # noqa: E402

app.include_router(ingredientes_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Productos router
# ---------------------------------------------------------------------------
from app.modules.productos.router import router as productos_router  # noqa: E402

app.include_router(productos_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Pedidos router
# ---------------------------------------------------------------------------
from app.modules.pedidos.router import router as pedidos_router  # noqa: E402

app.include_router(pedidos_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Pagos router
# ---------------------------------------------------------------------------
from app.modules.pagos.router import router as pagos_router  # noqa: E402

app.include_router(pagos_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Admin router
# ---------------------------------------------------------------------------
from app.modules.admin.router import router as admin_router  # noqa: E402

app.include_router(admin_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Direcciones router
# ---------------------------------------------------------------------------
from app.modules.direcciones.router import router as direcciones_router  # noqa: E402

app.include_router(direcciones_router, prefix="/api/v1")
