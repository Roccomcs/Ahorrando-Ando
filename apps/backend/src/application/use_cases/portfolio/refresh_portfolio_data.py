from application.ports.i_cache_service import ICacheService


class RefreshPortfolioData:
    def __init__(self, cache_service: ICacheService) -> None:
        self._cache = cache_service

    async def execute(self, user_id: str) -> None:
        await self._cache.delete(f"portfolio:{user_id}")
