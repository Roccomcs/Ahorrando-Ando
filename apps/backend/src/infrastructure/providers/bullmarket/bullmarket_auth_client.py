from infrastructure.providers._base.http_client import BaseHttpClient


class BullMarketAuthClient(BaseHttpClient):
    BASE_URL = "https://api.bullmarket.com.ar"

    def __init__(self, username: str, password: str) -> None:
        super().__init__(self.BASE_URL)
        self._username = username
        self._password = password
        self._token: str | None = None

    async def login(self) -> bool:
        try:
            data = await self.post(
                "/auth/login",
                json={"username": self._username, "password": self._password},
            )
            self._token = data.get("token")
            return bool(self._token)
        except Exception:
            return False

    def _auth_headers(self) -> dict:
        return {"Authorization": f"Bearer {self._token}"}
