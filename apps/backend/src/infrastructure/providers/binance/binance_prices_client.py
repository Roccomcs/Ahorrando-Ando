from infrastructure.providers._base.http_client import BaseHttpClient


class BinancePricesClient(BaseHttpClient):
    """Obtiene precios spot en USDT. No requiere autenticación."""

    def __init__(self) -> None:
        super().__init__("https://api.binance.com")

    async def get_prices_usdt(self, symbols: list[str]) -> dict[str, float]:
        """Retorna {symbol: price_in_usdt} para los símbolos pedidos."""
        if not symbols:
            return {}
        # Filtra stablecoins que siempre valen ~1 USD
        stablecoins = {"USDT", "BUSD", "USDC", "DAI", "TUSD", "USDP"}
        prices: dict[str, float] = {s: 1.0 for s in symbols if s in stablecoins}
        to_fetch = [s for s in symbols if s not in stablecoins]

        if not to_fetch:
            return prices

        # Precio individual para cada símbolo (endpoint soporta symbol único o todos)
        import asyncio
        results = await asyncio.gather(
            *[self._fetch_one(s) for s in to_fetch],
            return_exceptions=True,
        )
        for symbol, result in zip(to_fetch, results):
            if isinstance(result, Exception):
                prices[symbol] = 0.0
            else:
                prices[symbol] = result

        return prices

    async def _fetch_one(self, symbol: str) -> float:
        data = await self.get(f"/api/v3/ticker/price?symbol={symbol}USDT")
        return float(data["price"])
