import pytest

from infrastructure.providers.balanz.balanz_csv_parser import parse_csv


def _csv(rows: str) -> bytes:
    return rows.strip().encode("utf-8")


def test_parses_basic_csv():
    content = _csv("""
simbolo;cantidad;precio
BTC;0.5;65000
ETH;2;3500
""")
    positions = parse_csv(content)
    assert len(positions) == 2
    btc = next(p for p in positions if p.symbol == "BTC")
    assert btc.amount == 0.5
    assert btc.price_usd == 65000.0


def test_parses_comma_separated():
    content = _csv("symbol,amount,price\nSOL,10,150\n")
    positions = parse_csv(content)
    assert len(positions) == 1
    assert positions[0].symbol == "SOL"
    assert positions[0].amount == 10.0


def test_filters_zero_amounts():
    content = _csv("simbolo;cantidad;precio\nBTC;0;65000\nETH;1;3500\n")
    positions = parse_csv(content)
    assert len(positions) == 1
    assert positions[0].symbol == "ETH"


def test_parses_argentinian_number_format():
    content = _csv("simbolo;cantidad;precio\nYPFD;1.000;8,50\n")
    positions = parse_csv(content)
    assert positions[0].amount == 1000.0
    assert positions[0].price_usd == 8.5


def test_raises_on_missing_symbol_column():
    content = _csv("precio;cantidad\n65000;0.5\n")
    with pytest.raises(ValueError, match="columnas obligatorias"):
        parse_csv(content)


def test_derives_price_from_total():
    content = _csv("simbolo;cantidad;valuacion\nBTC;2;130000\n")
    positions = parse_csv(content)
    assert positions[0].price_usd == 65000.0


def test_uppercases_symbols():
    content = _csv("simbolo;cantidad;precio\nbtc;1;65000\n")
    positions = parse_csv(content)
    assert positions[0].symbol == "BTC"
