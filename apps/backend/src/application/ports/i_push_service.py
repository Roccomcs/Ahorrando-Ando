from abc import ABC, abstractmethod
from domain.entities.push_subscription import PushSubscription


class IPushService(ABC):
    @abstractmethod
    async def send(self, subscription: PushSubscription, payload: dict) -> None: ...
