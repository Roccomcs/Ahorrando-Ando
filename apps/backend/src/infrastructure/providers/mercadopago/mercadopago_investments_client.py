from .mercadopago_auth_client import MercadoPagoAuthClient


class MercadoPagoInvestmentsClient(MercadoPagoAuthClient):
    async def fetch_investments(self) -> list[dict]:
        data = await self.get("/v1/account/investments", headers=self._auth_headers())
        return data.get("results", [])
