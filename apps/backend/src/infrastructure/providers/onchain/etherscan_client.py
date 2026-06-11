"""
Cliente multi-chain para exploradores compatibles con la API de Etherscan.

Chains soportadas:
  - Ethereum: Etherscan v2 (chainid=1)
  - Polygon:  Etherscan v2 (chainid=137)
  - BSC:      BscScan API (mismo formato, endpoint diferente)

API keys gratuitas en etherscan.io y bscscan.com — 5 llamadas/s.
"""

import os
import httpx

ETHERSCAN_V2_URL = "https://api.etherscan.io/v2/api"
BSCSCAN_URL = "https://api.bscscan.com/api"

# Tokens conocidos por chain: símbolo → coingecko id
EVM_KNOWN_TOKENS: dict[str, str] = {
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
    # BEP-20 tokens (BSC)
    "CAKE": "pancakeswap-token",
    "BUSD": "binance-usd",
    "BNB": "binancecoin",
    "WBNB": "wbnb",
    "XVS": "venus",
}

# Alias para compatibilidad con código existente
KNOWN_TOKENS = EVM_KNOWN_TOKENS

CHAIN_IDS = {
    "ethereum": 1,
    "polygon": 137,
}

# Chains que usan BscScan en vez de Etherscan
BSC_CHAINS = {"bsc"}


class EtherscanClient:
    def __init__(self, api_key: str | None = None) -> None:
        self._eth_key = api_key or os.getenv("ETHERSCAN_API_KEY", "")
        self._bsc_key = os.getenv("BSCSCAN_API_KEY", self._eth_key)

    def _base_url(self, chain: str) -> str:
        return BSCSCAN_URL if chain in BSC_CHAINS else ETHERSCAN_V2_URL

    def _api_key_for(self, chain: str) -> str:
        return self._bsc_key if chain in BSC_CHAINS else self._eth_key

    async def _call(self, chain: str, params: dict) -> dict:
        base = self._base_url(chain)
        key = self._api_key_for(chain)
        request_params = {"apikey": key, **params}
        if chain not in BSC_CHAINS:
            request_params["chainid"] = CHAIN_IDS.get(chain, 1)

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(base, params=request_params)
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") == "0" and data.get("message") not in (
                "No transactions found",
                "No records found",
            ):
                raise ValueError(f"API error ({chain}): {data.get('result')}")
            return data

    async def get_eth_balance(self, address: str, chain: str = "ethereum") -> float:
        """Balance nativo en ETH / MATIC / BNB según la chain."""
        data = await self._call(chain, {
            "module": "account",
            "action": "balance",
            "address": address,
            "tag": "latest",
        })
        wei = int(data.get("result", 0))
        return wei / 1e18

    async def get_token_balances(self, address: str, chain: str = "ethereum") -> list[dict]:
        """Lista de tokens ERC-20/BEP-20 con balance > 0 (detectados desde txs recientes)."""
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
        seen: dict[str, dict] = {}
        for tx in data.get("result", []) or []:
            symbol = tx.get("tokenSymbol", "")
            if symbol not in seen and symbol in EVM_KNOWN_TOKENS:
                seen[symbol] = {
                    "symbol": symbol,
                    "name": tx.get("tokenName", symbol),
                    "decimals": int(tx.get("tokenDecimal", 18)),
                    "contract": tx.get("contractAddress", ""),
                }
        return list(seen.values())

    async def get_token_balance(
        self, address: str, contract: str, decimals: int, chain: str = "ethereum"
    ) -> float:
        data = await self._call(chain, {
            "module": "account",
            "action": "tokenbalance",
            "contractaddress": contract,
            "address": address,
            "tag": "latest",
        })
        raw = int(data.get("result", 0))
        return raw / (10 ** decimals)
