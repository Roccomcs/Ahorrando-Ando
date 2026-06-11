from pydantic import BaseModel


class ProviderPerformancePointDTO(BaseModel):
    date: str
    balance_usd: float


class ProviderPerformanceItemDTO(BaseModel):
    provider: str
    label: str
    current_usd: float
    change_pct_24h: float | None = None
    change_pct_7d: float | None = None
    change_pct_30d: float | None = None
    history: list[ProviderPerformancePointDTO] = []


class ProviderPerformanceResponseDTO(BaseModel):
    providers: list[ProviderPerformanceItemDTO]
