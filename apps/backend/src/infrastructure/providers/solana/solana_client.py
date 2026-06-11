"""
Cliente Solana via JSON-RPC público.

No requiere API key para operaciones básicas de lectura.
Endpoint: https://api.mainnet-beta.solana.com
"""

import httpx

RPC_URL = "https://api.mainnet-beta.solana.com"
SPL_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

# Mints de SPL tokens conocidos: mint_address → (symbol, name, coingecko_id)
KNOWN_SPL_TOKENS: dict[str, tuple[str, str, str]] = {
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": ("USDC", "USD Coin", "usd-coin"),
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": ("USDT", "Tether", "tether"),
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": ("RAY", "Raydium", "raydium"),
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": ("JUP", "Jupiter", "jupiter-exchange-solana"),
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": ("mSOL", "Marinade Staked SOL", "msol"),
    "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": ("stSOL", "Lido Staked SOL", "lido-staked-sol"),
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": ("BONK", "Bonk", "bonk"),
}


class SolanaClient:
    async def _rpc(self, method: str, params: list) -> dict:
        payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(RPC_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                raise ValueError(f"Solana RPC error: {data['error']['message']}")
            return data.get("result", {})

    async def get_sol_balance(self, address: str) -> float:
        """Balance en SOL (convierte desde lamports)."""
        result = await self._rpc("getBalance", [address])
        lamports = result.get("value", 0) if isinstance(result, dict) else result
        return lamports / 1e9

    async def get_spl_token_accounts(self, address: str) -> list[dict]:
        """Retorna SPL token accounts con mint y balance parseado."""
        result = await self._rpc(
            "getTokenAccountsByOwner",
            [
                address,
                {"programId": SPL_PROGRAM_ID},
                {"encoding": "jsonParsed"},
            ],
        )
        accounts = []
        for item in result.get("value", []):
            info = item.get("account", {}).get("data", {}).get("parsed", {}).get("info", {})
            mint = info.get("mint", "")
            if mint not in KNOWN_SPL_TOKENS:
                continue
            amount_raw = info.get("tokenAmount", {})
            ui_amount = amount_raw.get("uiAmount") or 0.0
            if ui_amount <= 0:
                continue
            symbol, name, cg_id = KNOWN_SPL_TOKENS[mint]
            accounts.append({"mint": mint, "symbol": symbol, "name": name, "cg_id": cg_id, "amount": float(ui_amount)})
        return accounts

    async def is_valid_address(self, address: str) -> bool:
        """Valida que la dirección sea una clave pública de Solana válida."""
        # Solana addresses are base58-encoded, 32-44 chars, no 0/O/I/l
        import re
        return bool(re.match(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$", address))
