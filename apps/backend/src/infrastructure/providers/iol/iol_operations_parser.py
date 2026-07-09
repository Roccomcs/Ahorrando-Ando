"""
Parser del export "Operaciones Finalizadas" de InvertirOnline (IOL).

El archivo se descarga con extensión .xls pero en realidad es una **tabla HTML**.
Contiene el historial de operaciones (Compra/Venta), no una foto de la cartera.

De ese historial derivamos la **tenencia neta actual por instrumento**:
    neto = Σ Compra − Σ Venta   (se descartan los instrumentos con neto ≤ 0)

Clave: en Argentina el mismo instrumento cotiza con distintos **tickers de
liquidación**:
    GD30  → pesos             AMZN  → CEDEAR en pesos
    GD30D → dólar MEP (D)     AMZND → CEDEAR en dólares (D)
    GD30C → dólar cable (C)   AMZNC → CEDEAR cable (C)
Son el MISMO activo. Si comprás GD30 y vendés GD30D, la tenencia neta es 0. Por
eso neteamos por **símbolo base** (sin el sufijo C/D) y recién ahí decidimos qué
queda.

Columnas esperadas (detectadas por nombre en la fila de encabezado):
    Fecha Transacción, Fecha Liquidación, Boleto, Mercado, Tipo Transacción,
    Numero de Cuenta, Descripción, Especie, Simbolo, Cantidad, Moneda,
    Precio Ponderado, Monto, Comisión..., Iva..., Total
"""

import html
import re
from dataclasses import dataclass

_ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S | re.I)
_CELL_RE = re.compile(r"<t[dh][^>]*>(.*?)</t[dh]>", re.S | re.I)
_TAG_RE = re.compile(r"<[^>]+>")


@dataclass
class ParsedHolding:
    symbol: str            # ticker que se muestra (la variante que realmente tenés)
    ref: str               # símbolo base en pesos (para cotizar en vivo con data912)
    name: str              # descripción
    amount: float          # tenencia neta (compras − ventas, neteando variantes)
    category: str          # cedear | stock | bond
    price: float           # último precio ponderado de la variante (en su moneda)
    currency: str          # "ARS" | "USD" — moneda del `price`


def _clean(cell: str) -> str:
    return html.unescape(_TAG_RE.sub("", cell)).strip()


def _to_float(value: str) -> float:
    """Números al estilo AR: '1.234,56' → 1234.56 ; '1,0000' → 1.0."""
    v = value.strip().replace(" ", "")
    if not v:
        return 0.0
    if "." in v and "," in v:
        v = v.replace(".", "").replace(",", ".")
    elif "," in v:
        v = v.replace(",", ".")
    try:
        return float(v)
    except ValueError:
        return 0.0


def _norm(header: str) -> str:
    h = _clean(header).lower()
    for a, b in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u")):
        h = h.replace(a, b)
    return h


def _category(description: str) -> str:
    d = description.lower()
    if d.startswith("cedear"):
        return "cedear"
    if "bono" in d or "letra" in d or "boncer" in d or "bonar" in d or "obligacion" in d:
        return "bond"
    return "stock"


def _base_symbol(symbol: str) -> str:
    """Quita el sufijo de settlement C/D (dólar MEP / cable) para netear variantes.

    Solo se quita si el resto queda con ≥2 caracteres (GD30D→GD30, AMZND→AMZN,
    KOD→KO). Los tickers propios no terminan en C/D — es convención de settlement.
    """
    if len(symbol) >= 3 and symbol[-1] in ("C", "D"):
        return symbol[:-1]
    return symbol


def _currency(moneda: str) -> str:
    m = moneda.upper()
    return "USD" if ("US$" in m or "U$S" in m or "USD" in m) else "ARS"


def parse_operations(content: bytes) -> list[ParsedHolding]:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("No se pudo decodificar el archivo. Usá el export original de IOL.")

    rows = _ROW_RE.findall(text)
    if not rows:
        raise ValueError("El archivo no parece un export de operaciones de IOL.")

    # Ubicar la fila de encabezado (la que tiene 'Tipo Transacción' y 'Simbolo').
    header_idx = None
    headers: list[str] = []
    for i, row in enumerate(rows):
        cells = [_norm(c) for c in _CELL_RE.findall(row)]
        if "tipo transaccion" in cells and "simbolo" in cells:
            header_idx = i
            headers = cells
            break
    if header_idx is None:
        raise ValueError("No se encontró el encabezado esperado en el export de IOL.")

    col = {name: idx for idx, name in enumerate(headers)}
    i_tipo = col.get("tipo transaccion")
    i_desc = col.get("descripcion")
    i_sym = col.get("simbolo")
    i_qty = col.get("cantidad")
    i_price = col.get("precio ponderado")
    i_mon = col.get("moneda")
    if i_tipo is None or i_sym is None or i_qty is None:
        raise ValueError("Faltan columnas obligatorias (Tipo Transacción, Simbolo, Cantidad).")

    # Acumular por símbolo base, guardando el detalle por variante para poder
    # elegir después el ticker a mostrar y su último precio/moneda.
    bases: dict[str, dict] = {}
    for row in rows[header_idx + 1:]:
        cells = [_clean(c) for c in _CELL_RE.findall(row)]
        if len(cells) <= max(i_tipo, i_sym, i_qty):
            continue
        symbol = cells[i_sym].strip().upper()
        if not symbol:
            continue
        tipo = cells[i_tipo].strip().lower()
        qty = _to_float(cells[i_qty])
        if qty <= 0 or tipo not in ("compra", "venta"):
            continue
        signed = qty if tipo == "compra" else -qty
        name = cells[i_desc] if i_desc is not None and len(cells) > i_desc else symbol
        price = _to_float(cells[i_price]) if i_price is not None and len(cells) > i_price else 0.0
        currency = _currency(cells[i_mon]) if i_mon is not None and len(cells) > i_mon else "ARS"

        base = _base_symbol(symbol)
        b = bases.setdefault(base, {"net": 0.0, "name": name, "variants": {}})
        b["net"] += signed
        if name and len(name) > len(b["name"]):
            b["name"] = name
        v = b["variants"].setdefault(symbol, {"net": 0.0, "price": 0.0, "currency": currency})
        v["net"] += signed
        if price:
            v["price"] = price
            v["currency"] = currency

    holdings: list[ParsedHolding] = []
    for base, b in bases.items():
        if b["net"] <= 1e-6:
            continue
        # Ticker a mostrar: la variante con mayor neto propio positivo (la que tenés).
        display, vdata = max(
            b["variants"].items(),
            key=lambda kv: kv[1]["net"],
        )
        # Si esa variante no tiene precio, tomar cualquiera que sí lo tenga.
        if not vdata.get("price"):
            for _s, vd in b["variants"].items():
                if vd.get("price"):
                    vdata = vd
                    break
        holdings.append(ParsedHolding(
            symbol=display,
            ref=base,
            name=b["name"] or display,
            amount=round(b["net"], 6),
            category=_category(b["name"]),
            price=vdata.get("price", 0.0),
            currency=vdata.get("currency", "ARS"),
        ))
    return holdings
