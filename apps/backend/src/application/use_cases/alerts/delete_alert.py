from domain.repositories.i_price_alert_repository import IPriceAlertRepository


class DeleteAlert:
    def __init__(self, repo: IPriceAlertRepository) -> None:
        self._repo = repo

    async def execute(self, alert_id: str, user_id: str) -> None:
        await self._repo.delete(alert_id, user_id)
