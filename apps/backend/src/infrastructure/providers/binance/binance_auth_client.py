import hashlib
import hmac
import time

from infrastructure.providers._base.http_client import BaseHttpClient


class BinanceAuthClient(BaseHttpClient):
    BASE_URL = "https://api.binance.com"

    def __init__(self, api_key: str, api_secret: str) -> None:
        super().__init__(self.BASE_URL)
        self._api_key = api_key
        self._api_secret = api_secret

    def _sign(self, query_string: str) -> str:
        return hmac.new(
            self._api_secret.encode("utf-8"),
            query_string.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _auth_headers(self) -> dict:
        return {"X-MBX-APIKEY": self._api_key}

    def _signed_params(self, extra: str = "") -> tuple[str, str]:
        ts = int(time.time() * 1000)
        params = f"timestamp={ts}"
        if extra:
            params = f"{extra}&{params}"
        signature = self._sign(params)
        return params, signature

    async def ping(self) -> bool:
        """Valida las credenciales usando un endpoint firmado (no el ping público)."""
        try:
            params, sig = self._signed_params()
            await self.get(
                f"/api/v3/account?{params}&signature={sig}",
                headers=self._auth_headers(),
            )
            return True
        except Exception:
            return False
