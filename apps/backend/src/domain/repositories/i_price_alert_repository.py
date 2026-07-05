from abc import ABC, abstractmethod
from domain.entities.price_alert import PriceAlert


class IPriceAlertRepository(ABC):
    @abstractmethod
    async def save(self, alert: PriceAlert) -> PriceAlert: ...

    @abstractmethod
    async def find_by_user(self, user_id: str) -> list[PriceAlert]: ...

    @abstractmethod
    async def find_active(self) -> list[PriceAlert]: ...

    @abstractmethod
    async def mark_triggered(self, alert_id: str) -> None: ...

    @abstractmethod
    async def delete(self, alert_id: str, user_id: str) -> None: ...

    @abstractmethod
    async def set_active(self, alert_id: str, user_id: str, active: bool) -> None: ...
