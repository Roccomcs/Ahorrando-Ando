from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class ProviderSnapshot:
    id: str
    user_id: str
    provider: str
    balance_usd: float
    snapshot_at: datetime
