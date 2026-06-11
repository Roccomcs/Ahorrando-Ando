import pytest

from infrastructure.providers.manual.manual_provider import ManualProvider


@pytest.mark.asyncio
async def test_returns_configured_holdings():
    provider = ManualProvider(
        institution_name="Cocos Capital",
        holdings=[
            {"symbol": "USD", "name": "Dólar MEP", "amount": 1000, "price_usd": 1.0},
            {"symbol": "FCI", "name": "FCI Ahorro", "amount": 1, "price_usd": 5000.0},
        ],
    )
    holdings = await provider.get_holdings()
    assert len(holdings) == 2
    assert holdings[0].asset_symbol == "USD"
    assert holdings[1].current_value.amount == 5000.0


@pytest.mark.asyncio
async def test_filters_zero_amount():
    provider = ManualProvider(
        institution_name="Test",
        holdings=[
            {"symbol": "USD", "name": "USD", "amount": 0, "price_usd": 1.0},
            {"symbol": "BTC", "name": "Bitcoin", "amount": 1, "price_usd": 65000.0},
        ],
    )
    holdings = await provider.get_holdings()
    assert len(holdings) == 1
    assert holdings[0].asset_symbol == "BTC"


@pytest.mark.asyncio
async def test_name_and_type():
    provider = ManualProvider(institution_name="Naranja X", holdings=[])
    assert provider.name == "Naranja X"
    assert provider.provider_type == "manual"


@pytest.mark.asyncio
async def test_authenticate_true_with_name():
    provider = ManualProvider(institution_name="Naranja X", holdings=[])
    assert await provider.authenticate() is True
