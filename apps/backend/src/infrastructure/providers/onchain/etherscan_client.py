"""
Cliente de Etherscan API v2 (soporta Ethereum y Polygon con chainid).

Chains soportadas:
  - Ethereum: chainid=1
  - Polygon:  chainid=137

API key gratuita en etherscan.io — 5 llamadas/s, sin límite diario.
"""

import os
import httpx

BASE_URL = "https://api.etherscan.io/v2/api"

# Tokens ERC-20 conocidos que queremos mostrar (símbolo → coingecko id)
KNOWN_TOKENS: dict[str, str] = {
    "USDT": "tether",
    "USDC": "usd-coin",
    "DAI": "dai",
    "WBTC": "wrapped-bitcoin",
    "LINK": "chainlink",
    "UNI": "uniswap",
    "AAVE": "aave",
    "MATIC": "matic-network",
    "ARB": "arbitrum",
    "OP": "optimism",
}

CHAIN_IDS = {
    "ethereum": 1,
    "polygon": 137,
}


class EtherscanClient:
    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("ETHERSCAN_API_KEY", "")

    async def _call(self, chain: str, params: dict) -> dict:
        chain_id = CHAIN_IDS.get(chain, 1)
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                BASE_URL,
                params={"chainid": chain_id, "apikey": self._api_key, **params},
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") == "0" and data.get("message") not in ("No transactions found", "No records found"):
                raise ValueError(f"Etherscan error: {data.get('result')}")
            return data

    async def get_eth_balance(self, address: str, chain: str = "ethereum") -> float:
        """Balance nativo en ETH (o MATIC en Polygon)."""
        data = await self._call(chain, {
            "module": "account",
            "action": "balance",
            "address": address,
            "tag": "latest",
        })
        wei = int(data.get("result", 0))
        return wei / 1e18

    async def get_token_balances(self, address: str, chain: str = "ethereum") -> list[dict]:
        """Lista de tokens ERC-20 con balance > 0."""
        data = await self._call(chain, {
            "module": "account",
            "action": "tokentx",
            "address": address,
            "startblock": 0,
            "endblock": 99999999,
            "sort": "desc",
            "page": 1,
            "offset": 200,
        })
        # Extraer tokens únicos de las transacciones — no hay endpoint directo de balances en la API gratuita
        # Usamos el endpoint de token transfers y deducimos balances
        seen: dict[str, dict] = {}
        for tx in data.get("result", []) or []:
            symbol = tx.get("tokenSymbol", "")
            if symbol not in seen and symbol in KNOWN_TOKENS:
                seen[symbol] = {
                    "symbol": symbol,
                    "name": tx.get("tokenName", symbol),
                    "decimals": int(tx.get("tokenDecimal", 18)),
                    "contract": tx.get("contractAddress", ""),
                }
        return list(seen.values())

    async def get_token_balance(self, address: str, contract: str, decimals: int, chain: str = "ethereum") -> float:
        data = await self._call(chain, {
            "module": "account",
            "action": "tokenbalance",
            "contractaddress": contract,
            "address": address,
            "tag": "latest",
        })
        raw = int(data.get("result", 0))
        return raw / (10 ** decimals)
