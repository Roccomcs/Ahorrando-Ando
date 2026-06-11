from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from domain.value_objects.percentage import Percentage


def _make_holding(**kwargs) -> Holding:
    defaults = dict(
        asset_name="Bitcoin",
        asset_symbol="BTC",
        amount=0.5,
        current_value=Money(amount=15000.0, currency=Currency.USD),
        performance_24h=Percentage(2.5),
        performance_30d=Percentage(-5.0),
    )
    return Holding(**{**defaults, **kwargs})


def test_holding_creation():
    h = _make_holding()
    assert h.asset_symbol == "BTC"
    assert h.amount == 0.5
    assert h.current_value.amount == 15000.0


def test_holding_is_immutable():
    import pytest
    h = _make_holding()
    with pytest.raises(Exception):
        h.amount = 1.0


def test_holding_zero_amount():
    h = _make_holding(amount=0.0)
    assert h.amount == 0.0


def test_holding_equality():
    h1 = _make_holding()
    h2 = _make_holding()
    assert h1 == h2
