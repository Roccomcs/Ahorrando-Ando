from .mercadopago_auth_client import MercadoPagoAuthClient


class MercadoPagoInvestmentsClient(MercadoPagoAuthClient):
    async def fetch_investments(self) -> list[dict]:
        """
        Obtiene dinero invertido en Mercado Fondo (Cuenta Remunerada).

        MP no tiene un endpoint REST directo y público para el fondo de inversión.
        La estrategia: obtener el balance total de la cuenta y compararlo con el
        saldo disponible — la diferencia es el monto invertido en el fondo.

        Si la respuesta no tiene los campos esperados, retorna lista vacía
        para no romper el flujo de get_holdings().
        """
        try:
            user_id = await self.get_user_id()
            data = await self.get(
                f"/v1/users/{user_id}/mercadopago_account/balance",
                headers=self._auth_headers(),
            )
            total = float(data.get("total_amount", 0))
            available = float(data.get("available_balance", 0))
            invested = round(total - available, 2)

            if invested > 0.01:
                return [{
                    "name": "Mercado Fondo",
                    "amount": invested,
                    "currency_id": "ARS",
                }]
            return []
        except Exception:
            return []
