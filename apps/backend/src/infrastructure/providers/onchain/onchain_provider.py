"""
Provider de wallet on-chain (solo lectura).

Credenciales requeridas:
  - address:  dirección pública 0x...
  - chain:    "ethereum" | "polygon" (default: ethereum)
  - api_key:  Etherscan API key (opcional si está en ETHERSCAN_API_KEY)

No se requiere private key — solo lectura de la blockchain pública.
"""

import asyncio

from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from infrastructure.prices.coingecko_price_service import CoinGeckoPriceService

from .etherscan_client import KNOWN_TOKENS, EtherscanClient
from .onchain_holdings_mapper import OnChainHoldingsMapper

_NATIVE = {
    "ethereum": ("ETH", "Ethereum", "ethereum"),
    "polygon": ("MATIC", "Polygon", "matic-network"),
    "bsc": ("BNB", "BNB Chain", "binancecoin"),
}


class OnChainProvider(IFinancialProvider):
    def __init__(self, address: str, chain: str = "ethereum", api_key: str = "") -> None:
        self._address = address.lower()
        self._chain = chain
        self._client = EtherscanClient(api_key or None)
        self._prices = CoinGeckoPriceService()
        self._mapper = OnChainHoldingsMapper()

    @property
    def name(self) -> str:
        return f"Wallet {self._chain.capitalize()} ({self._address[:6]}…)"

    @property
    def provider_type(self) -> str:
        return "onchain"

    async def authenticate(self) -> bool:
        """Valida que la dirección y la red sean válidas."""
        if self._chain not in _NATIVE:
            raise ValueError(
                f"Red no soportada: '{self._chain}'. Opciones: ethereum, polygon, bsc."
            )
        if not self._address.startswith("0x") or len(self._address) != 42:
            return False
        try:
            await self._client.get_eth_balance(self._address, self._chain)
            return True
        except Exception:
            return False

    async def get_holdings(self) -> list[Holding]:
        native_symbol, native_name, native_cg_id = _NATIVE.get(self._chain, _NATIVE["ethereum"])

        # Traer balance nativo + tokens conocidos en paralelo
        native_balance, known_tokens = await asyncio.gather(
            self._client.get_eth_balance(self._address, self._chain),
            self._client.get_token_balances(self._address, self._chain),
        )

        # Pedir balances individuales de cada token conocido
        token_balance_tasks = [
            self._client.get_token_balance(
                self._address, t["contract"], t["decimals"], self._chain
            )
            for t in known_tokens
        ]
        token_amounts = await asyncio.gather(*token_balance_tasks, return_exceptions=True)

        # IDs de CoinGecko para pedir precios en bulk
        cg_ids = [native_cg_id] + [
            KNOWN_TOKENS[t["symbol"]] for t in known_tokens if t["symbol"] in KNOWN_TOKENS
        ]
        prices = await self._prices.get_prices_usd(cg_ids)

        native_price = prices.get(native_cg_id, 0.0)

        token_data: list[tuple[str, str, float, float]] = []
        for token, amount in zip(known_tokens, token_amounts):
            if isinstance(amount, Exception) or amount <= 0:
                continue
            cg_id = KNOWN_TOKENS.get(token["symbol"], "")
            price = prices.get(cg_id, 0.0)
            token_data.append((token["symbol"], token["name"], float(amount), price))

        return self._mapper.map(
            native_symbol, native_name, native_balance, native_price, token_data
        )

    async def get_total_balance(self) -> Money:
        holdings = await self.get_holdings()
        total = sum(h.current_value.amount for h in holdings)
        return Money(amount=total, currency=Currency.USD)

    async def get_performance(self) -> dict[str, float]:
        return {}
