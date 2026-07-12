"""Serie histórica de precios para acciones y CEDEARs vía Stooq (gratis, sin API key).

Stooq expone un CSV diario por ticker: `https://stooq.com/q/d/l/?s=aapl.us&i=d`.
La mayoría de los CEDEARs argentinos representan acciones de EE.UU. (AAPL, AMZN,
AMD…), así que probamos primero el mercado `.us` y, si no hay datos, el `.ar`.
Es "como se pueda": si el ticker no matchea en ninguno, devolvemos serie vacía.
"""

import csv
import io
from datetime import datetime, timezone

import httpx

_BASE = "https://stooq.com/q/d/l/"


class StooqPriceService:
    async def market_chart(self, symbol: str, days: int = 30) -> list[dict]:
        """Devuelve [{"t": epoch_ms, "price_usd": float}, …] (últimos `days`)."""
        sym = (symbol or "").strip().lower()
        if not sym:
            return []
        for suffix in ("us", "ar"):
            rows = await self._fetch(f"{sym}.{suffix}")
            if rows:
                return rows[-days:] if days and days < len(rows) else rows
        return []

    @staticmethod
    async def _fetch(ticker: str) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
                resp = await client.get(_BASE, params={"s": ticker, "i": "d"})
                resp.raise_for_status()
                text = resp.text
        except Exception:
            return []
        # Respuesta de "no encontrado": una sola línea con encabezado o "N/D".
        out: list[dict] = []
        for row in csv.DictReader(io.StringIO(text)):
            date_str = row.get("Date") or ""
            close = row.get("Close") or ""
            if not date_str or not close or close in ("N/D", "null"):
                continue
            try:
                d = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                out.append({"t": int(d.timestamp() * 1000), "price_usd": float(close)})
            except (TypeError, ValueError):
                continue
        return out
