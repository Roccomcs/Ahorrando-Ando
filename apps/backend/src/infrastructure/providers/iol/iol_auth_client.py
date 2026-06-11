import time
import httpx

BASE_URL = "https://api.invertironline.com"

# Token IOL expira en 20 min — lo renovamos a los 18 min para tener margen
TOKEN_TTL_SECONDS = 18 * 60


class IOLAuthClient:
    def __init__(self, username: str, password: str) -> None:
        self._username = username
        self._password = password
        self._access_token: str | None = None
        self._refresh_token: str | None = None
        self._expires_at: float = 0.0

    def _is_expired(self) -> bool:
        return time.time() >= self._expires_at

    async def get_token(self) -> str:
        if self._access_token and not self._is_expired():
            return self._access_token
        if self._refresh_token:
            try:
                return await self._refresh()
            except Exception:
                pass
        return await self._login()

    async def _login(self) -> str:
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=15) as client:
            resp = await client.post(
                "/token",
                data={
                    "username": self._username,
                    "password": self._password,
                    "grant_type": "password",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()
            self._access_token = data["access_token"]
            self._refresh_token = data.get("refresh_token")
            self._expires_at = time.time() + TOKEN_TTL_SECONDS
            return self._access_token

    async def _refresh(self) -> str:
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=15) as client:
            resp = await client.post(
                "/token",
                data={
                    "refresh_token": self._refresh_token,
                    "grant_type": "refresh_token",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()
            self._access_token = data["access_token"]
            self._refresh_token = data.get("refresh_token", self._refresh_token)
            self._expires_at = time.time() + TOKEN_TTL_SECONDS
            return self._access_token
