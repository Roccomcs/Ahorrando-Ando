from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class AlertDirection(str, Enum):
    ABOVE = "above"
    BELOW = "below"


@dataclass
class PriceAlert:
    id: str
    user_id: str
    asset_symbol: str
    threshold_usd: float
    direction: AlertDirection
    is_active: bool
    created_at: datetime
    triggered_at: datetime | None = None
    note: str | None = None
