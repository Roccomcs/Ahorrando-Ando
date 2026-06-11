from abc import ABC, abstractmethod
from domain.entities.push_subscription import PushSubscription


class IPushSubscriptionRepository(ABC):
    @abstractmethod
    async def save(self, sub: PushSubscription) -> PushSubscription: ...

    @abstractmethod
    async def find_by_user(self, user_id: str) -> list[PushSubscription]: ...

    @abstractmethod
    async def delete(self, endpoint: str, user_id: str) -> None: ...
