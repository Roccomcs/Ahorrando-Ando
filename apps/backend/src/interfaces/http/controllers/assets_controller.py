from application.dtos.asset.asset_search_result_dto import AssetSearchResultDTO
from application.use_cases.assets.quote_asset import QuoteAsset
from application.use_cases.assets.search_assets import SearchAssets


class AssetsController:
    def __init__(self) -> None:
        self._search = SearchAssets()
        self._quote = QuoteAsset()

    async def search_assets(self, query: str) -> list[AssetSearchResultDTO]:
        return await self._search.execute(query)

    async def quote_asset(self, category: str, ref: str) -> dict:
        price = await self._quote.execute(category, ref)
        return {"category": category, "ref": ref, "price_usd": price}
