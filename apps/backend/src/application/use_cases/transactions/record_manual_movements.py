"""Deriva movimientos reales de las altas/ediciones de integraciones manuales.

Cuando el usuario carga o edita posiciones a mano no hay un feed de
transacciones del broker, pero el delta de cantidades ES el movimiento:
  - cantidad que aparece o sube  → compra (activos) / depósito (efectivo)
  - cantidad que baja o desaparece → venta (activos) / retiro (efectivo)
El precio usado es el precio del holding al momento de la operación.
"""

import uuid
from datetime import datetime, timezone

from domain.entities.transaction import Transaction, TransactionType
from domain.repositories.i_transaction_repository import ITransactionRepository

Holding = dict  # {symbol, name, amount, category, ref, price_usd}


class RecordManualMovements:
    def __init__(self, repo: ITransactionRepository) -> None:
        self._repo = repo

    async def execute(
        self,
        user_id: str,
        integration_id: str,
        account: str,
        old_holdings: list[Holding],
        new_holdings: list[Holding],
    ) -> None:
        now = datetime.now(timezone.utc)
        old_by_symbol = {h.get("symbol"): h for h in old_holdings if h.get("symbol")}
        txs: list[Transaction] = []

        for h in new_holdings:
            symbol = h.get("symbol")
            if not symbol:
                continue
            new_amount = float(h.get("amount") or 0)
            old_amount = float(old_by_symbol.pop(symbol, {}).get("amount") or 0)
            delta = new_amount - old_amount
            if abs(delta) < 1e-12:
                continue
            txs.append(self._movement(user_id, integration_id, account, h, delta, now))

        # Holdings que estaban y ya no están → venta/retiro total.
        for symbol, h in old_by_symbol.items():
            old_amount = float(h.get("amount") or 0)
            if old_amount > 0:
                txs.append(self._movement(user_id, integration_id, account, h, -old_amount, now))

        await self._repo.save_many(txs)

    @staticmethod
    def _movement(
        user_id: str,
        integration_id: str,
        account: str,
        holding: Holding,
        delta: float,
        now: datetime,
    ) -> Transaction:
        price = float(holding.get("price_usd") or 0)
        is_cash = holding.get("category") == "fx"
        value = abs(delta) * price
        if delta > 0:
            tx_type = TransactionType.DEPOSIT if is_cash else TransactionType.BUY
            # compra: sale plata (−); depósito: entra plata (+)
            amount = value if is_cash else -value
        else:
            tx_type = TransactionType.WITHDRAWAL if is_cash else TransactionType.SELL
            amount = -value if is_cash else value
        return Transaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            tx_type=tx_type,
            amount_usd=amount,
            account=account,
            asset_symbol=holding.get("symbol"),
            quantity=abs(delta),
            price_usd=price or None,
            integration_id=integration_id,
            note=None,
            occurred_at=now,
            created_at=now,
        )
