from infrastructure.providers._base.http_client import BaseHttpClient


class ExchangeRateService(BaseHttpClient):
    """Tipo de cambio ARS/USD usando bluelytics.com.ar."""

    def __init__(self) -> None:
        super().__init__("https://api.bluelytics.com.ar")

    async def get_ars_to_usd(self) -> float:
        """Retorna cuántos USD vale 1 ARS (blue sell rate)."""
        data = await self.get("/v2/latest")
        blue_sell = float(data["blue"]["value_sell"])
        # blue_sell = cuántos ARS vale 1 USD → invertir para ARS→USD
        return 1.0 / blue_sell if blue_sell > 0 else 0.0

    async def get_usd_to_ars(self) -> float:
        """Retorna precio del dólar blue (cuántos ARS vale 1 USD)."""
        data = await self.get("/v2/latest")
        return float(data["blue"]["value_sell"])
