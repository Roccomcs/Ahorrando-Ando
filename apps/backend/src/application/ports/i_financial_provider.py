from abc import ABC, abstractmethod

from domain.entities.holding import Holding
from domain.value_objects.money import Money


class IFinancialProvider(ABC):
    """Contrato que debe cumplir cualquier integración financiera."""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def provider_type(self) -> str: ...

    @abstractmethod
    async def authenticate(self) -> bool: ...

    @abstractmethod
    async def get_total_balance(self) -> Money: ...

    @abstractmethod
    async def get_holdings(self) -> list[Holding]: ...

    @abstractmethod
    async def get_performance(self) -> dict[str, float]: ...
