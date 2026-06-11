from datetime import datetime

from pydantic import BaseModel

from domain.value_objects.provider_type import ProviderType


class IntegrationSummaryDTO(BaseModel):
    id: str
    provider_type: ProviderType
    is_active: bool
    last_error: str | None = None
    last_sync_at: datetime | None = None
