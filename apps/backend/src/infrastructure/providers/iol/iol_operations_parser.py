"""
Parser del export "Operaciones Finalizadas" de InvertirOnline (IOL).

El archivo se descarga con extensión .xls pero en realidad es una **tabla HTML**.
Contiene el historial de operaciones (Compra/Venta), no una foto de la cartera.

De ese historial derivamos la **tenencia neta actual por símbolo**:
    neto = Σ Compra − Σ Venta   (se descartan los símbolos con neto ≤ 0)

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
    symbol: str
    name: str
    amount: float          # tenencia neta (compras − ventas)
    category: str          # cedear | stock | bond
    price_ars: float       # último precio ponderado en ARS (fallback)


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
    if i_tipo is None or i_sym is None or i_qty is None:
        raise ValueError("Faltan columnas obligatorias (Tipo Transacción, Simbolo, Cantidad).")

    # Acumular neto por símbolo.
    acc: dict[str, dict] = {}
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
        price_ars = _to_float(cells[i_price]) if i_price is not None and len(cells) > i_price else 0.0

        entry = acc.setdefault(symbol, {"amount": 0.0, "name": name, "price_ars": 0.0})
        entry["amount"] += signed
        if name and len(name) > len(entry["name"]):
            entry["name"] = name
        if price_ars:
            entry["price_ars"] = price_ars  # último precio visto

    holdings: list[ParsedHolding] = []
    for symbol, e in acc.items():
        if e["amount"] <= 1e-9:
            continue
        holdings.append(ParsedHolding(
            symbol=symbol,
            name=e["name"] or symbol,
            amount=round(e["amount"], 6),
            category=_category(e["name"]),
            price_ars=e["price_ars"],
        ))
    return holdings
