from typing import TypedDict


class BullMarketPosition(TypedDict):
    ticker: str
    description: str
    quantity: float
    last_price: float
    currency: str
