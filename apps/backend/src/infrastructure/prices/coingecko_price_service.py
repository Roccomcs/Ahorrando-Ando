from application.ports.i_price_service import IPriceService
from infrastructure.providers._base.http_client import BaseHttpClient


class CoinGeckoPriceService(IPriceService, BaseHttpClient):
    def __init__(self) -> None:
        BaseHttpClient.__init__(self, "https://api.coingecko.com/api/v3")

    async def get_price_usd(self, symbol: str) -> float:
        prices = await self.get_prices_usd([symbol])
        return prices.get(symbol.lower(), 0.0)

    async def get_prices_usd(self, symbols: list[str]) -> dict[str, float]:
        ids = ",".join(s.lower() for s in symbols)
        data = await self.get(f"/simple/price?ids={ids}&vs_currencies=usd")
        return {k: v["usd"] for k, v in data.items()}

    async def search(self, query: str, limit: int = 10) -> list[dict]:
        """Busca criptos por nombre/símbolo. Devuelve id (coingecko), símbolo y nombre.

        El `id` de CoinGecko se usa luego como `ref` para cotizar el activo.
        """
        q = query.strip()
        if not q:
            return []
        try:
            data = await self.get(f"/search?query={q}")
        except Exception:
            return []
        coins = data.get("coins", []) if isinstance(data, dict) else []
        out = []
        for c in coins[:limit]:
            out.append({
                "id": c.get("id", ""),
                "symbol": str(c.get("symbol", "")).upper(),
                "name": c.get("name", ""),
            })
        return out
