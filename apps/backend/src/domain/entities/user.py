from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass(frozen=True)
class User:
    id: str
    email: str
    hashed_password: str | None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    email_verified: bool = False
    google_id: str | None = None
