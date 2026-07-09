"""
Logos de activos al estilo TradingView.

TradingView expone un buscador de símbolos público (el mismo que usa su web) que
devuelve, por cada símbolo, un `logoid`. El logo vive en su CDN:
    https://s3-symbol-logo.tradingview.com/{logoid}.svg

Cubre acciones, CEDEARs (depositary receipts), ETFs/fondos, bonos e índices de
decenas de mercados, incluidos los argentinos (GGAL → gpo-fin-galicia,
MELI → mercadolibre, KO → coca-cola, etc.). Para cripto usamos CoinGecko, que ya
trae el logo en la búsqueda (TradingView sirve las cripto en otro path).

El endpoint requiere headers de navegador; se cachean los resultados en memoria
(incluyendo negativos) para no pegarle a TradingView repetidamente.
"""

import re

from infrastructure.providers._base.http_client import BaseHttpClient

_S3 = "https://s3-symbol-logo.tradingview.com"
_TAG_RE = re.compile(r"<[^>]+>")
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Origin": "https://www.tradingview.com",
    "Referer": "https://www.tradingview.com/",
    "Accept": "application/json",
}
# Tipos de TradingView que nos interesan (acción, CEDEAR/DR, fondo/ETF, bono, índice).
_WANTED_TYPES = {"stock", "dr", "fund", "bond", "index", "structured"}


class TradingViewLogoService(BaseHttpClient):
    def __init__(self) -> None:
        super().__init__("https://symbol-search.tradingview.com")
        self._cache: dict[str, str | None] = {}

    @staticmethod
    def _clean(s: str) -> str:
        return _TAG_RE.sub("", s or "")

    @staticmethod
    def _url(logoid: str) -> str:
        return f"{_S3}/{logoid}.svg"

    async def _search(self, text: str) -> list[dict]:
        try:
            data = await self.get(f"/symbol_search/?text={text}&hl=1&lang=en", headers=_HEADERS)
        except Exception:
            return []
        return data if isinstance(data, list) else []

    async def logo_for_symbol(self, symbol: str) -> str | None:
        """Resuelve el logo de un símbolo (acción/CEDEAR/ETF/bono). Cachea el resultado."""
        key = (symbol or "").strip().upper()
        if not key:
            return None
        if key in self._cache:
            return self._cache[key]

        items = await self._search(key)
        logoid = None
        # 1) match exacto de símbolo con el tipo esperado
        for it in items:
            sym = self._clean(it.get("symbol", "")).upper()
            if sym == key and it.get("type") in _WANTED_TYPES and it.get("logoid"):
                logoid = it["logoid"]
                break
        # 2) match exacto de símbolo (cualquier tipo)
        if not logoid:
            for it in items:
                if self._clean(it.get("symbol", "")).upper() == key and it.get("logoid"):
                    logoid = it["logoid"]
                    break
        url = self._url(logoid) if logoid else None
        self._cache[key] = url
        return url

    async def logos_for_query(self, query: str) -> dict[str, str]:
        """Un solo request: mapa {símbolo → logo_url} para todos los resultados del query."""
        items = await self._search(query)
        out: dict[str, str] = {}
        for it in items:
            sym = self._clean(it.get("symbol", "")).upper()
            logoid = it.get("logoid")
            if sym and logoid and sym not in out:
                out[sym] = self._url(logoid)
                self._cache.setdefault(sym, self._url(logoid))
        return out
