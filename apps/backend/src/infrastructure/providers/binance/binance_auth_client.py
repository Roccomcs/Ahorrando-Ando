import hashlib
import hmac
import time

import httpx

from infrastructure.providers._base.errors import ProviderAuthError
from infrastructure.providers._base.http_client import BaseHttpClient


class BinanceAuthError(ProviderAuthError):
    """Error de autenticación con Binance con un mensaje apto para el usuario."""


def _friendly_binance_error(exc: Exception) -> str:
    """Traduce el error de Binance a un mensaje claro en español.

    El caso más común en cloud (Railway/US) es el 451: Binance bloquea la IP del
    datacenter por región, no es problema de la clave del usuario.
    """
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        body = ""
        try:
            body = exc.response.text or ""
        except Exception:
            body = ""
        # Binance devuelve un código numérico propio en el JSON (ej: -2015)
        code = None
        try:
            code = exc.response.json().get("code")
        except Exception:
            code = None

        if status == 451 or "restricted location" in body.lower():
            return (
                "Binance bloquea las conexiones desde la región del servidor "
                "(no es un problema de tu clave). Estamos trabajando para "
                "habilitar el acceso."
            )
        if code == -2015 or status in (401, 403):
            return (
                "Binance rechazó la clave. Revisá que tenga activado solo "
                "\"Habilitar lectura\" y que NO tenga restricción de IP."
            )
        if code == -1021:
            return "Error de sincronización de reloj con Binance. Reintentá en unos segundos."
        if code == -1022:
            return "La firma de la API Secret es inválida. Verificá que copiaste el Secret completo."
        return f"Binance respondió con un error ({status}). Verificá tu API Key y Secret."
    if isinstance(exc, (httpx.ConnectError, httpx.TimeoutException, httpx.RemoteProtocolError)):
        return "No se pudo conectar con Binance. Reintentá en unos minutos."
    return "No se pudo verificar las credenciales de Binance."


class BinanceAuthClient(BaseHttpClient):
    BASE_URL = "https://api.binance.com"

    def __init__(self, api_key: str, api_secret: str) -> None:
        super().__init__(self.BASE_URL)
        self._api_key = (api_key or "").strip()
        self._api_secret = (api_secret or "").strip()

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
        """Valida las credenciales usando un endpoint firmado (no el ping público).

        Ante un error, propaga BinanceAuthError con un mensaje claro en vez de
        tragar la excepción — así el usuario ve el motivo real (geo-block, IP,
        permisos, etc.).
        """
        if not self._api_key or not self._api_secret:
            raise BinanceAuthError("Ingresá la API Key y la API Secret de Binance.")
        try:
            params, sig = self._signed_params()
            await self.get(
                f"/api/v3/account?{params}&signature={sig}",
                headers=self._auth_headers(),
            )
            return True
        except Exception as exc:  # noqa: BLE001 — se traduce y re-lanza
            raise BinanceAuthError(_friendly_binance_error(exc)) from exc
