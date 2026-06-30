from datetime import datetime

from pydantic import BaseModel


class PortfolioHistoryPointDTO(BaseModel):
    snapshot_at: datetime
    total_usd: float


class PortfolioHistoryDTO(BaseModel):
    points: list[PortfolioHistoryPointDTO]
    usd_to_ars: float | None = None
    change_pct_24h: float | None = None
    change_pct_30d: float | None = None
