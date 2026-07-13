from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from application.dtos.portfolio.portfolio_history_dto import PortfolioHistoryDTO
from application.dtos.portfolio.portfolio_summary_dto import PortfolioSummaryDTO
from application.dtos.portfolio.provider_performance_dto import ProviderPerformanceResponseDTO
from domain.entities.user import User
from interfaces.http.controllers.dashboard_controller import DashboardController
from interfaces.http.dependencies.get_current_user import get_current_user

# Endpoints del dashboard financiero del usuario. Todos requieren autenticación.
# Agrupa portfolio, historial, allocación, ROI, benchmark, performance por provider y exportación CSV.
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# Endpoint para obtener el portfolio agregado del usuario (todos sus proveedores sumados)
@router.get("/", response_model=PortfolioSummaryDTO)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    controller: DashboardController = Depends(),
):
    return await controller.get_aggregated(user_id=current_user.id)


# Invalida la caché del portfolio y fuerza recarga de todos los proveedores
@router.post("/refresh", response_model=PortfolioSummaryDTO)
async def refresh_dashboard(
    current_user: User = Depends(get_current_user),
    controller: DashboardController = Depends(),
):
    """Invalida la caché y fuerza recarga de todos los providers."""
    return await controller.refresh(user_id=current_user.id)


# Historial de snapshots del portfolio. Acepta rango de fechas (default: últimos 30 días)
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
    def _naive_utc(dt: datetime) -> datetime:
        """Los snapshots se guardan como TIMESTAMP naive en UTC; los clientes
        mandan ISO con zona (Z) — normalizamos a naive UTC para asyncpg."""
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start = _naive_utc(from_date) if from_date else (now - timedelta(days=30))
    end = _naive_utc(to_date) if to_date else now
    return await controller.get_history(user_id=current_user.id, start=start, end=end)


# Distribución del portfolio por categoría (cripto, acciones, efectivo, etc.)
@router.get("/allocation")
async def get_allocation(
    current_user: User = Depends(get_current_user),
    controller: DashboardController = Depends(),
):
    return await controller.get_allocation(user_id=current_user.id)


# Retorno sobre la inversión (ROI) del usuario comparado contra snapshots históricos
@router.get("/roi")
async def get_roi(
    current_user: User = Depends(get_current_user),
    controller: DashboardController = Depends(),
):
    return await controller.get_roi(user_id=current_user.id)


# Comparación del portfolio del usuario contra un activo de referencia (BTC o ETH por defecto)
@router.get("/benchmark")
async def get_benchmark(
    asset: str = Query(default="BTC", description="Activo de referencia: BTC o ETH"),
    period: str = Query(default="30d", description="Período: 7d, 30d, 90d"),
    current_user: User = Depends(get_current_user),
    controller: DashboardController = Depends(),
):
    return await controller.get_benchmark(user_id=current_user.id, asset=asset, period=period)


# Rendimiento histórico por proveedor (Binance, IOL, Manual, etc.) con gráfico de evolución
@router.get("/performance", response_model=ProviderPerformanceResponseDTO)
async def get_provider_performance(
    days: int = Query(default=30, ge=1, le=365, description="Período en días: 7, 30, 90, 365"),
    current_user: User = Depends(get_current_user),
    controller: DashboardController = Depends(),
):
    """Rendimiento histórico por provider con gráficos de evolución."""
    return await controller.get_provider_performance(user_id=current_user.id, days=days)


# Exporta el historial del portfolio como archivo CSV descargable
@router.get("/export")
async def export_csv(
    days: int = Query(default=365, ge=1, le=1825, description="Días de historial a exportar"),
    current_user: User = Depends(get_current_user),
    controller: DashboardController = Depends(),
):
    csv_content = await controller.export_csv(user_id=current_user.id, days=days)
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=portfolio_history.csv"},
    )
