import httpx

from .iol_auth_client import IOLAuthClient

BASE_URL = "https://api.invertironline.com"


class IOLPortfolioClient:
    def __init__(self, auth: IOLAuthClient) -> None:
        self._auth = auth

    async def _headers(self) -> dict:
        token = await self._auth.get_token()
        return {"Authorization": f"Bearer {token}"}

    async def fetch_portfolio(self) -> dict:
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=15) as client:
            resp = await client.get(
                "/api/v2/portafolio/argentina",
                headers=await self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    async def fetch_cotizacion(self, simbolo: str, mercado: str = "bCBA") -> float:
        """Devuelve el último precio en ARS de un instrumento."""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=10) as client:
            resp = await client.get(
                f"/api/v2/Cotizaciones/{mercado}/{simbolo}/ultima",
                headers=await self._headers(),
            )
            if resp.status_code != 200:
                return 0.0
            data = resp.json()
            return float(data.get("ultimoPrecio", 0))
