"""
Parser de CSV exportados desde Balanz y otros brokers argentinos.

Formato esperado (flexible — detecta columnas por nombre):
  Especie/Símbolo, Cantidad/Tenencia, Precio/Cotización, Valuación (opcional)

Acepta separadores ; o , y encoding UTF-8 o latin-1.

Ejemplo de columnas aceptadas:
  simbolo, especie, ticker      → asset_symbol
  nombre, descripcion           → asset_name (opcional)
  cantidad, tenencia, unidades  → amount
  precio, cotizacion, px        → price_usd (precio de costo o mercado)
  valuacion, valor              → total_usd (alternativa al precio * cantidad)
"""

import csv
import io
from dataclasses import dataclass


@dataclass
class ParsedPosition:
    symbol: str
    name: str
    amount: float
    price_usd: float   # precio unitario en USD (o ARS si no se pudo convertir)
    is_ars: bool = False  # True si el precio está en ARS y no pudimos convertir


_SYMBOL_COLS = {"simbolo", "especie", "ticker", "symbol", "instrumento", "activo"}
_NAME_COLS = {"nombre", "descripcion", "description", "name", "especie"}
_AMOUNT_COLS = {"cantidad", "tenencia", "unidades", "amount", "quantity", "nominal"}
_PRICE_COLS = {"precio", "cotizacion", "px", "price", "valor_unitario", "precio_mercado"}
_TOTAL_COLS = {"valuacion", "valor", "total", "importe", "monto", "valorusd", "valortotal"}


def _normalize(header: str) -> str:
    return (
        header.lower()
        .strip()
        .replace(" ", "_")
        .replace(".", "")
        .replace("(", "")
        .replace(")", "")
        .replace("/", "_")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("é", "e")
        .replace("á", "a")
        .replace("í", "i")
    )


def _find_col(headers: list[str], candidates: set[str]) -> int | None:
    for i, h in enumerate(headers):
        if _normalize(h) in candidates:
            return i
    return None


def _parse_number(value: str, csv_sep: str = ",") -> float:
    """
    Parsea números respetando el formato del CSV:
      - csv_sep=";" → formato europeo/argentino (coma=decimal, punto=miles cuando aplica)
      - csv_sep="," → formato inglés (punto=decimal, coma=miles)

    Reglas para sep=";":
      - "0.5"        → decimal (dot sigue siendo decimal si no hay patrón \d{1,3}\.\d{3})
      - "1.000"      → miles (exactamente \d{1,3}\.\d{3})
      - "8,50"       → decimal (coma es decimal)
      - "1.234.567"  → miles múltiples
      - "1.234,89"   → ambos: punto=miles, coma=decimal
    """
    import re
    v = value.strip().replace(" ", "").replace("$", "").replace("US$", "").replace("USD", "")
    if csv_sep == ";":
        if "." in v and "," in v:
            v = v.replace(".", "").replace(",", ".")
        elif "," in v:
            v = v.replace(",", ".")
        elif re.match(r"^\d{1,3}(\.\d{3})+$", v):
            v = v.replace(".", "")
        # else: dot is decimal, leave as-is
    else:
        v = v.replace(",", "")
    try:
        return float(v)
    except ValueError:
        return 0.0


def parse_csv(content: bytes) -> list[ParsedPosition]:
    # Intentar decodificar: UTF-8 primero, luego latin-1
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("No se pudo decodificar el CSV. Usar UTF-8 o latin-1.")

    # Detectar separador
    sample = text[:2000]
    sep = ";" if sample.count(";") > sample.count(",") else ","

    reader = csv.reader(io.StringIO(text), delimiter=sep)
    rows = list(reader)

    if not rows:
        raise ValueError("El archivo CSV está vacío.")

    headers = rows[0]
    sym_i = _find_col(headers, _SYMBOL_COLS)
    name_i = _find_col(headers, _NAME_COLS)
    amt_i = _find_col(headers, _AMOUNT_COLS)
    px_i = _find_col(headers, _PRICE_COLS)
    total_i = _find_col(headers, _TOTAL_COLS)

    if sym_i is None or amt_i is None:
        raise ValueError(
            f"No se encontraron columnas obligatorias (símbolo, cantidad). "
            f"Columnas detectadas: {headers}"
        )

    positions: list[ParsedPosition] = []
    for row in rows[1:]:
        if not row or not any(row):
            continue
        symbol = row[sym_i].strip().upper() if len(row) > sym_i else ""
        if not symbol:
            continue

        name = row[name_i].strip() if name_i is not None and len(row) > name_i else symbol
        amount = _parse_number(row[amt_i], sep) if len(row) > amt_i else 0.0

        if amount <= 0:
            continue

        # Intentar obtener precio unitario
        price_usd = 0.0
        is_ars = False
        if px_i is not None and len(row) > px_i:
            price_usd = _parse_number(row[px_i], sep)
        elif total_i is not None and len(row) > total_i and amount > 0:
            total = _parse_number(row[total_i], sep)
            price_usd = total / amount if amount else 0.0

        positions.append(ParsedPosition(
            symbol=symbol,
            name=name or symbol,
            amount=amount,
            price_usd=price_usd,
            is_ars=is_ars,
        ))

    return positions
