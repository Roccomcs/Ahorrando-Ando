from infrastructure.providers._base.http_client import BaseHttpClient
from infrastructure.providers._base.provider_error import AuthenticationError


class MercadoPagoAuthClient(BaseHttpClient):
    BASE_URL = "https://api.mercadopago.com"

    def __init__(self, access_token: str) -> None:
        super().__init__(self.BASE_URL)
        self._access_token = access_token

    def _auth_headers(self) -> dict:
        return {"Authorization": f"Bearer {self._access_token}"}

    async def ping(self) -> bool:
        try:
            await self.get("/v1/users/me", headers=self._auth_headers())
            return True
        except Exception:
            return False

    async def get_user_id(self) -> str:
        data = await self.get("/v1/users/me", headers=self._auth_headers())
        return str(data["id"])
