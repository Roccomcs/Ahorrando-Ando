from dataclasses import dataclass
from datetime import datetime

from domain.entities.holding import Holding
from domain.value_objects.money import Money


@dataclass(frozen=True)
class Portfolio:
    user_id: str
    total_value: Money
    holdings: list[Holding]
    snapshot_at: datetime
