from datetime import datetime

from pydantic import BaseModel


class AuditLogDTO(BaseModel):
    id: str
    action: str
    ip_address: str
    user_agent: str | None
    metadata: dict
    created_at: datetime
