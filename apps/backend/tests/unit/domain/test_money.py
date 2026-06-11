import pytest

from domain.value_objects.money import Currency, Money


def test_money_creation():
    m = Money(amount=100.0, currency=Currency.USD)
    assert m.amount == 100.0
    assert m.currency == Currency.USD


def test_money_negative_raises():
    with pytest.raises(ValueError, match="negativo"):
        Money(amount=-1.0, currency=Currency.USD)


def test_money_zero_is_valid():
    m = Money(amount=0.0, currency=Currency.USD)
    assert m.amount == 0.0


def test_money_to_usd():
    ars = Money(amount=1000.0, currency=Currency.ARS)
    usd = ars.to_usd(rate=0.001)
    assert usd.amount == pytest.approx(1.0)
    assert usd.currency == Currency.USD


def test_money_is_immutable():
    m = Money(amount=50.0, currency=Currency.USD)
    with pytest.raises(Exception):
        m.amount = 100.0  # frozen dataclass


def test_money_equality():
    a = Money(amount=10.0, currency=Currency.USD)
    b = Money(amount=10.0, currency=Currency.USD)
    assert a == b
