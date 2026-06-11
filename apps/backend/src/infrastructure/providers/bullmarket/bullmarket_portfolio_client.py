from .bullmarket_auth_client import BullMarketAuthClient


class BullMarketPortfolioClient(BullMarketAuthClient):
    async def fetch_positions(self) -> list[dict]:
        data = await self.get("/portfolio/positions", headers=self._auth_headers())
        return data.get("positions", [])

    async def fetch_total_value(self) -> dict:
        data = await self.get("/portfolio/summary", headers=self._auth_headers())
        return {"total": data.get("totalValue", 0), "currency": data.get("currency", "ARS")}
