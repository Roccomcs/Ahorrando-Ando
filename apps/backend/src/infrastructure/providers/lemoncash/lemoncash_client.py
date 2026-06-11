from infrastructure.providers._base.http_client import BaseHttpClient

BASE_URL = "https://api.lemon.me"


class LemonCashClient(BaseHttpClient):
    def __init__(self, api_key: str) -> None:
        super().__init__(BASE_URL)
        self._api_key = api_key

    def _auth_headers(self) -> dict:
        return {"Authorization": f"Bearer {self._api_key}"}

    async def ping(self) -> bool:
        try:
            await self.get("/user/portfolio", headers=self._auth_headers())
            return True
        except Exception:
            return False

    async def fetch_portfolio(self) -> dict:
        return await self.get("/user/portfolio", headers=self._auth_headers())

    async def fetch_balances(self) -> list[dict]:
        data = await self.fetch_portfolio()
        return data.get("assets", [])
