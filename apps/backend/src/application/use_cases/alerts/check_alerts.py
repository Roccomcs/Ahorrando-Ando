import logging

from application.ports.i_notification_service import INotificationService
from application.ports.i_push_service import IPushService
from domain.entities.price_alert import AlertDirection
from domain.repositories.i_price_alert_repository import IPriceAlertRepository
from domain.repositories.i_push_subscription_repository import IPushSubscriptionRepository
from domain.repositories.i_user_repository import IUserRepository
from infrastructure.prices.coingecko_price_service import CoinGeckoPriceService

logger = logging.getLogger(__name__)

SYMBOL_TO_COINGECKO: dict[str, str] = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "USDT": "tether",
    "USDC": "usd-coin",
    "BNB": "binancecoin",
    "SOL": "solana",
    "ADA": "cardano",
    "MATIC": "matic-network",
    "DOT": "polkadot",
    "AVAX": "avalanche-2",
    "LINK": "chainlink",
    "LTC": "litecoin",
    "XRP": "ripple",
    "DOGE": "dogecoin",
}


class CheckAlerts:
    def __init__(
        self,
        alert_repo: IPriceAlertRepository,
        user_repo: IUserRepository,
        push_sub_repo: IPushSubscriptionRepository,
        notification_service: INotificationService,
        push_service: IPushService,
    ) -> None:
        self._alert_repo = alert_repo
        self._user_repo = user_repo
        self._push_sub_repo = push_sub_repo
        self._notification_svc = notification_service
        self._push_svc = push_service
        self._price_svc = CoinGeckoPriceService()

    async def execute(self) -> int:
        alerts = await self._alert_repo.find_active()
        if not alerts:
            return 0

        symbols = {a.asset_symbol for a in alerts}
        coingecko_ids = {SYMBOL_TO_COINGECKO[s] for s in symbols if s in SYMBOL_TO_COINGECKO}
        if not coingecko_ids:
            return 0

        prices_by_id = await self._price_svc.get_prices_usd(list(coingecko_ids))
        prices_by_symbol: dict[str, float] = {}
        for symbol, cg_id in SYMBOL_TO_COINGECKO.items():
            if symbol in symbols and cg_id in prices_by_id:
                prices_by_symbol[symbol] = prices_by_id[cg_id]

        triggered_count = 0
        for alert in alerts:
            current = prices_by_symbol.get(alert.asset_symbol)
            if current is None:
                continue

            fired = (
                alert.direction == AlertDirection.ABOVE and current >= alert.threshold_usd
                or alert.direction == AlertDirection.BELOW and current <= alert.threshold_usd
            )
            if not fired:
                continue

            try:
                await self._alert_repo.mark_triggered(alert.id)
                user = await self._user_repo.find_by_id(alert.user_id)
                if user:
                    await self._notification_svc.send_alert_triggered(
                        user_email=user.email,
                        asset_symbol=alert.asset_symbol,
                        threshold_usd=alert.threshold_usd,
                        current_price=current,
                        direction=alert.direction.value,
                    )
                    subs = await self._push_sub_repo.find_by_user(alert.user_id)
                    for sub in subs:
                        await self._push_svc.send(sub, {
                            "title": f"Alerta: {alert.asset_symbol}",
                            "body": f"{alert.asset_symbol} llegó a ${current:,.2f} USD",
                            "tag": f"alert-{alert.id}",
                        })
                triggered_count += 1
            except Exception:
                logger.exception("Error procesando alerta %s", alert.id)

        return triggered_count
