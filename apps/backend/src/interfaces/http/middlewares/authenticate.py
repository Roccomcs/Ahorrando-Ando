from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class AuthenticateMiddleware(BaseHTTPMiddleware):
    """Middleware de autenticación — la validación real la hace get_current_user Depends."""

    EXEMPT_PATHS = {"/api/v1/auth/login", "/api/v1/auth/register", "/docs", "/openapi.json"}

    async def dispatch(self, request: Request, call_next) -> Response:
        return await call_next(request)
