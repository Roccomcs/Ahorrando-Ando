import pytest

from domain.value_objects.percentage import Percentage


def test_percentage_valid():
    p = Percentage(value=50.0)
    assert p.value == 50.0


def test_percentage_zero():
    p = Percentage(value=0.0)
    assert p.value == 0.0


def test_percentage_negative_valid():
    p = Percentage(value=-10.5)
    assert p.value == -10.5


def test_percentage_out_of_range_positive():
    with pytest.raises(ValueError):
        Percentage(value=101.0)


def test_percentage_out_of_range_negative():
    with pytest.raises(ValueError):
        Percentage(value=-101.0)


def test_percentage_boundary_values():
    assert Percentage(value=100.0).value == 100.0
    assert Percentage(value=-100.0).value == -100.0


def test_percentage_is_immutable():
    p = Percentage(value=10.0)
    with pytest.raises(Exception):
        p.value = 20.0
