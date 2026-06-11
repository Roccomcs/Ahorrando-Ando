from .binance_auth_client import BinanceAuthClient
from .binance_types import BinanceAccountInfo


class BinanceAccountClient(BinanceAuthClient):
    async def fetch_all_balances(self) -> list[dict]:
        params, sig = self._signed_params()
        data: BinanceAccountInfo = await self.get(
            f"/api/v3/account?{params}&signature={sig}",
            headers=self._auth_headers(),
        )
        return [b for b in data["balances"] if float(b["free"]) + float(b["locked"]) > 0]

    async def fetch_performance_summary(self) -> dict[str, float]:
        # Binance no tiene endpoint de rendimiento histórico en la API spot pública
        return {"24h": 0.0, "7d": 0.0, "30d": 0.0}
