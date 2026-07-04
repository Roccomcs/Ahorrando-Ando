from typing import Any

from pydantic import BaseModel

from domain.value_objects.provider_type import ProviderType


class AddIntegrationDTO(BaseModel):
    provider_type: ProviderType
    # La mayoría de los providers usan strings (API keys), pero el provider
    # "manual" recibe una lista de holdings anidada. Todo se serializa con
    # json.dumps y se cifra, así que cualquier valor JSON es válido acá.
    credentials: dict[str, Any]
