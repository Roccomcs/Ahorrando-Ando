from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class User:
    id: str
    email: str
    hashed_password: str
    created_at: datetime = field(default_factory=datetime.utcnow)
