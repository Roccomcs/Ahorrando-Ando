from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class TransactionType(str, Enum):
    BUY = "buy"
    SELL = "sell"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    YIELD = "yield"


@dataclass
class Transaction:
    """Movimiento del portfolio (compra, venta, depósito, retiro, rendimiento).

    `amount_usd` es el monto con signo: positivo = entra plata a la cuenta
    (venta, depósito, rendimiento), negativo = sale (compra, retiro).
    """

    id: str
    user_id: str
    tx_type: TransactionType
    amount_usd: float
    account: str
    occurred_at: datetime
    created_at: datetime
    asset_symbol: str | None = None
    quantity: float | None = None
    price_usd: float | None = None
    integration_id: str | None = None
    note: str | None = None
