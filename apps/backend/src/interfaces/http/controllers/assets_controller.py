from application.dtos.asset.asset_search_result_dto import AssetSearchResultDTO
from application.use_cases.assets.quote_asset import QuoteAsset
from application.use_cases.assets.search_assets import SearchAssets
from infrastructure.prices.coingecko_price_service import CoinGeckoPriceService
from infrastructure.prices.logo_service import TradingViewLogoService

_AR_CATEGORIES = ("stock", "cedear", "bond")


class AssetsController:
    def __init__(self) -> None:
        self._search = SearchAssets()
        self._quote = QuoteAsset()
        self._coingecko = CoinGeckoPriceService()
        self._logos = TradingViewLogoService()

    async def search_assets(self, query: str) -> list[AssetSearchResultDTO]:
        return await self._search.execute(query)

    async def quote_asset(self, category: str, ref: str) -> dict:
        price = await self._quote.execute(category, ref)
        return {"category": category, "ref": ref, "price_usd": price}

    async def asset_logo(self, symbol: str, category: str) -> dict:
        """Logo de un activo. Cripto vía CoinGecko, acciones/CEDEARs/bonos vía
        TradingView. `fx` no tiene logo acá (el frontend usa la bandera).
        Ambos servicios cachean en memoria, así que esto es barato tras el primer hit."""
        cat = (category or "").lower()
        url = None
        try:
            if cat == "crypto":
                url = await self._coingecko.logo_for_symbol(symbol)
            elif cat in _AR_CATEGORIES:
                url = await self._logos.logo_for_symbol_or_base(symbol)
        except Exception:
            url = None
        return {"symbol": symbol, "category": cat, "logo_url": url}
