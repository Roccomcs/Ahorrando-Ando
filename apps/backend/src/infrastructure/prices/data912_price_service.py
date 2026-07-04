import time

from application.ports.i_price_service import IPriceService
from infrastructure.prices.exchange_rate_service import ExchangeRateService
from infrastructure.providers._base.http_client import BaseHttpClient

# Paneles públicos de data912 (sin auth). Precios en ARS en el campo "c" (cierre).
_PANELS = ("arg_stocks", "arg_cedears", "arg_bonds", "arg_notes")
_CATALOG_TTL = 60.0  # segundos


class Data912PriceService(IPriceService, BaseHttpClient):
    """Precios en vivo de acciones, CEDEARs, bonos y letras argentinas (data912.com).

    Los precios vienen en ARS; se convierten a USD con el dólar blue (Bluelytics),
    igual que el resto de la app. Cachea el catálogo unos segundos para no pegarle
    a data912 por cada símbolo.
    """

    def __init__(self) -> None:
        BaseHttpClient.__init__(self, "https://data912.com")
        self._fx = ExchangeRateService()
        self._catalog: dict[str, dict] = {}  # symbol -> {price_ars, name, panel}
        self._catalog_at: float = 0.0

    async def _load_catalog(self) -> dict[str, dict]:
        now = time.monotonic()
        if self._catalog and (now - self._catalog_at) < _CATALOG_TTL:
            return self._catalog

        catalog: dict[str, dict] = {}
        for panel in _PANELS:
            try:
                rows = await self.get(f"/live/{panel}")
            except Exception:
                continue
            if not isinstance(rows, list):
                continue
            for row in rows:
                symbol = str(row.get("symbol", "")).upper()
                price_ars = row.get("c")
                if not symbol or price_ars in (None, 0):
                    continue
                # No pisar un símbolo ya cargado por un panel anterior
                catalog.setdefault(symbol, {"price_ars": float(price_ars), "panel": panel})

        if catalog:
            self._catalog = catalog
            self._catalog_at = now
        return self._catalog

    async def get_price_usd(self, symbol: str) -> float:
        prices = await self.get_prices_usd([symbol])
        return prices.get(symbol.upper(), 0.0)

    async def get_prices_usd(self, symbols: list[str]) -> dict[str, float]:
        catalog = await self._load_catalog()
        wanted = {s.upper() for s in symbols}
        if not any(s in catalog for s in wanted):
            return {}
        ars_to_usd = await self._fx.get_ars_to_usd()
        result: dict[str, float] = {}
        for s in wanted:
            entry = catalog.get(s)
            if entry:
                result[s] = entry["price_ars"] * ars_to_usd
        return result

    def catalog_snapshot(self) -> dict[str, dict]:
        """Catálogo ya cargado (para búsqueda). Puede estar vacío si nunca se cargó."""
        return self._catalog

    async def search(self, query: str, limit: int = 15) -> list[dict]:
        """Busca símbolos AR que empiecen/contengan el query. Devuelve symbol + panel + precio USD."""
        catalog = await self._load_catalog()
        if not catalog:
            return []
        q = query.strip().upper()
        if not q:
            return []
        starts = [s for s in catalog if s.startswith(q)]
        contains = [s for s in catalog if q in s and not s.startswith(q)]
        matched = (starts + contains)[:limit]
        if not matched:
            return []
        ars_to_usd = await self._fx.get_ars_to_usd()
        out = []
        for s in matched:
            entry = catalog[s]
            out.append({
                "symbol": s,
                "panel": entry["panel"],
                "price_usd": entry["price_ars"] * ars_to_usd,
            })
        return out
