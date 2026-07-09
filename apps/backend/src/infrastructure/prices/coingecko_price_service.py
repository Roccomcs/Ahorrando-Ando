from application.ports.i_price_service import IPriceService
from infrastructure.providers._base.http_client import BaseHttpClient


class CoinGeckoPriceService(IPriceService, BaseHttpClient):
    _logo_cache: dict[str, str | None] = {}

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
                "logo_url": c.get("large") or c.get("thumb") or None,
            })
        return out

    async def logo_for_symbol(self, symbol: str) -> str | None:
        """Logo de una cripto por símbolo (ej: BTC). Cachea el resultado (incl. negativos)."""
        key = (symbol or "").strip().upper()
        if not key:
            return None
        if key in self._logo_cache:
            return self._logo_cache[key]
        url = None
        for c in await self.search(key, limit=10):
            if c.get("symbol", "").upper() == key and c.get("logo_url"):
                url = c["logo_url"]
                break
        self._logo_cache[key] = url
        return url
