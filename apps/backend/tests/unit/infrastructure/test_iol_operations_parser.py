from infrastructure.providers.iol.iol_operations_parser import parse_operations

_HTML = """
<html><body>
<table border="1">
<tr><td colspan="16">Operaciones finalizadas en el periodo 30/10/2019 hasta 10/7/2026</td></tr>
<tr>
  <td>Fecha Transacci&oacute;n</td><td>Fecha Liquidaci&oacute;n</td><td>Boleto</td>
  <td>Mercado</td><td>Tipo Transacci&oacute;n</td><td>Numero de Cuenta</td>
  <td>Descripci&oacute;n</td><td>Especie</td><td>Simbolo</td><td>Cantidad</td>
  <td>Moneda</td><td>Precio Ponderado</td><td>Monto</td>
  <td>Comisi&oacute;n</td><td>Iva</td><td>Total</td>
</tr>
<!-- GD30: comprado en pesos, vendido en dolares (GD30D) -> neto 0, no aparece -->
<tr><td>1</td><td>1</td><td>1</td><td>BCBA</td><td>Compra</td><td>1</td>
  <td>Bonos Rep. Arg. U$S Step Up</td><td>1</td><td>GD30</td><td>1.000,0000</td>
  <td>AR$</td><td>11.700,00</td><td>1</td><td>1</td><td>1</td><td>1</td></tr>
<tr><td>2</td><td>2</td><td>2</td><td>BCBA</td><td>Venta</td><td>1</td>
  <td>Bonos Rep. Arg. U$S Step Up</td><td>1</td><td>GD30D</td><td>1.000,0000</td>
  <td>US$</td><td>28,50</td><td>1</td><td>1</td><td>1</td><td>1</td></tr>
<!-- AMZND: comprado en dolares y nunca vendido -> sobrevive con ticker AMZND, ref AMZN -->
<tr><td>3</td><td>3</td><td>3</td><td>BCBA</td><td>Compra</td><td>1</td>
  <td>Cedear Amazon.Com, Inc</td><td>1</td><td>AMZND</td><td>5,0000</td>
  <td>US$</td><td>2,10</td><td>1</td><td>1</td><td>1</td><td>1</td></tr>
<!-- IRSA: accion en pesos, 4 netas -->
<tr><td>4</td><td>4</td><td>4</td><td>BCBA</td><td>Compra</td><td>1</td>
  <td>Irsa</td><td>1</td><td>IRSA</td><td>4,0000</td>
  <td>AR$</td><td>412,10</td><td>1</td><td>1</td><td>1</td><td>1</td></tr>
</table></body></html>
"""


def test_nets_settlement_variants_to_zero():
    """GD30 (compra pesos) + GD30D (venta dolar) = mismo bono, neto 0 → excluido."""
    holdings = {h.symbol: h for h in parse_operations(_HTML.encode("utf-8"))}
    assert "GD30" not in holdings
    assert "GD30D" not in holdings


def test_dollar_variant_survives_with_its_ticker_and_base_ref():
    holdings = {h.symbol: h for h in parse_operations(_HTML.encode("utf-8"))}
    amzn = holdings["AMZND"]
    assert amzn.amount == 5.0
    assert amzn.ref == "AMZN"          # base en pesos para cotizar con data912
    assert amzn.category == "cedear"
    assert amzn.currency == "USD"      # precio en dolares → sin convertir
    assert amzn.price == 2.10


def test_plain_stock_kept():
    holdings = {h.symbol: h for h in parse_operations(_HTML.encode("utf-8"))}
    assert holdings["IRSA"].amount == 4.0
    assert holdings["IRSA"].ref == "IRSA"
    assert holdings["IRSA"].currency == "ARS"


def test_parse_rejects_non_iol_file():
    import pytest
    with pytest.raises(ValueError):
        parse_operations(b"<html><body>algo</body></html>")
