import logging
import os

import httpx

from application.ports.i_notification_service import INotificationService

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


class ResendNotificationService(INotificationService):
    def __init__(self) -> None:
        self._api_key = os.getenv("RESEND_API_KEY", "")
        self._from_email = os.getenv("NOTIFICATION_FROM_EMAIL", "alertas@ahorrandoando.app")
        self._enabled = bool(self._api_key)

    async def send_alert_triggered(
        self,
        user_email: str,
        asset_symbol: str,
        threshold_usd: float,
        current_price: float,
        direction: str,
    ) -> None:
        direction_text = "superó" if direction == "above" else "cayó por debajo de"
        subject = f"⚠️ Alerta: {asset_symbol} {direction_text} ${threshold_usd:,.2f}"
        html = f"""
        <h2>Tu alerta de precio se disparó</h2>
        <p><strong>{asset_symbol}</strong> {direction_text} el umbral de <strong>${threshold_usd:,.2f} USD</strong>.</p>
        <p>Precio actual: <strong>${current_price:,.2f} USD</strong></p>
        <p style="color:#888;font-size:12px">Esta alerta fue desactivada automáticamente.</p>
        """
        await self._send(user_email, subject, html)

    async def send_weekly_summary(
        self,
        user_email: str,
        total_usd: float,
        change_pct_7d: float | None,
        top_assets: list[dict],
    ) -> None:
        change_str = ""
        if change_pct_7d is not None:
            arrow = "📈" if change_pct_7d >= 0 else "📉"
            change_str = f"{arrow} {change_pct_7d:+.2f}% esta semana"

        assets_html = "".join(
            f"<li><strong>{a.get('asset_symbol', '?')}</strong>: ${a.get('current_value_usd', 0):,.2f}</li>"
            for a in top_assets
        )
        subject = f"📊 Tu resumen semanal — ${total_usd:,.2f} USD"
        html = f"""
        <h2>Resumen semanal de tu portfolio</h2>
        <p>Valor total: <strong>${total_usd:,.2f} USD</strong> {change_str}</p>
        {"<h3>Top activos</h3><ul>" + assets_html + "</ul>" if assets_html else ""}
        <p style="color:#888;font-size:12px">Ahorrando Ando — tu agregador financiero personal.</p>
        """
        await self._send(user_email, subject, html)

    async def _send(self, to: str, subject: str, html: str) -> None:
        if not self._enabled:
            logger.info("RESEND_API_KEY no configurada — email omitido: %s", subject)
            return
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    RESEND_API_URL,
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json={"from": self._from_email, "to": [to], "subject": subject, "html": html},
                )
                resp.raise_for_status()
        except Exception:
            logger.exception("Error enviando email a %s", to)
