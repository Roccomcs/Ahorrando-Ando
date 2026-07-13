import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from infrastructure.providers._base.provider_error import ProviderError

logger = logging.getLogger(__name__)


def add_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        # Loguear para visibilidad server-side aunque sea un error controlado
        logger.warning("ValueError en %s %s: %s", request.method, request.url.path, exc)
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(ProviderError)
    async def provider_error_handler(request: Request, exc: ProviderError):
        return JSONResponse(
            status_code=502,
            content={"detail": str(exc), "provider": exc.provider},
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error en %s %s: %s", request.method, request.url.path, exc)
        return JSONResponse(status_code=500, content={"detail": "Error interno del servidor"})
