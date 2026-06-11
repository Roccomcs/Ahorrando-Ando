import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from interfaces.http.middlewares.error_handler import add_error_handlers
from interfaces.http.routers.auth_router import router as auth_router
from interfaces.http.routers.dashboard_router import router as dashboard_router
from interfaces.http.routers.health_router import router as health_router
from interfaces.http.routers.integrations_router import router as integrations_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


def create_app() -> FastAPI:
    app = FastAPI(title="Ahorrando Ando API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    add_error_handlers(app)

    app.include_router(health_router)
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api/v1")
    app.include_router(integrations_router, prefix="/api/v1")

    return app


app = create_app()
