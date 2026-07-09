import time

from infrastructure.providers._base.http_client import BaseHttpClient


class ExchangeRateService(BaseHttpClient):
    """Tipo de cambio ARS/USD usando bluelytics.com.ar (+ EUR/USD vía Frankfurter)."""

    _eur_cache: tuple[float, float] | None = None  # (rate, monotonic_ts)
    _EUR_TTL = 3600.0

    def __init__(self) -> None:
        super().__init__("https://api.bluelytics.com.ar")

    async def get_ars_to_usd(self) -> float:
        """Retorna cuántos USD vale 1 ARS (blue sell rate)."""
        data = await self.get("/v2/latest")
        blue_sell = float(data["blue"]["value_sell"])
        # blue_sell = cuántos ARS vale 1 USD → invertir para ARS→USD
        return 1.0 / blue_sell if blue_sell > 0 else 0.0

    async def get_usd_to_ars(self) -> float:
        """Retorna precio del dólar blue (cuántos ARS vale 1 USD)."""
        data = await self.get("/v2/latest")
        return float(data["blue"]["value_sell"])

    async def get_eur_to_usd(self) -> float:
        """Cuántos USD vale 1 EUR. Fuente gratuita sin key (Frankfurter), cacheada 1h."""
        cache = ExchangeRateService._eur_cache
        if cache and (time.monotonic() - cache[1]) < self._EUR_TTL:
            return cache[0]
        try:
            data = await self.get("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD")
            rate = float(data["rates"]["USD"])
        except Exception:
            return cache[0] if cache else 0.0
        ExchangeRateService._eur_cache = (rate, time.monotonic())
        return rate
