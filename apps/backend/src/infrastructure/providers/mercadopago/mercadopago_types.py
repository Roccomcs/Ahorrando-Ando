from typing import TypedDict


class MPWallet(TypedDict):
    available_balance: float
    currency_id: str


class MPInvestment(TypedDict):
    name: str
    amount: float
    currency_id: str
