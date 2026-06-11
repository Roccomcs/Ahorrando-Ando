from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class AuditLog:
    id: str
    action: str
    ip_address: str
    created_at: datetime
    user_id: str | None = None
    user_agent: str | None = None
    metadata: dict = field(default_factory=dict)
