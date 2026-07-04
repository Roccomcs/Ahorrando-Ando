from typing import Any

from pydantic import BaseModel


class UpdateIntegrationDTO(BaseModel):
    # Solo aplica a integraciones manuales: nuevo set de credenciales
    # (institution_name + holdings). Se re-cifra y reemplaza el anterior.
    credentials: dict[str, Any]
