import logging
import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from infrastructure.providers._base.provider_error import ProviderError

logger = logging.getLogger(__name__)


def _init_sentry() -> None:
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=dsn,
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
            traces_sample_rate=0.2,
            environment=os.getenv("ENV", "production"),
        )
        logger.info("Sentry inicializado")
    except ImportError:
        logger.warning("sentry-sdk no instalado — ignorando SENTRY_DSN")


def add_error_handlers(app: FastAPI) -> None:
    _init_sentry()
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
