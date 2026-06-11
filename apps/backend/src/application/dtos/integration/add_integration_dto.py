from pydantic import BaseModel

from domain.value_objects.provider_type import ProviderType


class AddIntegrationDTO(BaseModel):
    provider_type: ProviderType
    credentials: dict[str, str]
