import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from domain.entities.price_alert import AlertDirection, PriceAlert
from domain.repositories.i_price_alert_repository import IPriceAlertRepository


@dataclass
class CreateAlertDTO:
    user_id: str
    asset_symbol: str
    threshold_usd: float
    direction: str
    note: str | None = None


MAX_ALERTS_PER_USER = 50


class CreateAlert:
    def __init__(self, repo: IPriceAlertRepository) -> None:
        self._repo = repo

    async def execute(self, dto: CreateAlertDTO) -> PriceAlert:
        if dto.threshold_usd <= 0:
            raise ValueError("El umbral debe ser mayor a cero")
        if dto.direction not in (AlertDirection.ABOVE, AlertDirection.BELOW):
            raise ValueError("direction debe ser 'above' o 'below'")

        existing = await self._repo.find_by_user(dto.user_id)
        active = [a for a in existing if a.is_active and not a.triggered_at]
        if len(active) >= MAX_ALERTS_PER_USER:
            raise ValueError(f"Límite de {MAX_ALERTS_PER_USER} alertas activas por usuario alcanzado")

        alert = PriceAlert(
            id=str(uuid.uuid4()),
            user_id=dto.user_id,
            asset_symbol=dto.asset_symbol.upper(),
            threshold_usd=dto.threshold_usd,
            direction=AlertDirection(dto.direction),
            is_active=True,
            created_at=datetime.now(timezone.utc),
            note=dto.note,
        )
        return await self._repo.save(alert)
