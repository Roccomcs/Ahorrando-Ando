import asyncio

from application.dtos.asset.asset_search_result_dto import AssetSearchResultDTO
from infrastructure.prices.coingecko_price_service import CoinGeckoPriceService
from infrastructure.prices.data912_price_service import Data912PriceService
from infrastructure.prices.logo_service import TradingViewLogoService

_PANEL_CATEGORY = {
    "arg_stocks": "stock",
    "arg_cedears": "cedear",
    "arg_bonds": "bond",
    "arg_notes": "bond",
}

# Activos fijos de efectivo / FX que siempre pueden aparecer en la búsqueda.
_FX_ASSETS = [
    ("USD", "Dólar estadounidense", "USD"),
    ("ARS", "Peso argentino", "ARS"),
]


class SearchAssets:
    """Busca activos para el ingreso manual: cripto (CoinGecko), acciones/CEDEARs/
    bonos argentinos (data912) y efectivo (USD/ARS)."""

    def __init__(
        self,
        coingecko: CoinGeckoPriceService | None = None,
        data912: Data912PriceService | None = None,
        logos: TradingViewLogoService | None = None,
    ) -> None:
        self._coingecko = coingecko or CoinGeckoPriceService()
        self._data912 = data912 or Data912PriceService()
        self._logos = logos or TradingViewLogoService()

    async def execute(self, query: str, limit: int = 20) -> list[AssetSearchResultDTO]:
        q = query.strip()
        if len(q) < 1:
            return []

        crypto_task = self._coingecko.search(q, limit=8)
        ar_task = self._data912.search(q, limit=12)
        logo_task = self._logos.logos_for_query(q)
        crypto_res, ar_res, logo_map = await asyncio.gather(
            crypto_task, ar_task, logo_task, return_exceptions=True
        )
        if not isinstance(logo_map, dict):
            logo_map = {}

        results: list[AssetSearchResultDTO] = []

        # Efectivo / FX
        qu = q.upper()
        for symbol, name, ref in _FX_ASSETS:
            if symbol.startswith(qu) or qu in name.upper():
                results.append(AssetSearchResultDTO(
                    symbol=symbol, name=name, category="fx", ref=ref,
                    price_usd=1.0 if symbol == "USD" else 0.0,
                ))

        # Acciones / CEDEARs / bonos argentinos (ya vienen con precio USD).
        # Van antes que cripto: para el público argentino, "AAPL" o "GGAL"
        # significan el CEDEAR/acción local, no un token cripto homónimo.
        if isinstance(ar_res, list):
            catalog = self._data912.catalog_snapshot()
            for a in ar_res:
                sym = a["symbol"]
                category = _PANEL_CATEGORY.get(catalog.get(sym, {}).get("panel", ""), "stock")
                results.append(AssetSearchResultDTO(
                    symbol=sym, name=sym, category=category,
                    ref=sym, price_usd=a.get("price_usd", 0.0),
                    logo_url=logo_map.get(sym.upper()),
                ))

        # Cripto (precio se cotiza al agregar; acá 0 para no hacer N requests)
        if isinstance(crypto_res, list):
            for c in crypto_res:
                if not c.get("id"):
                    continue
                results.append(AssetSearchResultDTO(
                    symbol=c["symbol"], name=c["name"], category="crypto",
                    ref=c["id"], price_usd=0.0, logo_url=c.get("logo_url"),
                ))

        return results[:limit]
