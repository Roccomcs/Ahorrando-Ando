import asyncio
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self) -> None:
        self._host = os.getenv("SMTP_HOST", "")
        self._port = int(os.getenv("SMTP_PORT", "587"))
        self._user = os.getenv("SMTP_USER", "")
        self._password = os.getenv("SMTP_PASSWORD", "")
        self._from = os.getenv("FROM_EMAIL", self._user)

    def _send_sync(self, to: str, subject: str, html: str) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Ahorrando Ando <{self._from}>"
        msg["To"] = to
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(self._host, self._port, timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(self._user, self._password)
            smtp.sendmail(self._from, [to], msg.as_string())

    async def send(self, to: str, subject: str, html: str) -> None:
        if not self._host or not self._user:
            logger.warning("SMTP no configurado — email no enviado a %s", to)
            return
        try:
            await asyncio.to_thread(self._send_sync, to, subject, html)
        except Exception as exc:
            logger.error("Error enviando email a %s: %s", to, exc)
            raise

    def _log_code_fallback(self, to: str, code: str, kind: str) -> None:
        """Sin SMTP configurado (desarrollo), dejar el código en los logs para
        poder verificar cuentas igual. En producción SMTP debe estar configurado."""
        if not self._host or not self._user:
            logger.warning("SMTP no configurado — código de %s para %s: %s", kind, to, code)

    async def send_password_reset_code(self, to: str, code: str) -> None:
        self._log_code_fallback(to, code, "reset")
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#1a1a2e;margin:0 0 8px">Resetear contraseña</h2>
          <p style="color:#666;margin:0 0 24px">Usá este código para crear una nueva contraseña en Ahorrando Ando.</p>
          <div style="background:#f4f4f8;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
            <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:12px;color:#4f46e5">{code}</span>
          </div>
          <p style="color:#999;font-size:13px">Este código expira en 15 minutos. Si no pediste este cambio, ignorá este email.</p>
        </div>
        """
        await self.send(to, "Resetear contraseña — Ahorrando Ando", html)

    async def send_verification_code(self, to: str, code: str) -> None:
        self._log_code_fallback(to, code, "verificación")
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#1a1a2e;margin:0 0 8px">Tu código de verificación</h2>
          <p style="color:#666;margin:0 0 24px">Ingresá este código en Ahorrando Ando para verificar tu email.</p>
          <div style="background:#f4f4f8;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
            <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:12px;color:#4f46e5">{code}</span>
          </div>
          <p style="color:#999;font-size:13px">Este código expira en 15 minutos. Si no creaste una cuenta, ignorá este email.</p>
        </div>
        """
        await self.send(to, "Tu código de verificación — Ahorrando Ando", html)
