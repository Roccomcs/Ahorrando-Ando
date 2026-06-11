from pydantic import BaseModel

from domain.value_objects.provider_type import ProviderType


class IntegrationSummaryDTO(BaseModel):
    id: str
    provider_type: ProviderType
    is_active: bool
