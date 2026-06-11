from dataclasses import dataclass
from enum import Enum


class Currency(str, Enum):
    USD = "USD"
    ARS = "ARS"
    BTC = "BTC"


@dataclass(frozen=True)
class Money:
    amount: float
    currency: Currency

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("El monto no puede ser negativo")

    def to_usd(self, rate: float) -> "Money":
        return Money(amount=self.amount * rate, currency=Currency.USD)
