import httpx

from infrastructure.providers._base.errors import ProviderAuthError
from infrastructure.providers._base.http_client import BaseHttpClient


class MercadoPagoAuthError(ProviderAuthError):
    """Error de autenticación con MercadoPago con un mensaje apto para el usuario."""


def _friendly_mp_error(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        body = ""
        try:
            body = (exc.response.text or "")[:300]
        except Exception:
            body = ""
        if status in (401, 403):
            return (
                "MercadoPago rechazó el Access Token. Asegurate de copiar el token "
                "de \"Credenciales de producción\" (empieza con APP_USR-) y que la "
                "aplicación esté activada."
            )
        if status == 404:
            return (
                "MercadoPago no expone el saldo de tu cuenta personal por API "
                "(el endpoint no está disponible para tu cuenta). Cargá el saldo "
                "de MercadoPago como ingreso manual."
            )
        return f"MercadoPago respondió con un error ({status}). {body}".strip()
    if isinstance(exc, (httpx.ConnectError, httpx.TimeoutException, httpx.RemoteProtocolError)):
        return "No se pudo conectar con MercadoPago. Reintentá en unos minutos."
    return "No se pudo verificar el Access Token de MercadoPago."


class MercadoPagoAuthClient(BaseHttpClient):
    BASE_URL = "https://api.mercadopago.com"

    def __init__(self, access_token: str) -> None:
        super().__init__(self.BASE_URL)
        self._access_token = (access_token or "").strip()

    def _auth_headers(self) -> dict:
        return {"Authorization": f"Bearer {self._access_token}"}

    async def ping(self) -> bool:
        """Valida el Access Token. Ante un error, propaga el motivo real."""
        if not self._access_token:
            raise MercadoPagoAuthError("Ingresá el Access Token de MercadoPago.")
        try:
            await self.get("/users/me", headers=self._auth_headers())
            return True
        except Exception as exc:  # noqa: BLE001 — se traduce y re-lanza
            raise MercadoPagoAuthError(_friendly_mp_error(exc)) from exc

    async def get_user_id(self) -> str:
        data = await self.get("/users/me", headers=self._auth_headers())
        return str(data["id"])
