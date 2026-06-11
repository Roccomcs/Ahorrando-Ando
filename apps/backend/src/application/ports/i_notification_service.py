from abc import ABC, abstractmethod


class INotificationService(ABC):
    @abstractmethod
    async def send_alert_triggered(
        self,
        user_email: str,
        asset_symbol: str,
        threshold_usd: float,
        current_price: float,
        direction: str,
    ) -> None: ...

    @abstractmethod
    async def send_weekly_summary(
        self,
        user_email: str,
        total_usd: float,
        change_pct_7d: float | None,
        top_assets: list[dict],
    ) -> None: ...
