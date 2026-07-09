"""
Provider de balance manual — para cuentas sin API pública (Cocos Capital, Naranja X, Ualá, Bull Market, etc.)

El usuario carga cada activo con un buscador tipo TradingView. Cada holding puede
traer `category` y `ref` para cotizar en vivo:
  - crypto  → CoinGecko (ref = coingecko_id)
  - stock/cedear/bond → data912 (ref = símbolo AR)
  - fx      → USD=1.0, ARS vía dólar blue
Si no hay category/ref o falla la cotización, se usa el `price_usd` guardado
(último precio conocido). Así se mantiene retrocompatibilidad con holdings viejos
que solo tenían price_usd estático.

Credenciales:
  institution_name: str
  holdings: list de dicts — [{symbol, name, amount, category?, ref?, price_usd?}]
"""

from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from domain.value_objects.percentage import Percentage
from infrastructure.prices.coingecko_price_service import CoinGeckoPriceService
from infrastructure.prices.data912_price_service import Data912PriceService
from infrastructure.prices.exchange_rate_service import ExchangeRateService

_AR_CATEGORIES = ("stock", "cedear", "bond")


class ManualProvider(IFinancialProvider):
    def __init__(self, institution_name: str, holdings: list) -> None:
        self._institution = institution_name
        self._holdings_data = holdings or []
        self._coingecko = CoinGeckoPriceService()
        self._data912 = Data912PriceService()
        self._fx = ExchangeRateService()

    @property
    def name(self) -> str:
        return self._institution or "Cuenta Manual"

    @property
    def provider_type(self) -> str:
        return "manual"

    async def authenticate(self) -> bool:
        return bool(self._institution)

    async def _live_prices(self) -> dict[str, float]:
        """Cotiza en vivo los holdings que tengan category+ref. Devuelve {ref_key: price_usd}.

        La key es f"{category}:{ref}" para no mezclar un símbolo AR con un id cripto.
        """
        crypto_refs: set[str] = set()
        ar_refs: set[str] = set()
        needs_ars = False
        needs_eur = False
        for h in self._holdings_data:
            category = (h.get("category") or "").lower()
            ref = (h.get("ref") or h.get("symbol") or "").strip()
            if not ref:
                continue
            if category == "crypto":
                crypto_refs.add(ref)
            elif category in _AR_CATEGORIES:
                ar_refs.add(ref.upper())
            elif category == "fx" and ref.upper() == "ARS":
                needs_ars = True
            elif category == "fx" and ref.upper() == "EUR":
                needs_eur = True

        prices: dict[str, float] = {}
        if crypto_refs:
            try:
                cg = await self._coingecko.get_prices_usd(list(crypto_refs))
                for ref in crypto_refs:
                    val = cg.get(ref.lower())
                    if val:
                        prices[f"crypto:{ref}"] = float(val)
            except Exception:
                pass
        if ar_refs:
            try:
                ar = await self._data912.get_prices_usd(list(ar_refs))
                for ref, val in ar.items():
                    if val:
                        prices[f"ar:{ref.upper()}"] = float(val)
            except Exception:
                pass
        if needs_ars:
            try:
                ars = await self._fx.get_ars_to_usd()
                if ars:
                    prices["fx:ARS"] = float(ars)
            except Exception:
                pass
        if needs_eur:
            try:
                eur = await self._fx.get_eur_to_usd()
                if eur:
                    prices["fx:EUR"] = float(eur)
            except Exception:
                pass
        return prices

    def _resolve_price(self, h: dict, live: dict[str, float]) -> float:
        """Precio en vivo si está disponible; si no, el price_usd guardado."""
        category = (h.get("category") or "").lower()
        ref = (h.get("ref") or h.get("symbol") or "").strip()
        fallback = float(h.get("price_usd", 0) or 0)
        if not ref:
            return fallback
        if category == "crypto":
            return live.get(f"crypto:{ref}", fallback)
        if category in _AR_CATEGORIES:
            return live.get(f"ar:{ref.upper()}", fallback)
        if category == "fx":
            if ref.upper() == "USD":
                return 1.0
            if ref.upper() == "ARS":
                return live.get("fx:ARS", fallback)
            if ref.upper() == "EUR":
                return live.get("fx:EUR", fallback)
        return fallback

    async def get_holdings(self) -> list[Holding]:
        live = await self._live_prices()
        holdings = []
        for h in self._holdings_data:
            amount = float(h.get("amount", 0) or 0)
            if amount <= 0:
                continue
            price_usd = self._resolve_price(h, live)
            holdings.append(
                Holding(
                    asset_name=h.get("name", h.get("symbol", "?")),
                    asset_symbol=h.get("symbol", "?"),
                    amount=amount,
                    current_value=Money(amount=amount * price_usd, currency=Currency.USD),
                    performance_24h=Percentage(0.0),
                    performance_30d=Percentage(0.0),
                    category=(h.get("category") or None),
                    logo_url=(h.get("logo_url") or None),
                )
            )
        return holdings

    async def get_total_balance(self) -> Money:
        holdings = await self.get_holdings()
        total = sum(h.current_value.amount for h in holdings)
        return Money(amount=total, currency=Currency.USD)

    async def get_performance(self) -> dict[str, float]:
        return {}
