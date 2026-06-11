import logging
import uuid
from datetime import datetime

from fastapi import Request

from domain.entities.audit_log import AuditLog
from domain.repositories.i_audit_log_repository import IAuditLogRepository

logger = logging.getLogger(__name__)


class AuditService:
    def __init__(self, repo: IAuditLogRepository) -> None:
        self._repo = repo

    async def log(
        self,
        action: str,
        request: Request,
        user_id: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        try:
            entry = AuditLog(
                id=str(uuid.uuid4()),
                user_id=user_id,
                action=action,
                ip_address=request.client.host if request.client else "unknown",
                user_agent=request.headers.get("user-agent"),
                metadata=metadata or {},
                created_at=datetime.utcnow(),
            )
            await self._repo.save(entry)
        except Exception as e:
            logger.warning("No se pudo guardar audit log [%s]: %s", action, e)
