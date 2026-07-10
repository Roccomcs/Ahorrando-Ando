import asyncio
import base64
import logging
import os
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

logger = logging.getLogger(__name__)

_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
# Margen para no usar un access token que vence mientras viaja el request.
_TOKEN_SKEW = 60


class EmailService:
    """Manda mails por la API de Gmail (HTTPS) y, si no está configurada, por SMTP.

    Railway —y varios PaaS— bloquean las conexiones salientes a los puertos de
    SMTP: `smtplib` muere con `[Errno 101] Network is unreachable`. La API de
    Gmail viaja por HTTPS, que nadie bloquea, y además manda desde la casilla de
    verdad, así que no hay que verificar ningún dominio ni pelear con DMARC.

    En desarrollo local SMTP funciona bien y no necesita refresh token, así que
    se conserva como alternativa.
    """

    def __init__(self) -> None:
        # --- Gmail API (producción) ---
        self._gmail_client_id = os.getenv("GMAIL_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID", "")
        self._gmail_client_secret = os.getenv("GMAIL_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET", "")
        self._gmail_refresh_token = os.getenv("GMAIL_REFRESH_TOKEN", "")

        # --- SMTP (desarrollo) ---
        self._host = os.getenv("SMTP_HOST", "")
        self._port = int(os.getenv("SMTP_PORT", "587"))
        self._user = os.getenv("SMTP_USER", "")
        # Google muestra las contraseñas de aplicación en grupos de 4 separados por
        # espacios. smtplib los manda tal cual y el login falla.
        self._password = os.getenv("SMTP_PASSWORD", "").replace(" ", "")

        self._from = os.getenv("FROM_EMAIL", self._user)

        self._access_token = ""
        self._token_expires_at = 0.0

    @property
    def _gmail_ready(self) -> bool:
        return bool(self._gmail_client_id and self._gmail_client_secret and self._gmail_refresh_token)

    @property
    def _smtp_ready(self) -> bool:
        return bool(self._host and self._user)

    def _build_mime(self, to: str, subject: str, html: str) -> MIMEMultipart:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Ahorrando Ando <{self._from}>"
        msg["To"] = to
        msg.attach(MIMEText(html, "html", "utf-8"))
        return msg

    async def _gmail_access_token(self) -> str:
        """Cambia el refresh token por un access token, cacheándolo hasta que vence.

        El refresh token no expira mientras la app siga autorizada; el access
        token dura una hora."""
        if self._access_token and time.monotonic() < self._token_expires_at:
            return self._access_token

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(_GOOGLE_TOKEN_URL, data={
                "client_id": self._gmail_client_id,
                "client_secret": self._gmail_client_secret,
                "refresh_token": self._gmail_refresh_token,
                "grant_type": "refresh_token",
            })
            resp.raise_for_status()
            data = resp.json()

        self._access_token = data["access_token"]
        self._token_expires_at = time.monotonic() + data.get("expires_in", 3600) - _TOKEN_SKEW
        return self._access_token

    async def _send_gmail(self, to: str, subject: str, html: str) -> None:
        token = await self._gmail_access_token()
        # Gmail espera el MIME crudo en base64url.
        raw = base64.urlsafe_b64encode(self._build_mime(to, subject, html).as_bytes()).decode()

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                _GMAIL_SEND_URL,
                headers={"Authorization": f"Bearer {token}"},
                json={"raw": raw},
            )
            if resp.status_code == 401:
                # El access token cacheado quedó inválido (p. ej. se revocó el
                # permiso y se volvió a otorgar). Una sola reintentada.
                self._access_token = ""
                token = await self._gmail_access_token()
                resp = await client.post(
                    _GMAIL_SEND_URL,
                    headers={"Authorization": f"Bearer {token}"},
                    json={"raw": raw},
                )
            resp.raise_for_status()

    def _send_smtp_sync(self, to: str, subject: str, html: str) -> None:
        msg = self._build_mime(to, subject, html)
        with smtplib.SMTP(self._host, self._port, timeout=20) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(self._user, self._password)
            smtp.sendmail(self._from, [to], msg.as_string())

    @property
    def _configured(self) -> bool:
        return self._gmail_ready or self._smtp_ready

    async def send(self, to: str, subject: str, html: str) -> None:
        if not self._configured:
            # En producción esto es una falla, no una nota al pie: nadie puede
            # verificar su cuenta y el warning se pierde entre el ruido.
            log = logger.error if os.getenv("ENV") == "production" else logger.warning
            log("Email sin configurar (ni Gmail API ni SMTP) — no enviado a %s", to)
            return
        try:
            if self._gmail_ready:
                await self._send_gmail(to, subject, html)
            else:
                await asyncio.to_thread(self._send_smtp_sync, to, subject, html)
        except Exception as exc:
            logger.error("Error enviando email a %s: %s", to, exc)
            raise

    def _log_code_fallback(self, to: str, code: str, kind: str) -> None:
        """Sin nada configurado (desarrollo), dejar el código en los logs para
        poder verificar cuentas igual. En producción esto no debería pasar."""
        if not self._configured:
            logger.warning("Email sin configurar — código de %s para %s: %s", kind, to, code)

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
