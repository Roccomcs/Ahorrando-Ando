from abc import ABC, abstractmethod


class IPriceService(ABC):
    @abstractmethod
    async def get_price_usd(self, symbol: str) -> float: ...

    @abstractmethod
    async def get_prices_usd(self, symbols: list[str]) -> dict[str, float]: ...
