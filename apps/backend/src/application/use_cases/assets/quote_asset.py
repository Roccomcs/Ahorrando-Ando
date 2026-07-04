from infrastructure.prices.coingecko_price_service import CoinGeckoPriceService
from infrastructure.prices.data912_price_service import Data912PriceService
from infrastructure.prices.exchange_rate_service import ExchangeRateService


class QuoteAsset:
    """Cotiza un activo ya elegido (por category + ref) devolviendo su precio en USD."""

    def __init__(
        self,
        coingecko: CoinGeckoPriceService | None = None,
        data912: Data912PriceService | None = None,
        fx: ExchangeRateService | None = None,
    ) -> None:
        self._coingecko = coingecko or CoinGeckoPriceService()
        self._data912 = data912 or Data912PriceService()
        self._fx = fx or ExchangeRateService()

    async def execute(self, category: str, ref: str) -> float:
        ref = (ref or "").strip()
        if not ref:
            return 0.0
        try:
            if category == "crypto":
                return await self._coingecko.get_price_usd(ref)
            if category in ("stock", "cedear", "bond"):
                return await self._data912.get_price_usd(ref)
            if category == "fx":
                if ref.upper() == "USD":
                    return 1.0
                if ref.upper() == "ARS":
                    return await self._fx.get_ars_to_usd()
        except Exception:
            return 0.0
        return 0.0
