from dataclasses import dataclass
from datetime import datetime

from domain.value_objects.provider_type import ProviderType


@dataclass(frozen=True)
class Integration:
    id: str
    user_id: str
    type: ProviderType
    encrypted_credentials: str
    is_active: bool = True
    last_error: str | None = None
    last_sync_at: datetime | None = None
