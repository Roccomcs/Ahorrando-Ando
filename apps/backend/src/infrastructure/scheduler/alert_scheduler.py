import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from infrastructure.database.postgres.connection import AsyncSessionFactory
from infrastructure.notifications.resend_notification_service import ResendNotificationService
from infrastructure.notifications.web_push_service import WebPushService

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _run_check_alerts() -> None:
    from application.use_cases.alerts.check_alerts import CheckAlerts
    from infrastructure.database.postgres.repositories.postgres_price_alert_repository import PostgresPriceAlertRepository
    from infrastructure.database.postgres.repositories.postgres_push_subscription_repository import PostgresPushSubscriptionRepository
    from infrastructure.database.postgres.repositories.postgres_user_repository import PostgresUserRepository

    try:
        async with AsyncSessionFactory() as session:
            triggered = await CheckAlerts(
                alert_repo=PostgresPriceAlertRepository(session),
                user_repo=PostgresUserRepository(session),
                push_sub_repo=PostgresPushSubscriptionRepository(session),
                notification_service=ResendNotificationService(),
                push_service=WebPushService(),
            ).execute()
        if triggered:
            logger.info("CheckAlerts: %d alertas disparadas", triggered)
    except Exception:
        logger.exception("Error en job check_alerts")


async def _run_weekly_summary() -> None:
    from application.use_cases.alerts.weekly_summary import SendWeeklySummary
    from infrastructure.database.postgres.repositories.postgres_portfolio_snapshot_repository import PostgresPortfolioSnapshotRepository
    from infrastructure.database.postgres.repositories.postgres_user_repository import PostgresUserRepository

    try:
        async with AsyncSessionFactory() as session:
            sent = await SendWeeklySummary(
                user_repo=PostgresUserRepository(session),
                snapshot_repo=PostgresPortfolioSnapshotRepository(session),
                notification_svc=ResendNotificationService(),
            ).execute()
        logger.info("WeeklySummary: %d emails enviados", sent)
    except Exception:
        logger.exception("Error en job weekly_summary")


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(_run_check_alerts, IntervalTrigger(minutes=5), id="check_alerts", replace_existing=True)
    _scheduler.add_job(
        _run_weekly_summary,
        CronTrigger(day_of_week="mon", hour=9, minute=0),
        id="weekly_summary",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Scheduler iniciado (check_alerts cada 5min, weekly_summary lunes 9am)")
    return _scheduler


def stop_scheduler() -> None:
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
