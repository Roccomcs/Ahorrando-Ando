"""Serie histórica de precios para acciones y CEDEARs vía Yahoo Finance (gratis, sin API key).

Yahoo expone un endpoint de gráfico JSON sin autenticación:
`https://query1.finance.yahoo.com/v8/finance/chart/AAPL?period1=..&period2=..&interval=1d`.

La mayoría de los CEDEARs argentinos representan acciones de EE.UU. (AAPL, AMZN,
AMD…), así que el símbolo directo devuelve el precio en USD, que es lo que necesita
el gráfico. Si el ticker no matchea, devolvemos serie vacía ("como se pueda").
"""

import time

import httpx

_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/"
_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AhorrandoAndo/1.0)"}


class YahooPriceService:
    async def market_chart(self, symbol: str, days: int = 30) -> list[dict]:
        """Devuelve [{"t": epoch_ms, "price_usd": float}, …] de los últimos `days`."""
        sym = (symbol or "").strip().upper()
        if not sym:
            return []
        now = int(time.time())
        # Un colchón extra cubre fines de semana/feriados sin datos.
        period1 = now - (days + 5) * 86400
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0), headers=_HEADERS) as client:
                resp = await client.get(
                    f"{_BASE}{sym}",
                    params={"period1": period1, "period2": now, "interval": "1d"},
                )
                resp.raise_for_status()
                data = resp.json()
        except Exception:
            return []
        try:
            result = data["chart"]["result"][0]
            timestamps = result["timestamp"]
            closes = result["indicators"]["quote"][0]["close"]
        except (KeyError, IndexError, TypeError):
            return []
        out: list[dict] = []
        for ts, close in zip(timestamps, closes):
            if close is None:
                continue
            try:
                out.append({"t": int(ts) * 1000, "price_usd": float(close)})
            except (TypeError, ValueError):
                continue
        return out[-days:] if days and days < len(out) else out
