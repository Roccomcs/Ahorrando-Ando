from fastapi import APIRouter, Depends, Query

from application.dtos.asset.asset_search_result_dto import AssetSearchResultDTO
from interfaces.http.controllers.assets_controller import AssetsController
from interfaces.http.dependencies.get_current_user import get_current_user

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("/search", response_model=list[AssetSearchResultDTO])
async def search_assets(
    q: str = Query(..., min_length=1, description="Texto a buscar (símbolo o nombre)"),
    current_user=Depends(get_current_user),
    controller: AssetsController = Depends(),
):
    return await controller.search_assets(query=q)


@router.get("/quote")
async def quote_asset(
    category: str = Query(..., description="crypto | stock | cedear | bond | fx"),
    ref: str = Query(..., description="Identificador para cotizar (coingecko_id o símbolo)"),
    current_user=Depends(get_current_user),
    controller: AssetsController = Depends(),
):
    return await controller.quote_asset(category=category, ref=ref)


@router.get("/history")
async def asset_history(
    category: str = Query(..., description="crypto | stock | cedear | bond | fx"),
    ref: str = Query(..., description="Identificador (coingecko_id o símbolo)"),
    days: int = Query(30, ge=1, le=365, description="Ventana en días"),
    current_user=Depends(get_current_user),
    controller: AssetsController = Depends(),
):
    """Serie histórica de precios USD del activo (cripto vía CoinGecko)."""
    return await controller.asset_history(category=category, ref=ref, days=days)


@router.get("/logo")
async def asset_logo(
    symbol: str = Query(..., min_length=1, max_length=20),
    category: str = Query(..., description="crypto | stock | cedear | bond | fx"),
    current_user=Depends(get_current_user),
    controller: AssetsController = Depends(),
):
    """Logo del activo. Se resuelve fuera del portfolio para no bloquearlo."""
    return await controller.asset_logo(symbol=symbol, category=category)
