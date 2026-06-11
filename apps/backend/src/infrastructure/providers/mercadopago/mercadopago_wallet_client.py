from .mercadopago_auth_client import MercadoPagoAuthClient


class MercadoPagoWalletClient(MercadoPagoAuthClient):
    async def fetch_wallet_balance(self) -> dict:
        """
        Retorna el saldo disponible de la billetera.
        Endpoint documentado: GET /v1/users/{user_id}/mercadopago_account/balance
        """
        user_id = await self.get_user_id()
        data = await self.get(
            f"/v1/users/{user_id}/mercadopago_account/balance",
            headers=self._auth_headers(),
        )
        # El balance viene en centavos en algunos casos — API devuelve float directamente
        available = float(data.get("available_balance", 0))
        return {"available": available, "currency": "ARS"}
