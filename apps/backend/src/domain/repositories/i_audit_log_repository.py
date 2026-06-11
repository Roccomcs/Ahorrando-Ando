from abc import ABC, abstractmethod
from datetime import datetime

from domain.entities.audit_log import AuditLog


class IAuditLogRepository(ABC):
    @abstractmethod
    async def save(self, log: AuditLog) -> None: ...

    @abstractmethod
    async def find_by_user(
        self,
        user_id: str,
        limit: int = 50,
        since: datetime | None = None,
    ) -> list[AuditLog]: ...
