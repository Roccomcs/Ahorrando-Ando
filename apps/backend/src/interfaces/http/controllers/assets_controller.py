from application.dtos.asset.asset_search_result_dto import AssetSearchResultDTO
from application.use_cases.assets.quote_asset import QuoteAsset
from application.use_cases.assets.search_assets import SearchAssets
from infrastructure.prices.coingecko_price_service import CoinGeckoPriceService
from infrastructure.prices.logo_service import TradingViewLogoService
from infrastructure.prices.yahoo_price_service import YahooPriceService

_AR_CATEGORIES = ("stock", "cedear", "bond")


class AssetsController:
    def __init__(self) -> None:
        self._search = SearchAssets()
        self._quote = QuoteAsset()
        self._coingecko = CoinGeckoPriceService()
        self._logos = TradingViewLogoService()
        self._yahoo = YahooPriceService()

    async def search_assets(self, query: str) -> list[AssetSearchResultDTO]:
        return await self._search.execute(query)

    async def quote_asset(self, category: str, ref: str) -> dict:
        price = await self._quote.execute(category, ref)
        return {"category": category, "ref": ref, "price_usd": price}

    async def asset_history(self, category: str, ref: str, days: int) -> dict:
        """Serie histórica de precios USD del activo para el gráfico de Analytics.

        Cripto: CoinGecko market_chart. Acciones/CEDEARs: Yahoo Finance (la mayoría
        de los CEDEARs son acciones de EE.UU.). Bonos AR y efectivo: sin fuente
        gratuita conocida → serie vacía + available=False, y el frontend muestra
        sólo el valor actual."""
        cat = (category or "").lower()
        points: list[dict] = []
        if cat == "crypto":
            # `ref` puede venir como símbolo (BTC) o como id de CoinGecko
            # (bitcoin). Resolvemos el id por símbolo; si no matchea, usamos ref
            # tal cual (ya era un id válido).
            coin_id = ref
            try:
                for c in await self._coingecko.search(ref, limit=10):
                    if c.get("symbol", "").upper() == (ref or "").upper() and c.get("id"):
                        coin_id = c["id"]
                        break
            except Exception:
                pass
            points = await self._coingecko.market_chart(coin_id, days=days)
        elif cat in ("stock", "cedear"):
            points = await self._yahoo.market_chart(ref, days=days)
        available = len(points) > 0
        return {"category": cat, "ref": ref, "days": days, "available": available, "points": points}

    async def asset_logo(self, symbol: str, category: str = "") -> dict:
        """Logo de un activo. Cripto vía CoinGecko, acciones/CEDEARs/bonos vía
        TradingView. `fx` no tiene logo acá (el frontend usa la bandera). Sin
        categoría (activo ya borrado que sigue en el historial) se prueban ambas
        fuentes. Ambos servicios cachean en memoria, así que esto es barato tras
        el primer hit."""
        cat = (category or "").lower()
        url = None
        try:
            if cat == "crypto":
                url = await self._coingecko.logo_for_symbol(symbol)
            elif cat in _AR_CATEGORIES:
                url = await self._logos.logo_for_symbol_or_base(symbol)
            elif cat not in ("fx",):
                # Autodetección (activo sin categoría, ej: ya borrado del historial).
                # Probamos acción/CEDEAR primero: un símbolo tipo AAPL/AMD/AMZN
                # podría matchear por casualidad un token cripto oscuro y traer un
                # logo random; TradingView resuelve el logo real de la acción.
                url = await self._logos.logo_for_symbol_or_base(symbol)
                if not url:
                    url = await self._coingecko.logo_for_symbol(symbol)
        except Exception:
            url = None
        return {"symbol": symbol, "category": cat, "logo_url": url}
