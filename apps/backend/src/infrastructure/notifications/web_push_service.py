import json
import logging
import os

from application.ports.i_push_service import IPushService
from domain.entities.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


class WebPushService(IPushService):
    def __init__(self) -> None:
        self._vapid_private = os.getenv("VAPID_PRIVATE_KEY", "")
        self._vapid_public = os.getenv("VAPID_PUBLIC_KEY", "")
        self._vapid_email = os.getenv("VAPID_EMAIL", "mailto:admin@ahorrandoando.app")
        self._enabled = bool(self._vapid_private and self._vapid_public)

    async def send(self, subscription: PushSubscription, payload: dict) -> None:
        if not self._enabled:
            logger.info("VAPID keys no configuradas — push omitido")
            return
        try:
            from pywebpush import webpush, WebPushException  # type: ignore[import]

            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=json.dumps(payload),
                vapid_private_key=self._vapid_private,
                vapid_claims={"sub": self._vapid_email},
            )
        except Exception:
            logger.exception("Error enviando web push a %s", subscription.endpoint[:40])
