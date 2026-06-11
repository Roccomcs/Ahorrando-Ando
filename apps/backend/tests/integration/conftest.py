"""
Tests de integración — requieren Postgres y Redis corriendo.
Se saltan automáticamente en CI si no está disponible la variable DATABASE_URL real.

Para correrlos: DATABASE_URL=postgresql+asyncpg://... REDIS_URL=redis://... pytest tests/integration/
"""
import os
import pytest

# Marca global: todos los tests en esta carpeta son @pytest.mark.integration
def pytest_collection_modifyitems(items):
    for item in items:
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)


pytestmark = pytest.mark.skipif(
    os.getenv("DATABASE_URL", "").startswith("postgresql+asyncpg://user:pass"),
    reason="Requiere base de datos real (DATABASE_URL con credenciales reales)",
)
