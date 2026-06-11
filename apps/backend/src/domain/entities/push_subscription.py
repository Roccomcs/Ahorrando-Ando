from dataclasses import dataclass
from datetime import datetime


@dataclass
class PushSubscription:
    id: str
    user_id: str
    endpoint: str
    p256dh: str
    auth: str
    created_at: datetime
