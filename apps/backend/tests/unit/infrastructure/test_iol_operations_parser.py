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
<tr><td>27/3/2023</td><td>29/3/2023</td><td>1</td><td>BCBA</td><td>Compra</td><td>1</td>
  <td>Cedear Amazon.Com, Inc</td><td>8468</td><td>AMZN</td><td>10,0000</td>
  <td>AR$</td><td>263,50</td><td>2635,00</td><td>1</td><td>1</td><td>2637</td></tr>
<tr><td>29/3/2023</td><td>31/3/2023</td><td>2</td><td>BCBA</td><td>Venta</td><td>1</td>
  <td>Cedear Amazon.Com, Inc</td><td>8468</td><td>AMZN</td><td>4,0000</td>
  <td>AR$</td><td>270,00</td><td>1080,00</td><td>1</td><td>1</td><td>1078</td></tr>
<tr><td>29/3/2023</td><td>31/3/2023</td><td>3</td><td>BCBA</td><td>Compra</td><td>1</td>
  <td>Bonos Rep. Arg. U$S Step Up</td><td>1</td><td>GD30</td><td>1.000,0000</td>
  <td>AR$</td><td>16.557,00</td><td>1</td><td>1</td><td>1</td><td>1</td></tr>
<tr><td>29/3/2023</td><td>31/3/2023</td><td>4</td><td>BCBA</td><td>Compra</td><td>1</td>
  <td>Galicia</td><td>1</td><td>GGAL</td><td>5,0000</td>
  <td>AR$</td><td>100,00</td><td>1</td><td>1</td><td>1</td><td>1</td></tr>
<tr><td>29/3/2023</td><td>31/3/2023</td><td>5</td><td>BCBA</td><td>Venta</td><td>1</td>
  <td>Galicia</td><td>1</td><td>GGAL</td><td>5,0000</td>
  <td>AR$</td><td>110,00</td><td>1</td><td>1</td><td>1</td><td>1</td></tr>
</table></body></html>
"""


def test_parse_derives_net_holdings():
    holdings = {h.symbol: h for h in parse_operations(_HTML.encode("utf-8"))}
    # AMZN: 10 compra - 4 venta = 6 neto
    assert holdings["AMZN"].amount == 6.0
    assert holdings["AMZN"].category == "cedear"
    # GD30: bono, 1000 neto, precio con separador de miles
    assert holdings["GD30"].amount == 1000.0
    assert holdings["GD30"].category == "bond"
    assert holdings["GD30"].price_ars == 16557.0
    # GGAL: 5 compra - 5 venta = 0 → excluido
    assert "GGAL" not in holdings


def test_parse_decodes_entities_in_name():
    holdings = {h.symbol: h for h in parse_operations(_HTML.encode("utf-8"))}
    assert "Amazon" in holdings["AMZN"].name


def test_parse_rejects_non_iol_file():
    import pytest
    with pytest.raises(ValueError):
        parse_operations(b"<html><body>algo</body></html>")
