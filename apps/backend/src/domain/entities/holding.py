from dataclasses import dataclass

from domain.value_objects.money import Money
from domain.value_objects.percentage import Percentage


@dataclass(frozen=True)
class Holding:
    asset_name: str
    asset_symbol: str
    amount: float
    current_value: Money
    performance_24h: Percentage
    performance_30d: Percentage
