import uuid
from datetime import datetime, timezone

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession

from application.use_cases.alerts.create_alert import CreateAlert, CreateAlertDTO
from application.use_cases.alerts.delete_alert import DeleteAlert
from domain.entities.price_alert import PriceAlert
from domain.entities.user import User
from infrastructure.database.postgres.connection import get_session
from infrastructure.database.postgres.repositories.postgres_price_alert_repository import PostgresPriceAlertRepository
from infrastructure.database.postgres.repositories.postgres_push_subscription_repository import PostgresPushSubscriptionRepository
from interfaces.http.dependencies.get_current_user import get_current_user


class CreateAlertRequest(BaseModel):
    asset_symbol: str = Field(min_length=1, max_length=10, pattern=r"^[A-Za-z0-9]+$")
    threshold_usd: float = Field(gt=0)
    direction: Literal["above", "below"]
    note: str | None = Field(default=None, max_length=200)

    @field_validator("asset_symbol")
    @classmethod
    def normalize_symbol(cls, v: str) -> str:
        return v.upper()


class PushSubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


class AlertResponse(BaseModel):
    id: str
    asset_symbol: str
    threshold_usd: float
    direction: str
    is_active: bool
    note: str | None
    created_at: str
    triggered_at: str | None


def _alert_to_response(a: PriceAlert) -> AlertResponse:
    return AlertResponse(
        id=a.id,
        asset_symbol=a.asset_symbol,
        threshold_usd=a.threshold_usd,
        direction=a.direction.value,
        is_active=a.is_active,
        note=a.note,
        created_at=a.created_at.isoformat(),
        triggered_at=a.triggered_at.isoformat() if a.triggered_at else None,
    )


class AlertsController:
    async def list_alerts(
        self,
        session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ) -> list[AlertResponse]:
        repo = PostgresPriceAlertRepository(session)
        alerts = await repo.find_by_user(current_user.id)
        return [_alert_to_response(a) for a in alerts]

    async def create_alert(
        self,
        body: CreateAlertRequest,
        session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ) -> AlertResponse:
        use_case = CreateAlert(PostgresPriceAlertRepository(session))
        try:
            alert = await use_case.execute(CreateAlertDTO(
                user_id=current_user.id,
                asset_symbol=body.asset_symbol,
                threshold_usd=body.threshold_usd,
                direction=body.direction,
                note=body.note,
            ))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        return _alert_to_response(alert)

    async def delete_alert(
        self,
        alert_id: str,
        session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ) -> dict:
        await DeleteAlert(PostgresPriceAlertRepository(session)).execute(alert_id, current_user.id)
        return {"ok": True}

    async def subscribe_push(
        self,
        body: PushSubscribeRequest,
        session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ) -> dict:
        from domain.entities.push_subscription import PushSubscription

        sub = PushSubscription(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            endpoint=body.endpoint,
            p256dh=body.p256dh,
            auth=body.auth,
            created_at=datetime.now(timezone.utc),
        )
        await PostgresPushSubscriptionRepository(session).save(sub)
        return {"ok": True}

    async def unsubscribe_push(
        self,
        body: PushSubscribeRequest,
        session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ) -> dict:
        await PostgresPushSubscriptionRepository(session).delete(body.endpoint, current_user.id)
        return {"ok": True}
