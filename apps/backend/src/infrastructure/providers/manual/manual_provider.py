"""
Provider de balance manual — para cuentas sin API pública (Cocos Capital, Naranja X, Ualá, etc.)

El usuario ingresa manualmente el balance de cada cuenta. Los datos se guardan
encriptados y se sirven estáticos (sin sincronización automática).

Credenciales:
  institution_name: str   — nombre visible (ej: "Cocos Capital", "Naranja X")
  holdings: list de dicts — [{symbol, name, amount, price_usd}]

Ejemplo de uso para Cocos FCI Ahorro:
  institution_name: "Cocos Capital"
  holdings: [{"symbol": "FCI_AHO", "name": "Cocos FCI Ahorro Plus", "amount": 1, "price_usd": 3200.0}]
"""

from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from domain.value_objects.percentage import Percentage


class ManualProvider(IFinancialProvider):
    def __init__(self, institution_name: str, holdings: list) -> None:
        self._institution = institution_name
        self._holdings_data = holdings

    @property
    def name(self) -> str:
        return self._institution or "Cuenta Manual"

    @property
    def provider_type(self) -> str:
        return "manual"

    async def authenticate(self) -> bool:
        return bool(self._institution)

    async def get_holdings(self) -> list[Holding]:
        holdings = []
        for h in self._holdings_data:
            amount = float(h.get("amount", 0))
            price_usd = float(h.get("price_usd", 0))
            if amount <= 0:
                continue
            holdings.append(
                Holding(
                    asset_name=h.get("name", h.get("symbol", "?")),
                    asset_symbol=h.get("symbol", "?"),
                    amount=amount,
                    current_value=Money(amount=amount * price_usd, currency=Currency.USD),
                    performance_24h=Percentage(0.0),
                    performance_30d=Percentage(0.0),
                )
            )
        return holdings

    async def get_total_balance(self) -> Money:
        total = sum(
            float(h.get("amount", 0)) * float(h.get("price_usd", 0))
            for h in self._holdings_data
        )
        return Money(amount=total, currency=Currency.USD)

    async def get_performance(self) -> dict[str, float]:
        return {}
