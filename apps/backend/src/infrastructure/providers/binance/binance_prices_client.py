from infrastructure.providers._base.http_client import BaseHttpClient

_STABLECOINS = {"USDT", "BUSD", "USDC", "DAI", "TUSD", "USDP", "FDUSD", "USDS"}


class BinancePricesClient(BaseHttpClient):
    """Obtiene precios spot en USDT. No requiere autenticación."""

    def __init__(self) -> None:
        super().__init__("https://api.binance.com")

    async def get_prices_usdt(self, symbols: list[str]) -> dict[str, float]:
        """
        Retorna {symbol: price_in_usdt} usando el endpoint batch de Binance.
        Un solo request para todos los precios disponibles.
        """
        if not symbols:
            return {}

        # Un solo request trae TODOS los pares disponibles (~2500 tickers)
        all_tickers: list[dict] = await self.get("/api/v3/ticker/price")
        pair_to_price = {item["symbol"]: float(item["price"]) for item in all_tickers}

        prices: dict[str, float] = {}
        for symbol in symbols:
            if symbol in _STABLECOINS:
                prices[symbol] = 1.0
                continue

            # Tokens de Flexible Savings tienen prefijo "LD" (ej. LDBNB → BNB)
            base = symbol[2:] if symbol.startswith("LD") else symbol

            if f"{base}USDT" in pair_to_price:
                prices[symbol] = pair_to_price[f"{base}USDT"]
            elif f"{base}BUSD" in pair_to_price:
                prices[symbol] = pair_to_price[f"{base}BUSD"]
            elif f"{base}BTC" in pair_to_price:
                btc_usd = pair_to_price.get("BTCUSDT", 0.0)
                prices[symbol] = pair_to_price[f"{base}BTC"] * btc_usd
            else:
                prices[symbol] = 0.0

        return prices
