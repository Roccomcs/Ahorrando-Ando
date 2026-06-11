import pytest
from unittest.mock import AsyncMock, MagicMock

from application.use_cases.analytics.get_allocation import GetAllocation
from application.dtos.portfolio.portfolio_summary_dto import HoldingDTO, PortfolioSummaryDTO, ProviderSummaryDTO


def _make_portfolio_uc(summary: PortfolioSummaryDTO) -> MagicMock:
    uc = AsyncMock()
    uc.execute.return_value = summary
    return uc


def _holding(symbol: str, value: float) -> HoldingDTO:
    return HoldingDTO(
        asset_name=symbol,
        asset_symbol=symbol,
        amount=1.0,
        current_value_usd=value,
        performance_24h=0.0,
        performance_30d=0.0,
    )


@pytest.mark.asyncio
async def test_empty_portfolio_returns_empty_breakdown():
    summary = PortfolioSummaryDTO(total_usd=0.0, providers=[])
    uc = GetAllocation(_make_portfolio_uc(summary))
    result = await uc.execute("user-1")
    assert result["by_asset"] == []
    assert result["by_provider"] == []
    assert result["by_type"] == []


@pytest.mark.asyncio
async def test_allocation_by_asset_sums_across_providers():
    summary = PortfolioSummaryDTO(
        total_usd=1000.0,
        providers=[
            ProviderSummaryDTO(
                provider="binance",
                balance_usd=600.0,
                holdings=[_holding("BTC", 400.0), _holding("ETH", 200.0)],
                performance={},
            ),
            ProviderSummaryDTO(
                provider="lemoncash",
                balance_usd=400.0,
                holdings=[_holding("BTC", 400.0)],
                performance={},
            ),
        ],
    )
    uc = GetAllocation(_make_portfolio_uc(summary))
    result = await uc.execute("user-1")

    by_asset = {item["label"]: item for item in result["by_asset"]}
    assert by_asset["BTC"]["usd_value"] == pytest.approx(800.0)
    assert by_asset["BTC"]["percentage"] == pytest.approx(80.0)
    assert by_asset["ETH"]["usd_value"] == pytest.approx(200.0)


@pytest.mark.asyncio
async def test_allocation_by_provider():
    summary = PortfolioSummaryDTO(
        total_usd=1000.0,
        providers=[
            ProviderSummaryDTO(provider="binance", balance_usd=700.0, holdings=[_holding("BTC", 700.0)], performance={}),
            ProviderSummaryDTO(provider="iol", balance_usd=300.0, holdings=[_holding("GGAL", 300.0)], performance={}),
        ],
    )
    uc = GetAllocation(_make_portfolio_uc(summary))
    result = await uc.execute("user-1")

    by_provider = {item["label"]: item for item in result["by_provider"]}
    assert by_provider["binance"]["percentage"] == pytest.approx(70.0)
    assert by_provider["iol"]["percentage"] == pytest.approx(30.0)


@pytest.mark.asyncio
async def test_allocation_by_type_classifies_stocks_vs_crypto():
    summary = PortfolioSummaryDTO(
        total_usd=1000.0,
        providers=[
            ProviderSummaryDTO(provider="binance", balance_usd=600.0, holdings=[_holding("BTC", 600.0)], performance={}),
            ProviderSummaryDTO(provider="iol", balance_usd=400.0, holdings=[_holding("GGAL", 400.0)], performance={}),
        ],
    )
    uc = GetAllocation(_make_portfolio_uc(summary))
    result = await uc.execute("user-1")

    by_type = {item["label"]: item for item in result["by_type"]}
    assert by_type["crypto"]["percentage"] == pytest.approx(60.0)
    assert by_type["stocks"]["percentage"] == pytest.approx(40.0)


@pytest.mark.asyncio
async def test_fiat_classified_separately():
    summary = PortfolioSummaryDTO(
        total_usd=1000.0,
        providers=[
            ProviderSummaryDTO(
                provider="binance",
                balance_usd=1000.0,
                holdings=[_holding("BTC", 500.0), _holding("USDT", 500.0)],
                performance={},
            ),
        ],
    )
    uc = GetAllocation(_make_portfolio_uc(summary))
    result = await uc.execute("user-1")

    by_type = {item["label"]: item for item in result["by_type"]}
    assert by_type["fiat"]["usd_value"] == pytest.approx(500.0)
    assert by_type["crypto"]["usd_value"] == pytest.approx(500.0)
