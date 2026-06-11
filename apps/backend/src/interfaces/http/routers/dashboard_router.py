from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query

from application.dtos.portfolio.portfolio_history_dto import PortfolioHistoryDTO
from application.dtos.portfolio.portfolio_summary_dto import PortfolioSummaryDTO
from domain.entities.user import User
from interfaces.http.controllers.dashboard_controller import DashboardController
from interfaces.http.dependencies.get_current_user import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=PortfolioSummaryDTO)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    controller: DashboardController = Depends(),
):
    return await controller.get_aggregated(user_id=current_user.id)


@router.post("/refresh", response_model=PortfolioSummaryDTO)
async def refresh_dashboard(
    current_user: User = Depends(get_current_user),
    controller: DashboardController = Depends(),
):
    """Invalida la caché y fuerza recarga de todos los providers."""
    return await controller.refresh(user_id=current_user.id)


@router.get("/history", response_model=PortfolioHistoryDTO)
async def get_history(
    current_user: User = Depends(get_current_user),
    controller: DashboardController = Depends(),
    from_date: datetime = Query(
        default=None,
        alias="from",
        description="Fecha de inicio (ISO 8601). Default: 30 días atrás.",
    ),
    to_date: datetime = Query(
        default=None,
        alias="to",
        description="Fecha de fin (ISO 8601). Default: ahora.",
    ),
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start = from_date or (now - timedelta(days=30))
    end = to_date or now
    return await controller.get_history(user_id=current_user.id, start=start, end=end)
